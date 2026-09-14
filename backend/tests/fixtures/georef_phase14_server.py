"""Local synthetic integration harness: real export/recovery, in-memory metadata."""
import sys
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

ROOT = Path(__file__).resolve().parents[3]
sys.path[:0] = [str(ROOT / "backend"), str(ROOT / "backend/tests")]
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import get_repository
from app.routers import export, georef
from app.services.georef_upload import GeorefUploadGuard
from app.services.rules_service import rules_service
from test_georef_pipeline import network, request

rules_service._load_from_hardcoded()
manifests = {}
async def save(self, manifest, *args):
    manifests.setdefault(str(manifest.poster_id), manifest)
async def get_manifest(self, poster_id):
    return manifests.get(str(poster_id))
patch("app.repository.georef_repository.GeorefRepository.save", save).start()
patch("app.repository.georef_repository.GeorefRepository.get_manifest", get_manifest).start()
patch("app.repository.georef_repository.GeorefRepository.check_readiness", AsyncMock(return_value=True)).start()
patch("app.services.clipping_service.ClippingService.clip_rivers", AsyncMock(return_value=network())).start()
patch("app.services.audit_service.AuditService.queue_audit_log").start()
app = FastAPI()
app.add_middleware(GeorefUploadGuard)
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000"], allow_methods=["*"], allow_headers=["*"],
                   expose_headers=["X-Poster-ID", "X-Studio-Provenance", "Content-Disposition"])
app.dependency_overrides[get_repository] = lambda: MagicMock()
app.include_router(export.router)
app.include_router(georef.router)
@app.get("/fixture")
def fixture():
    return request().model_dump(mode="json")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
