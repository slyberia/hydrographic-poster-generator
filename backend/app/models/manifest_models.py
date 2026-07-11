from pydantic import BaseModel
from typing import Dict, List, Optional
from datetime import datetime

class ExportManifest(BaseModel):
    """Sidecar metadata document for every export."""
    generated_at: datetime
    geography_id: str
    geography_name: str
    region_code: str
    density_preset: str
    palette: str
    typography: str
    title: str
    subtitle: str
    design_asset_mode: bool
    export_format: str
    export_size: str
    canvas_width: int
    canvas_height: int
    river_count: int
    feature_summary: Dict[str, int]          # display_class -> count
    classification_status: str
    projection: str
    scale_bar_status: str                     # "rendered", "hidden_distortion", "hidden_no_data"
    rules_source: str                         # "database" or "hardcoded"
    rule_versions: Dict[str, int]             # rule_id -> version
    data_sources: Dict[str, str]              # {"rivers": "HydroRIVERS v1.0", "boundaries": "geoBoundaries"}
    output_hash: Optional[str] = None         # SHA-256 of the output file
    
    # Confidence metrics
    repaired_geometry_count: int
    confidence_level: str
    confidence_warnings: List[str]
