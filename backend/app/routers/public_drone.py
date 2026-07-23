"""Public, unauthenticated drone-zoning endpoints (ARC-1).

These expose ONLY the single published run for a study area. They never accept a
run identifier, so a caller cannot select or infer a draft/approved/archived run,
and the payloads are stripped of editable weights, internal notes, and run ids.
The internal, role-protected endpoints live in routers/drone.py.
"""

from fastapi import APIRouter, Depends, HTTPException
import asyncpg

from app.database import get_db_pool
from app.services import drone_publication_service as pub

router = APIRouter()


@router.get("/config", tags=["Drone Public"])
async def public_config(pool: asyncpg.Pool = Depends(get_db_pool)):
    """Study-area presentation config + published-run metadata (public-safe).

    Returns ``published: null`` when nothing is published yet.
    """
    try:
        return await pub.get_public_config(pool)
    except pub.NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/zoning", tags=["Drone Public"])
async def public_zoning(pool: asyncpg.Pool = Depends(get_db_pool)):
    """The published zoning result as a public-safe GeoJSON FeatureCollection."""
    try:
        return await pub.public_zoning_geojson(pool)
    except pub.NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/report/{h3_index}", tags=["Drone Public"])
async def public_report(h3_index: str, pool: asyncpg.Pool = Depends(get_db_pool)):
    """Plain-language guidance for one cell of the published run (public-safe)."""
    try:
        return await pub.public_location_report(pool, h3_index)
    except pub.NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
