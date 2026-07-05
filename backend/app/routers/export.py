from fastapi import APIRouter, Depends, HTTPException, Response
import asyncpg

from app.database import get_db_pool
from app.models.export_models import ExportRequest
from app.services.clipping_service import ClippingService
from app.services.export_service import ExportService

router = APIRouter()

@router.post("/export")
async def generate_export(request: ExportRequest,
                          pool: asyncpg.Pool = Depends(get_db_pool)):
    """Clip, render, and convert the poster to the requested format/size."""
    try:
        clip_result = await ClippingService.clip_rivers(
            pool=pool,
            geography_id=request.geography_id,
            density_preset_id=request.density_preset,
            classification_preset_id=request.classification_preset,
        )
    except ValueError as exc:  # unknown geography or density preset
        raise HTTPException(status_code=404, detail=str(exc))

    try:
        payload, media_type, filename = ExportService.export(clip_result, request)
    except ValueError as exc:  # unknown palette/typography preset
        raise HTTPException(status_code=422, detail=str(exc))

    return Response(
        content=payload,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
