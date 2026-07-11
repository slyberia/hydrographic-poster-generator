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
    bbox_4326: Optional[List[float]] = None      # [min_lon, min_lat, max_lon, max_lat]
    
    # Data confidence fields (Hardening WP-5)
    data_source: str = "HydroRIVERS v1.0 (WWF)"
    boundary_source: str = "geoBoundaries (CC BY 4.0)"
    repaired_geometry_count: int = 0
    coverage_ratio: Optional[float] = None       # river-covered area / boundary area (0.0-1.0)
    confidence_level: str = "standard"            # "high", "standard", "low", "unknown"
    confidence_warnings: List[str] = []           # human-readable warning strings
    
    # Projection flags (Hardening WP-6)
    scale_bar_valid: bool = True
    distortion_warning: Optional[str] = None

class ClipResult(BaseModel):
    type: str = "FeatureCollection"
    features: List[Dict[str, Any]]
    metadata: ClipMetadata
