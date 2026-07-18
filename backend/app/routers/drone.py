from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
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
