from typing import Optional
from pydantic import BaseModel, ConfigDict

class TypographyOverrides(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title_font: Optional[str] = None
    title_weight: Optional[str] = None
    title_tracking: Optional[str] = None
    subtitle_font: Optional[str] = None
    subtitle_weight: Optional[str] = None
    subtitle_tracking: Optional[str] = None

class ResolvedTypography(BaseModel):
    title_font: str
    title_weight: str
    title_tracking: str
    subtitle_font: str
    subtitle_weight: str
    subtitle_tracking: str
