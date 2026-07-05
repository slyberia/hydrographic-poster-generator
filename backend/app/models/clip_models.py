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

class ClipResult(BaseModel):
    type: str = "FeatureCollection"
    features: List[Dict[str, Any]]
    metadata: ClipMetadata
