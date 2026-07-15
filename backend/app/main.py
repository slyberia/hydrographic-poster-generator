from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
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
from app.routers import geographies, clip, presets, preview, export

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

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins_list(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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

from app.routers import admin
app.include_router(admin.router, prefix="/admin", tags=["Admin"])

from app.routers import debug
app.include_router(debug.router, prefix="/debug", tags=["Debug"])

@app.get("/health", tags=["Health"])
async def health_check():
    """Simple health check endpoint."""
    return {"status": "ok"}
