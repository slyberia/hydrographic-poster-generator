from fastapi import APIRouter, Depends, HTTPException, Response, BackgroundTasks
import asyncpg

from app.database import get_repository
from app.repository.river_repository import RiverRepository
from app.models.export_models import ExportRequest
from app.services.clipping_service import ClippingService
from app.services.export_service import ExportService
from app.services.audit_service import AuditService
from app.services.georef_service import build_manifest, generate_native_geotiff, png_bytes
from io import BytesIO
from PIL import Image
from app.repository.georef_repository import GeorefRepository

router = APIRouter()

@router.post("/export")
async def generate_export(request: ExportRequest,
                          background_tasks: BackgroundTasks,
                          repo: RiverRepository = Depends(get_repository)):
    """Clip, render, and convert the poster to the requested format/size."""
    try:
        clip_result = await ClippingService.clip_rivers(repo, request.geography_id, request.density_preset, request.classification_preset)
    except ValueError as exc:  # unknown geography or density preset
        raise HTTPException(status_code=404, detail=str(exc))

    georef_manifest = None
    alignment_qc = None
    try:
        if clip_result.metadata.bbox_3857:
            georef_manifest = build_manifest(clip_result, request)
        if request.export_format == "geotiff":
            payload, alignment_qc = generate_native_geotiff(clip_result, request, georef_manifest)
            if alignment_qc.status == "failed":
                raise ValueError("Native source-network validation failed; check styling and map layout")
            media_type, filename = "image/tiff", f"hydro_poster_native_{request.export_size}.tif"
        else:
            payload, media_type, filename = ExportService.export(clip_result, request)
            if georef_manifest and request.export_format == "png":
                # Trusted renderer output: upload-specific limits must not restrict existing exports.
                with Image.open(BytesIO(payload)) as image:
                    payload = png_bytes(image, georef_manifest)
            elif georef_manifest and request.export_format == "svg":
                from xml.sax.saxutils import escape
                svg = payload.decode("utf-8")
                start = svg.index(">", svg.index("<svg")) + 1
                metadata = '<metadata id="poster-geospatial-manifest">' + escape(georef_manifest.model_dump_json()) + '</metadata>'
                payload = (svg[:start] + metadata + svg[start:]).encode("utf-8")
    except ValueError as exc:  # unknown palette/typography preset
        raise HTTPException(status_code=422, detail=str(exc))

    import hashlib
    import json
    from collections import Counter
    from datetime import datetime, timezone
    from app.services.rules_service import rules_service
    from app.models.manifest_models import ExportManifest
    
    output_hash = hashlib.sha256(payload).hexdigest()
    
    class_counts = Counter(
        f.get("properties", {}).get("display_class", "unknown")
        for f in clip_result.features
    )
    
    size = ExportService.resolve_size(request)
    canvas_w = size.width
    canvas_h = size.height

    manifest = ExportManifest(
        generated_at=datetime.now(timezone.utc),
        geography_id=request.geography_id,
        geography_name=clip_result.metadata.geography_name,
        region_code=clip_result.metadata.region_code,
        density_preset=request.density_preset,
        palette=request.palette or (request.style.preset_id if request.style else "unknown"),
        typography=request.typography,
        title=request.title,
        subtitle=request.subtitle,
        design_asset_mode=request.design_asset_mode,
        export_format=request.export_format,
        export_size=request.export_size,
        canvas_width=canvas_w,
        canvas_height=canvas_h,
        river_count=clip_result.metadata.river_count,
        feature_summary=dict(class_counts),
        classification_status=clip_result.metadata.classification_status,
        projection="EPSG:3857 (Web Mercator)",
        scale_bar_status="valid" if clip_result.metadata.scale_bar_valid else "hidden_distortion",
        rules_source=rules_service.source,
        rule_versions=rules_service.rule_versions,
        data_sources={"rivers": "HydroRIVERS v1.0", "boundaries": "geoBoundaries"},
        output_hash=output_hash,
        repaired_geometry_count=clip_result.metadata.repaired_geometry_count,
        confidence_level=clip_result.metadata.confidence_level,
        confidence_warnings=clip_result.metadata.confidence_warnings
    )

    AuditService.queue_audit_log(background_tasks, repo.pool, manifest)
    if georef_manifest is not None:
        await GeorefRepository(repo.pool).save(georef_manifest, alignment_qc)

    return Response(
        content=payload,
        media_type=media_type,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "X-Export-Manifest": manifest.model_dump_json(),
            "X-Poster-ID": str(georef_manifest.poster_id) if georef_manifest else "",
            "X-Alignment-QC": alignment_qc.model_dump_json() if alignment_qc else "",
        },
    )
