from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.settings import settings
from app.database import db

# To be imported as we build them:
from app.routers import geographies, clip, presets, preview, export

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await db.connect()
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

# Register routers
app.include_router(geographies.router, prefix="/geographies", tags=["Geographies"])
app.include_router(presets.router, prefix="/presets", tags=["Presets"])
app.include_router(clip.router, tags=["Spatial Processing"])
app.include_router(preview.router, tags=["Render Pipeline"])
app.include_router(export.router, tags=["Export Pipeline"])

@app.get("/health", tags=["Health"])
async def health_check():
    """Simple health check endpoint."""
    return {"status": "ok"}
