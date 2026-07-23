from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
import logging

from app.settings import settings
from app.database import db
from app.repository.river_repository import RiverRepository, DatabaseUnavailable, QueryFailure
from app.exceptions import (
    validation_exception_handler,
    database_unavailable_handler,
    query_failure_handler,
    value_error_handler,
    global_exception_handler
)

logger = logging.getLogger(__name__)

# To be imported as we build them:
from app.routers import geographies, clip, presets, preview, export, drone, public_drone

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await db.connect()
    if db.pool:
        repo = RiverRepository(db.pool)
        is_ready = await repo.check_readiness()
        if not is_ready:
            logger.warning("Database schema check failed. Application may not function correctly.")
    
    from app.services.rules_service import rules_service
    await rules_service.load(db.pool)
    yield
    # Shutdown
    await db.disconnect()

app = FastAPI(
    title="Hydrographic Poster Generator API",
    description="Spatial API for river clipping and cartographic map generation",
    version="1.0.0",
    lifespan=lifespan
)

# Compress large JSON/text responses. The drone GeoJSON payload (~5 MB of
# ~19.5k polygons) compresses to a few hundred KB, cutting transfer + the
# client's perceived run-load time. minimum_size skips tiny responses.
app.add_middleware(GZipMiddleware, minimum_size=1024)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins_list(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    # allow_headers governs REQUEST headers; browsers can only READ response
    # headers listed here cross-origin. Without this the frontend (a different
    # Cloud Run domain) cannot read the export filename or the poster manifest.
    expose_headers=[
        "Content-Disposition",   # export download filename (drone + poster)
        "X-River-Count",         # poster QA signal
        "X-Geography-Name",      # poster metadata
        "X-Export-Manifest",     # poster export sidecar
        "X-Feature-Summary",     # poster feature manifest
    ],
)

# Exception Handlers
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(DatabaseUnavailable, database_unavailable_handler)
app.add_exception_handler(QueryFailure, query_failure_handler)
app.add_exception_handler(ValueError, value_error_handler)
app.add_exception_handler(Exception, global_exception_handler)

# Register routers
app.include_router(geographies.router, prefix="/geographies", tags=["Geographies"])
app.include_router(presets.router, prefix="/presets", tags=["Presets"])
app.include_router(clip.router, tags=["Spatial Processing"])
app.include_router(preview.router, tags=["Render Pipeline"])
app.include_router(export.router, tags=["Export Pipeline"])
app.include_router(drone.router, tags=["Drone Zoning"])
app.include_router(public_drone.router, prefix="/public/drone", tags=["Drone Public"])

from app.routers import admin
app.include_router(admin.router, prefix="/admin", tags=["Admin"])

# Debug endpoints run unauthenticated, synchronous, CPU-bound work (three
# clip+render passes per call), so they are opt-in and must stay off in
# production (audit finding D2).
import os
if os.getenv("ENABLE_DEBUG_ENDPOINTS", "").lower() in ("1", "true", "yes"):
    from app.routers import debug
    app.include_router(debug.router, prefix="/debug", tags=["Debug"])

@app.get("/health", tags=["Health"])
async def health_check():
    """Simple health check endpoint."""
    return {"status": "ok"}
