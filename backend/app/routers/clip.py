from fastapi import APIRouter, Depends, HTTPException
from app.database import get_repository
from app.repository.river_repository import RiverRepository
from app.models.clip_models import ClipRequest, ClipResult
from app.services.clipping_service import ClippingService

router = APIRouter()

@router.post("/clip", response_model=ClipResult)
async def clip_rivers(request: ClipRequest, repo: RiverRepository = Depends(get_repository)):
    """
    Executes a PostGIS spatial clip of the river network against the provided geography ID.
    Applies density filtering and runtime classification.
    """
    try:
        result = await ClippingService.clip_rivers(
            repo=repo,
            geography_id=request.geography_id,
            density_preset_id=request.density_preset,
            classification_preset_id=request.classification_preset
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Clipping failed: {str(e)}")
