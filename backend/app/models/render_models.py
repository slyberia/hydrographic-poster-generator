from typing import Dict, Optional
from pydantic import BaseModel, Field


class RenderRequest(BaseModel):
    geography_id: str
    density_preset: str = "balanced"
    classification_preset: str = "standard"
    palette: str = "abyss"
    typography: str = "gallery_poster"
    title: str = ""
    subtitle: str = ""
    design_asset_mode: bool = False
    show_legend: bool = True
    show_metadata: bool = True
    custom_colors: Optional[Dict[str, str]] = None
    element_transforms: Optional[Dict[str, Dict[str, float]]] = None
