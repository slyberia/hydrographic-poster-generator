"""Viewer-authorized published drone-zoning endpoints.

These expose ONLY the single published run for a study area. They never accept a
run identifier, so a caller cannot select or infer a draft/approved/archived run,
and the payloads are stripped of editable weights, internal notes, and run ids.
Draft and run-scoped analytical endpoints live in routers/drone.py.
"""

import json

from fastapi import APIRouter, Depends, HTTPException, Response
import asyncpg
import httpx

from app.database import get_db_pool
from app.auth import require_viewer
from app.services import drone_publication_service as pub
from app.services import drone_reference_service as reference
from app.services.usage_limits import usage_limit

router = APIRouter(dependencies=[Depends(require_viewer)])


@router.get("/reference-layers/config", tags=["Drone Workspace"], dependencies=[Depends(usage_limit("light"))])
async def public_reference_config(response: Response):
    response.headers["Cache-Control"] = "private, max-age=60, stale-while-revalidate=3600"
    return await reference.get_reference_layer_config()


@router.get("/reference-layers/manifest", tags=["Drone Workspace"], dependencies=[Depends(usage_limit("light"))])
async def reference_manifest(response: Response):
    try:
        payload = await reference.get_reference_manifest()
    except (FileNotFoundError, httpx.HTTPError) as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    response.headers["Cache-Control"] = "private, max-age=60"
    return payload


@router.get("/reference-layers/dataset", tags=["Drone Workspace"], dependencies=[Depends(usage_limit("reference"))])
async def reference_dataset(response: Response):
    try:
        payload = await reference.get_reference_dataset()
    except (FileNotFoundError, httpx.HTTPError) as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    response.headers["Cache-Control"] = "private, max-age=3600"
    return payload


@router.get("/reference-layers/{layer_key}", tags=["Drone Workspace"], dependencies=[Depends(usage_limit("reference"))])
async def public_reference_layer(layer_key: str, response: Response, pool: asyncpg.Pool = Depends(get_db_pool)):
    try:
        payload = await reference.get_reference_layer(pool, layer_key)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Unknown reference layer: {layer_key}")
    response.headers["Cache-Control"] = "private, max-age=3600, stale-while-revalidate=86400"
    return payload


@router.get("/config", tags=["Drone Workspace"], dependencies=[Depends(usage_limit("light"))])
async def public_config(pool: asyncpg.Pool = Depends(get_db_pool)):
    """Study-area presentation config + published-run metadata (viewer-safe).

    Returns ``published: null`` when nothing is published yet.
    """
    try:
        return await pub.get_public_config(pool)
    except pub.NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/zoning", tags=["Drone Workspace"], dependencies=[Depends(usage_limit("layer"))])
async def public_zoning(response: Response, pool: asyncpg.Pool = Depends(get_db_pool)):
    """The published zoning result as a viewer-safe GeoJSON FeatureCollection."""
    try:
        payload = await pub.public_zoning_geojson(pool)
        response.headers["Cache-Control"] = "private, max-age=300, stale-while-revalidate=3600"
        return payload
    except pub.NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/zoning/download", tags=["Drone Workspace"], dependencies=[Depends(usage_limit("layer"))])
async def public_zoning_download(pool: asyncpg.Pool = Depends(get_db_pool)):
    """Download the published zoning layer as a viewer-safe GeoJSON file."""
    try:
        fc = await pub.public_zoning_geojson(pool)
    except pub.NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return Response(
        content=json.dumps(fc, separators=(",", ":")),
        media_type="application/geo+json",
        headers={'Content-Disposition': 'attachment; filename="drone_zoning_published.geojson"'},
    )


@router.get("/artifacts/{artifact_type}", tags=["Drone Workspace"], dependencies=[Depends(usage_limit("layer"))])
async def published_artifact(artifact_type: str, response: Response, pool: asyncpg.Pool = Depends(get_db_pool)):
    try:
        payload = await pub.get_published_artifact(pool, artifact_type)
    except (pub.NotFoundError, httpx.HTTPError) as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    response.headers["Cache-Control"] = "private, max-age=3600"
    return payload


@router.get("/report/{h3_index}", tags=["Drone Workspace"], dependencies=[Depends(usage_limit("cell"))])
async def public_report(h3_index: str, pool: asyncpg.Pool = Depends(get_db_pool)):
    """Plain-language guidance for one cell of the published run (viewer-safe)."""
    try:
        return await pub.public_location_report(pool, h3_index)
    except pub.NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
