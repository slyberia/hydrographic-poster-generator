from typing import Optional
from app.models.metadata_models import MetadataOptions, ResolvedMetadata

def resolve_metadata(
    show_metadata_legacy: bool,
    show_legend_legacy: bool,
    options: Optional[MetadataOptions]
) -> ResolvedMetadata:
    """
    Normalizes legacy boolean flags and the new granular metadata_options
    into a single ResolvedMetadata state.
    
    If `options` is provided, it takes precedence over legacy flags.
    Otherwise, legacy flags control visibility.
    """
    if options is not None:
        return ResolvedMetadata(
            show_title=options.show_title,
            show_subtitle=options.show_subtitle,
            show_legend=options.show_legend,
            show_north_arrow=options.show_north_arrow,
            show_scale_bar=options.show_scale_bar,
            show_data_credits=options.show_data_credits,
        )
    
    # Legacy fallback
    return ResolvedMetadata(
        show_title=show_metadata_legacy,
        show_subtitle=show_metadata_legacy,
        show_legend=show_legend_legacy,
        show_north_arrow=show_metadata_legacy,
        show_scale_bar=show_metadata_legacy,
        show_data_credits=show_metadata_legacy,
    )
