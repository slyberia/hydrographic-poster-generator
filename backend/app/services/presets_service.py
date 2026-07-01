from app.config.density_presets import DENSITY_PRESETS
from app.config.palette_presets import PALETTE_PRESETS
from app.config.typography_presets import TYPOGRAPHY_PRESETS
from app.models.preset_models import DensityPreset, PalettePreset, TypographyPreset, PresetsResponse

def get_all_presets() -> PresetsResponse:
    return PresetsResponse(
        density=[DensityPreset(**v) for v in DENSITY_PRESETS.values()],
        palette=[PalettePreset(**v) for v in PALETTE_PRESETS.values()],
        typography=[TypographyPreset(**v) for v in TYPOGRAPHY_PRESETS.values()]
    )

def get_density_preset(preset_id: str) -> DensityPreset:
    preset = DENSITY_PRESETS.get(preset_id)
    if not preset:
        raise ValueError(f"Density preset '{preset_id}' not found")
    return DensityPreset(**preset)

def get_palette_preset(preset_id: str) -> PalettePreset:
    preset = PALETTE_PRESETS.get(preset_id)
    if not preset:
        raise ValueError(f"Palette preset '{preset_id}' not found")
    return PalettePreset(**preset)

def get_typography_preset(preset_id: str) -> TypographyPreset:
    preset = TYPOGRAPHY_PRESETS.get(preset_id)
    if not preset:
        raise ValueError(f"Typography preset '{preset_id}' not found")
    return TypographyPreset(**preset)
