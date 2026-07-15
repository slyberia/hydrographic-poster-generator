from typing import Dict, Optional, Any
from pydantic import BaseModel, Field, model_validator

from app.models.style_models import StyleSelection
from app.models.metadata_models import MetadataOptions
from app.models.typography_models import TypographyOverrides
from app.models.layout_models import LayoutOverrides

class RenderRequest(BaseModel):
    geography_id: str
    density_preset: str = "balanced"
    classification_preset: str = "standard"
    palette: Optional[str] = None  # Deprecated legacy field
    style: Optional[StyleSelection] = None
    typography: str = "gallery_poster"
    title: str = ""
    subtitle: str = ""
    design_asset_mode: bool = False
    show_legend: bool = True
    show_metadata: bool = True
    custom_colors: Optional[Dict[str, str]] = None  # Deprecated legacy field
    element_transforms: Optional[Dict[str, Dict[str, float]]] = None  # Legacy layout field
    metadata_options: Optional[MetadataOptions] = None
    typography_overrides: Optional[TypographyOverrides] = None
    layout_overrides: Optional[LayoutOverrides] = None

    @model_validator(mode="before")
    @classmethod
    def migrate_legacy_style(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "style" not in data or not data["style"]:
                legacy_palette = data.get("palette", "abyss")
                legacy_custom = data.get("custom_colors", None)
                data["style"] = {
                    "schema_version": 2,
                    "mode": "standard",
                    "preset_id": legacy_palette,
                    "overrides": legacy_custom
                }
        return data
