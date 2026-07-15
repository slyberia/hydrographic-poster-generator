from pydantic import BaseModel
from typing import Dict, List

class DensityPreset(BaseModel):
    id: str
    name: str
    min_stream_order: int
    description: str
    classification_map: Dict[int, str]

class PaletteTokens(BaseModel):
    background: str
    feature_major: str
    feature_primary: str
    feature_secondary: str
    feature_minor: str
    feature_headwater: str
    text_primary: str
    text_secondary: str

class PalettePreset(BaseModel):
    id: str
    name: str
    type: str # "dark" or "light"
    tokens: PaletteTokens

class TypographyPreset(BaseModel):
    id: str
    name: str
    title_font: str
    title_weight: str
    title_tracking: str
    subtitle_font: str
    subtitle_weight: str
    subtitle_tracking: str

class FlagPreset(BaseModel):
    id: str
    name: str
    variants: Dict[str, PaletteTokens]

class PresetsResponse(BaseModel):
    density: List[DensityPreset]
    palette: List[PalettePreset]
    typography: List[TypographyPreset]
    flags: List[FlagPreset]
