from app.models.preset_models import PresetsResponse
from app.services.rules_service import rules_service

def get_all_presets() -> PresetsResponse:
    return PresetsResponse(
        density=list(rules_service._density.values()),
        palette=list(rules_service._palette.values()),
        typography=list(rules_service._typography.values())
    )

def get_density_preset(preset_id: str):
    return rules_service.get_density_preset(preset_id)

def get_palette_preset(preset_id: str):
    return rules_service.get_palette_preset(preset_id)

def get_typography_preset(preset_id: str):
    return rules_service.get_typography_preset(preset_id)
