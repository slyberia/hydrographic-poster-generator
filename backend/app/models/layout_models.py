from typing import Optional
from pydantic import BaseModel, ConfigDict

class ElementTransform(BaseModel):
    model_config = ConfigDict(extra="forbid")
    
    x: float = 0.0
    y: float = 0.0
    scale: float = 1.0

class LayoutOverrides(BaseModel):
    model_config = ConfigDict(extra="forbid")
    
    rivers: Optional[ElementTransform] = None
    title_block: Optional[ElementTransform] = None
    legend: Optional[ElementTransform] = None
    metadata: Optional[ElementTransform] = None
    north_arrow: Optional[ElementTransform] = None

class ResolvedLayout(BaseModel):
    rivers: ElementTransform
    title_block: ElementTransform
    legend: ElementTransform
    metadata: ElementTransform
    north_arrow: ElementTransform
