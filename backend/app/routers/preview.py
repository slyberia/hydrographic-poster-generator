from fastapi import APIRouter, HTTPException
from typing import Any, Dict

router = APIRouter()

@router.post("/preview")
async def generate_preview(request_body: Dict[str, Any]):
    """
    STUB: This endpoint will eventually take the GeoJSON from the /clip endpoint
    and render it into an SVG for the frontend to preview.
    Implemented in Phase 4.
    """
    raise HTTPException(status_code=501, detail="Preview rendering not yet implemented (Phase 4)")
