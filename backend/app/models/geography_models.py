from pydantic import BaseModel
from typing import List, Optional

class GeographyDetail(BaseModel):
    id: str
    name: str
    country: str
    country_code: str
    admin_level: int
    parent_id: Optional[str] = None
    region_code: str
    bbox: Optional[List[float]] = None  # [min_lon, min_lat, max_lon, max_lat]

class GeographyCountry(BaseModel):
    country_code: str
    name: str
    admin_0_id: Optional[str] = None

class GeographyRegion(BaseModel):
    region_code: str
    name: str
    countries: List[GeographyCountry]

class GeographyListResponse(BaseModel):
    regions: List[GeographyRegion]
