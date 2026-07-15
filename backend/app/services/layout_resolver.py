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
        return ElementTransform(
            x=t.get("x", 0.0),
            y=t.get("y", 0.0),
            scale=t.get("scale", 1.0)
        )

    if overrides is not None:
        return ResolvedLayout(
            rivers=overrides.rivers or parse_legacy("rivers"),
            title_block=overrides.title_block or parse_legacy("title_block"),
            legend=overrides.legend or parse_legacy("legend"),
            metadata=overrides.metadata or parse_legacy("metadata"),
            north_arrow=overrides.north_arrow or parse_legacy("north_arrow"),
        )
    
    # Fully fallback to legacy
    return ResolvedLayout(
        rivers=parse_legacy("rivers"),
        title_block=parse_legacy("title_block"),
        legend=parse_legacy("legend"),
        metadata=parse_legacy("metadata"),
        north_arrow=parse_legacy("north_arrow"),
    )
