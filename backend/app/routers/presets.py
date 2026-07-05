from fastapi import APIRouter
from app.models.preset_models import PresetsResponse
from app.services.presets_service import get_all_presets

router = APIRouter()

@router.get("", response_model=PresetsResponse)
async def list_presets():
    """
    Returns all available density, palette, and typography presets.
    """
    return get_all_presets()
