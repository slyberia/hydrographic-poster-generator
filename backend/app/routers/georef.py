"""Bounded stateless raster processing with durable metadata only."""

import asyncio
import base64
import json
import math
from uuid import UUID
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, Query
from starlette.concurrency import run_in_threadpool
from app.database import get_repository
from app.models.export_models import ExportRequest
from app.models.georef_models import PosterGeospatialManifest, RecoveryOptions
from app.repository.georef_repository import GeorefRepository
from app.services.clipping_service import ClippingService
from app.services.georef_service import (
    MAX_UPLOAD_BYTES,
    build_manifest,
    decode_image,
    native_result,
    viewer_image,
)
from app.services.georef_recovery import recover_result

router = APIRouter(prefix="/georef", tags=["Georeferencing"])
processing_slots = asyncio.Semaphore(2)


async def processing_slot():
    # Bound decode, canonical render, registration and response allocation together.
    # Do not queue an unbounded collection of decoded images in server memory.
    if processing_slots.locked():
        raise HTTPException(429, "Georeferencing is busy. Please retry shortly.")
    async with processing_slots:
        yield


async def ready_repository(repo=Depends(get_repository)):
    if not await GeorefRepository(repo.pool).check_readiness():
        raise HTTPException(
            503,
            "Georeferencing schema unavailable; apply migration 015 before processing posters",
        )
    return repo


@router.get("/readiness")
async def readiness(repo=Depends(ready_repository)):
    return {"status": "ready", "manifest_schema_version": 2}


def encoded_result(payload, qc, preview, manifest, gcps=()):
    display, placement = viewer_image(payload)
    return {
        "viewer": {**placement, "png_base64": base64.b64encode(display).decode()},
        "manifest": manifest.model_dump(mode="json"),
        "qc": qc.model_dump(mode="json"),
        "gcps": [g.model_dump(mode="json") for g in gcps],
        "geotiff_base64": base64.b64encode(payload).decode(),
        "preview_base64": base64.b64encode(preview).decode(),
        "filename": f"hydro_{qc.mode}_{qc.run_id}.tif",
    }


@router.get("/manifests/{poster_id}")
async def get_manifest(poster_id: UUID, repo=Depends(get_repository)):
    result = await GeorefRepository(repo.pool).get_manifest(poster_id)
    if result is None:
        raise HTTPException(
            404, "Poster ID not found; provide metadata or select the source geography"
        )
    return result


@router.get("/manifests/{poster_id}/rivers", dependencies=[Depends(processing_slot)])
async def inspect_rivers(poster_id: UUID, bbox: str = Query(max_length=150), repo=Depends(ready_repository)):
    from app.services.georef_inspection import inspect_features
    try:
        bounds = [float(v) for v in bbox.split(",")]
        if (len(bounds) != 4 or not all(math.isfinite(v) for v in bounds)
            or not -180 <= bounds[0] < bounds[2] <= 180
            or not -85 <= bounds[1] < bounds[3] <= 85):
            raise ValueError()
    except ValueError:
        raise HTTPException(422, "Use west,south,east,north bounds without crossing the dateline")
    manifest = await GeorefRepository(repo.pool).get_manifest(poster_id)
    if manifest is None:
        raise HTTPException(404, "Poster manifest not found")
    request = ExportRequest.model_validate(manifest.render_settings)
    clip = await ClippingService.clip_rivers(repo, request.geography_id,
        request.density_preset, request.classification_preset)
    current = build_manifest(clip, request)
    if current.hydro_rivers_reference["feature_ids_sha256"] != manifest.hydro_rivers_reference.get("feature_ids_sha256"):
        raise HTTPException(409, "Source record selection changed since generation; generate a new result before inspection")
    return await run_in_threadpool(inspect_features, clip, bounds)


@router.post("/native", dependencies=[Depends(processing_slot)])
async def native(request: ExportRequest, repo=Depends(ready_repository)):
    clip = await ClippingService.clip_rivers(
        repo,
        request.geography_id,
        request.density_preset,
        request.classification_preset,
    )
    manifest = build_manifest(clip, request)
    payload, qc, preview = await run_in_threadpool(
        native_result, clip, request, manifest
    )
    if qc.status == "failed":
        raise HTTPException(
            422,
            "Native map has no validated visible river network. Check source, styling and layout.",
        )
    await GeorefRepository(repo.pool).save(manifest, qc)
    return await run_in_threadpool(encoded_result, payload, qc, preview, manifest)


@router.post("/recover", dependencies=[Depends(processing_slot)])
async def recover(
    image: UploadFile = File(...),
    options: str = Form("{}"),
    repo=Depends(ready_repository),
):
    try:
        if len(options) > 65536:
            raise ValueError("Recovery options exceed 64 KB")
        opts = RecoveryOptions.model_validate_json(options)
        payload = await image.read(MAX_UPLOAD_BYTES + 1)
        raster, embedded = decode_image(payload)
        stored = GeorefRepository(repo.pool)
        manifest = opts.manifest
        if manifest is None and embedded:
            if len(embedded) > 65536:
                raise ValueError("Embedded metadata exceeds 64 KB")
            manifest = PosterGeospatialManifest.model_validate_json(embedded)
        if opts.poster_id:
            if manifest and manifest.poster_id != opts.poster_id:
                raise ValueError(
                    "Poster ID conflicts with embedded or supplied metadata"
                )
            manifest = await stored.get_manifest(opts.poster_id)
            if manifest is None:
                raise ValueError("Poster ID not found")
        if manifest:
            if opts.geography_id and opts.geography_id != manifest.source.get(
                "geography_id"
            ):
                raise ValueError("Selected source conflicts with poster metadata")
            request = ExportRequest.model_validate(manifest.render_settings)
            if request.geography_id != manifest.source.get("geography_id"):
                raise ValueError("Manifest source does not match its render settings")
        else:
            if not opts.geography_id:
                raise ValueError(
                    "No poster metadata detected. Select the source geography or provide a poster ID."
                )
            request = ExportRequest.model_validate(
                {
                    **opts.render_settings,
                    "geography_id": opts.geography_id,
                    "density_preset": opts.density_preset,
                    "classification_preset": opts.classification_preset,
                }
            )
        clip = await ClippingService.clip_rivers(
            repo,
            request.geography_id,
            request.density_preset,
            request.classification_preset,
        )
        canonical = build_manifest(
            clip, request, poster_id=manifest.poster_id if manifest else None
        )
        if manifest:
            if canonical.hydro_rivers_reference[
                "feature_ids_sha256"
            ] != manifest.hydro_rivers_reference.get("feature_ids_sha256"):
                raise ValueError(
                    "Source features have changed since this poster was generated; select its source manually for review"
                )
            if (
                canonical.geographic_to_pixel != manifest.geographic_to_pixel
                or canonical.map_frame != manifest.map_frame
            ):
                raise ValueError(
                    "Manifest render transform does not match the current source and renderer"
                )
        else:
            manifest = canonical
        result = await run_in_threadpool(recover_result, raster, clip, manifest, opts)
        geotiff, qc, gcps, preview = result
        await stored.save(manifest, qc, gcps)
        return await run_in_threadpool(encoded_result, geotiff, qc, preview, manifest, gcps)
    except (ValueError, json.JSONDecodeError) as exc:
        raise HTTPException(422, str(exc)) from exc
    finally:
        await image.close()
