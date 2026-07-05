from pydantic import BaseModel
from typing import Any, Dict, List, Optional

class ClipRequest(BaseModel):
    geography_id: str
    density_preset: str
    classification_preset: str

class ClipMetadata(BaseModel):
    geography_name: str
    region_code: str
    river_count: int
    classification_status: str
    # Boundary polygon extent in EPSG:3857 meters: [min_x, min_y, max_x, max_y].
    # Derived from the admin boundary, not the rivers, so the map frame is
    # stable across density presets (docs/PROJECTION_SCALEBAR_NOTES.md §3.1).
    bbox_3857: Optional[List[float]] = None

class ClipResult(BaseModel):
    type: str = "FeatureCollection"
    features: List[Dict[str, Any]]
    metadata: ClipMetadata
