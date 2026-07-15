from typing import Dict, Literal, Optional
from pydantic import BaseModel

class StyleSelection(BaseModel):
    schema_version: int = 2
    mode: Literal["standard", "flag"] = "standard"
    preset_id: str = "abyss"
    variant: Optional[Literal["light", "dark"]] = None
    overrides: Optional[Dict[str, str]] = None

class ResolvedStyle(BaseModel):
    source: StyleSelection
    tokens: Dict[str, str]
