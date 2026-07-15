from fastapi import APIRouter, Depends, HTTPException, Response
import asyncpg

from app.database import get_repository
from app.repository.river_repository import RiverRepository
from app.models.render_models import RenderRequest
from app.services.clipping_service import ClippingService
from app.services.svg_renderer import SVGRenderer

router = APIRouter()

@router.post("/preview")
async def generate_preview(request: RenderRequest,
                           repo: RiverRepository = Depends(get_repository)):
    """Clip rivers to the selected geography and render the poster SVG."""
    try:
        renderer = SVGRenderer(request, canvas=(2400, 3600))
    except ValueError as exc:  # unknown palette/typography preset
        raise HTTPException(status_code=422, detail=str(exc))

    try:
        clip_result = await ClippingService.clip_rivers(
            repo=repo,
            geography_id=request.geography_id,
            density_preset_id=request.density_preset,
            classification_preset_id=request.classification_preset,
        )
    except ValueError as exc:  # unknown geography or density preset
        raise HTTPException(status_code=404, detail=str(exc))

    svg = renderer.generate_svg(clip_result)
    
    import json
    from collections import Counter
    class_counts = Counter(
        f.get("properties", {}).get("display_class", "unknown")
        for f in clip_result.features
    )
    
    return Response(
        content=svg,
        media_type="image/svg+xml",
        headers={
            "X-River-Count": str(clip_result.metadata.river_count),
            "X-Geography-Name": clip_result.metadata.geography_name,
            "X-Feature-Summary": json.dumps(dict(class_counts)),
        },
    )
