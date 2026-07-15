from typing import Dict, Optional
from app.models.layout_models import LayoutOverrides, ResolvedLayout, ElementTransform

def resolve_layout(
    legacy_transforms: Optional[Dict[str, Dict[str, float]]],
    overrides: Optional[LayoutOverrides]
) -> ResolvedLayout:
    """
    Normalizes legacy dictionary transforms and new typed layout_overrides
    into a single ResolvedLayout state.
    """
    def parse_legacy(key: str) -> ElementTransform:
        if not legacy_transforms or key not in legacy_transforms:
            return ElementTransform()
        t = legacy_transforms[key]
        x = max(-3600.0, min(3600.0, float(t.get("x", 0.0))))
        y = max(-5400.0, min(5400.0, float(t.get("y", 0.0))))
        scale = max(0.1, min(10.0, float(t.get("scale", 1.0))))
        return ElementTransform(x=x, y=y, scale=scale)

    def clamp_transform(t: Optional[ElementTransform]) -> Optional[ElementTransform]:
        if t is None:
            return None
        return ElementTransform(
            x=max(-3600.0, min(3600.0, float(t.x))),
            y=max(-5400.0, min(5400.0, float(t.y))),
            scale=max(0.1, min(10.0, float(t.scale)))
        )

    if overrides is not None:
        return ResolvedLayout(
            rivers=clamp_transform(overrides.rivers) or parse_legacy("rivers"),
            title_block=clamp_transform(overrides.title_block) or parse_legacy("title_block"),
            legend=clamp_transform(overrides.legend) or parse_legacy("legend"),
            metadata=clamp_transform(overrides.metadata) or parse_legacy("metadata"),
            north_arrow=clamp_transform(overrides.north_arrow) or parse_legacy("north_arrow"),
        )
    
    # Fully fallback to legacy
    return ResolvedLayout(
        rivers=parse_legacy("rivers"),
        title_block=parse_legacy("title_block"),
        legend=parse_legacy("legend"),
        metadata=parse_legacy("metadata"),
        north_arrow=parse_legacy("north_arrow"),
    )
