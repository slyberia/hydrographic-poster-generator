from typing import Optional
from app.models.preset_models import TypographyPreset
from app.models.typography_models import TypographyOverrides, ResolvedTypography

def resolve_typography(preset: TypographyPreset, overrides: Optional[TypographyOverrides]) -> ResolvedTypography:
    """
    Merges a typography preset with runtime overrides to produce a finalized typography configuration.
    """
    if not overrides:
        return ResolvedTypography(
            title_font=preset.title_font,
            title_weight=preset.title_weight,
            title_tracking=preset.title_tracking,
            subtitle_font=preset.subtitle_font,
            subtitle_weight=preset.subtitle_weight,
            subtitle_tracking=preset.subtitle_tracking,
        )
    
    return ResolvedTypography(
        title_font=overrides.title_font or preset.title_font,
        title_weight=overrides.title_weight or preset.title_weight,
        title_tracking=overrides.title_tracking or preset.title_tracking,
        subtitle_font=overrides.subtitle_font or preset.subtitle_font,
        subtitle_weight=overrides.subtitle_weight or preset.subtitle_weight,
        subtitle_tracking=overrides.subtitle_tracking or preset.subtitle_tracking,
    )
