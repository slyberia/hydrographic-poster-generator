from typing import Optional, Dict, Any, List, Literal
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Response
import asyncpg

from app.database import get_db_pool
from app.services import drone_service
from pydantic import BaseModel, Field

router = APIRouter()

class RunCreateRequest(BaseModel):
    label: str
    weight_overrides: Optional[Dict[str, float]] = None

class WeightUpdateRequest(BaseModel):
    weight: float


class BBox(BaseModel):
    west: float = Field(..., ge=-180, le=180)
    south: float = Field(..., ge=-90, le=90)
    east: float = Field(..., ge=-180, le=180)
    north: float = Field(..., ge=-90, le=90)


class ExportViewRequest(BaseModel):
    """Render the zoning map for an arbitrary map viewport (Option B).

    The bbox is the whole contract — full region is bbox = region extent, a
    neighbourhood is bbox = that neighbourhood, same code path. `zoom` is the
    frontend's current basemap zoom (clamped server-side to bound tile fetches).
    """
    bbox: BBox
    zoom: int = Field(11, ge=1, le=18, description="Frontend basemap zoom")
    format: Literal["png", "svg", "pdf"] = "png"
    scale: float = Field(2.0, ge=1.0, le=4.0,
        description="Output resolution multiplier over native tile pixels")
    display_mode: Literal["zones", "volatility"] = "zones"
    sweep_id: Optional[str] = Field(None, description="Required when display_mode='volatility'")
    hidden_zones: Optional[List[str]] = None
    show_boundary: bool = Field(False, description="Overlay the Region-4 study-area outline")


# ---- Sensitivity models ----

class SensitivityTriggerRequest(BaseModel):
    delta: float = Field(0.10, ge=0.01, le=0.50,
        description="Fractional perturbation (e.g. 0.10 = ±10%)")
    label: Optional[str] = None

class SensitivityFactorRank(BaseModel):
    factor_key: str
    direction: Literal["up", "down"]
    mean_absolute_deviation: float
    zone_flips: int

class SensitivitySummary(BaseModel):
    avg_stddev: float
    max_stddev: float
    total_zone_flips: int
    pct_cells_flipped: float
    factor_rankings: List[SensitivityFactorRank]

class SensitivityStatus(BaseModel):
    sweep_id: str
    status: Literal["running", "complete", "failed"]
    total_runs: int
    completed_runs: int
    failed_runs: int
    partial_results: bool
    summary: Optional[SensitivitySummary] = None

class VolatilityRecord(BaseModel):
    h3_index: str
    stddev: float
    variance: float
    zone_flips: int
    volatility_category: Literal["LOW", "MEDIUM", "HIGH"]
    baseline_zone: str
    baseline_score: Optional[float]


# ---- Config / Factors ----

@router.get("/config/factors", tags=["Drone Config"])
async def get_factors(pool: asyncpg.Pool = Depends(get_db_pool)):
    """Retrieve drone zoning factors and normalized weights."""
    return await drone_service.get_factors(pool)


@router.patch("/config/factors/{key}", tags=["Drone Config"])
async def patch_factor(
    key: str,
    body: WeightUpdateRequest,
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Update raw factor weight and return updated factors."""
    try:
        return await drone_service.patch_factor(pool, key, body.weight)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


# ---- Runs ----

@router.get("/runs", tags=["Drone Runs"])
async def list_runs(pool: asyncpg.Pool = Depends(get_db_pool)):
    """List all recorded model runs."""
    return await drone_service.list_runs(pool)


@router.post("/runs", tags=["Drone Runs"])
async def create_and_execute_run(
    body: RunCreateRequest,
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Create and immediately execute a model run for Region 4 (pilot study)."""
    region_key = "guyana_region_4"
    try:
        # Create pending run
        run_id = await drone_service.create_run(
            pool=pool,
            region_key=region_key,
            label=body.label,
            weight_overrides=body.weight_overrides
        )
        
        # Execute run (completes in ~5-10s synchronously, suitable for pilot run size)
        stats = await drone_service.execute_run(pool, run_id)
        return stats
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/runs/{run_id}", tags=["Drone Runs"])
async def get_run_details(run_id: str, pool: asyncpg.Pool = Depends(get_db_pool)):
    """Retrieve details and aggregated statistics for a specific run."""
    details = await drone_service.get_run_details(pool, run_id)
    if not details:
        raise HTTPException(status_code=404, detail=f"Run {run_id} not found")
    return details


@router.delete("/runs/{run_id}", status_code=204, tags=["Drone Runs"])
async def delete_run(run_id: str, pool: asyncpg.Pool = Depends(get_db_pool)):
    """Delete a run and everything derived from it (sweep children, volatility,
    summary, cell results). Returns 204 on success, 404 if the run is unknown."""
    deleted = await drone_service.delete_run(pool, run_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Run {run_id} not found")
    return Response(status_code=204)


@router.get("/runs/{run_id}/geojson", tags=["Drone Runs"])
async def get_run_geojson(
    run_id: str,
    zone: Optional[str] = None,
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Get the model run results as a GeoJSON FeatureCollection."""
    try:
        return await drone_service.results_geojson(pool, run_id, zone)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/runs/{run_id}/export", tags=["Drone Runs"])
async def export_view(
    run_id: str,
    body: ExportViewRequest,
    pool: asyncpg.Pool = Depends(get_db_pool),
):
    """Render the zoning map for the given viewport (bbox + zoom) to PNG/SVG/PDF.

    Basemap tiles match the frontend (CARTO light_all) and attribution is baked
    into the image. Cells are filtered to the bbox, so a sub-area render never
    pulls the whole grid.
    """
    from app.services import drone_export_service as export_svc

    vp = export_svc.Viewport(
        west=body.bbox.west, south=body.bbox.south,
        east=body.bbox.east, north=body.bbox.north,
    )
    try:
        payload, media_type, filename = await export_svc.render_export(
            pool,
            run_id,
            vp,
            requested_zoom=body.zoom,
            fmt=body.format,
            scale=body.scale,
            display_mode=body.display_mode,
            sweep_id=body.sweep_id,
            hidden_zones=set(body.hidden_zones) if body.hidden_zones else None,
            show_boundary=body.show_boundary,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    return Response(
        content=payload,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ---- Sensitivity ----

@router.post("/runs/{run_id}/sensitivity", tags=["Drone Sensitivity"],
             status_code=202, response_model=SensitivityStatus)
async def trigger_sensitivity(
    run_id: str,
    body: SensitivityTriggerRequest,
    pool: asyncpg.Pool = Depends(get_db_pool),
):
    """Trigger OAT weight perturbation sweep. Idempotent: returns existing active sweep."""
    try:
        return await drone_service.trigger_sensitivity_analysis(
            pool, run_id, delta=body.delta, label=body.label,
        )
    except ValueError as exc:
        code = 404 if "not found" in str(exc) else 400
        raise HTTPException(status_code=code, detail=str(exc))


@router.get("/runs/{run_id}/sensitivity/{sweep_id}", tags=["Drone Sensitivity"],
            response_model=SensitivityStatus)
async def get_sensitivity_status(
    run_id: str,
    sweep_id: str,
    pool: asyncpg.Pool = Depends(get_db_pool),
):
    """Poll sweep progress and factor rankings (partial results OK)."""
    try:
        return await drone_service.get_sensitivity_status(pool, run_id, sweep_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/runs/{run_id}/sensitivity/{sweep_id}/volatility", tags=["Drone Sensitivity"],
            response_model=List[VolatilityRecord])
async def get_volatility(
    run_id: str,
    sweep_id: str,
    pool: asyncpg.Pool = Depends(get_db_pool),
):
    """Per-cell volatility (thin payload, no geometry). Partial sweeps return partial data."""
    try:
        return await drone_service.get_volatility_data(pool, run_id, sweep_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/runs/{run_id}/report/{h3_index}", tags=["Drone Runs"])
async def get_location_report(
    run_id: str,
    h3_index: str,
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Generate a detailed click-based location report for a specific cell."""
    report = await drone_service.location_report(pool, run_id, h3_index)
    if not report:
        raise HTTPException(
            status_code=404,
            detail=f"Report not found for run {run_id} and cell {h3_index}"
        )
    return report
