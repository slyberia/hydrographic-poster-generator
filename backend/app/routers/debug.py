from fastapi import APIRouter, Depends
import asyncpg
from typing import Dict, Any

from app.database import get_repository
from app.repository.river_repository import RiverRepository
from app.models.render_models import RenderRequest
from app.services.clipping_service import ClippingService
from app.services.svg_renderer import SVGRenderer
from app.services.rules_service import rules_service

router = APIRouter()

@router.post("/sensitivity")
async def debug_sensitivity(
    request: RenderRequest,
    repo: RiverRepository = Depends(get_repository)
) -> Dict[str, Any]:
    """
    Sensitivity sweep endpoint: renders the requested geography with three different
    stream order minimums (base, base + 1, base - 1) to test density sensitivity.
    """
    geography_id = request.geography_id
    density_preset_id = request.density_preset
    
    # Base density
    base_density = rules_service.get_density_preset(density_preset_id)
    base_order = base_density.min_stream_order
    
    orders = {
        "base": base_order,
        "minus_1": base_order + 1,           # fewer rivers
        "plus_1": max(1, base_order - 1)     # more rivers
    }
    
    results = {"metadata": {}}
    
    for variant, order in orders.items():
        # Create a mock preset request using the base preset but overriding the min_order
        # Since ClippingService reads from rules_service, we'll patch it for this request or
        # refactor ClippingService slightly to accept min_order override.
        # Wait, the easiest way without modifying ClippingService signature again:
        # We can temporarily patch the cache, or we can just run the query directly here.
        # But ClippingService.clip_rivers is better.
        # Let's temporarily add a density preset to rules_service.
        temp_id = f"temp_debug_{variant}"
        temp_density = base_density.model_copy(update={"id": temp_id, "min_stream_order": order})
        # Add to mapping if lower order might need new class_map entries
        class_map = dict(temp_density.classification_map)
        if order not in class_map:
            class_map[order] = "headwater"
        temp_density.classification_map = class_map
        
        rules_service._density[temp_id] = temp_density
        
        clip_result = await ClippingService.clip_rivers(
            repo=repo,
            geography_id=geography_id,
            density_preset_id=temp_id,
            classification_preset_id=request.classification_preset
        )
        
        # Render SVG
        renderer = SVGRenderer(request, canvas=(1000, 1000))
        svg_content = renderer.generate_svg(clip_result)
        
        results[variant] = svg_content
        results["metadata"][f"{variant}_river_count"] = clip_result.metadata.river_count
        
        # Cleanup temp preset
        del rules_service._density[temp_id]
        
    return results
