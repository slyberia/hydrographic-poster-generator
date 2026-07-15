import logging
from typing import Optional

import asyncpg
from fastapi import HTTPException

from app.settings import settings
from app.repository.river_repository import RiverRepository

logger = logging.getLogger(__name__)

class Database:
    def __init__(self):
        self.pool: Optional[asyncpg.Pool] = None

    async def connect(self):
        """Create the connection pool.

        Failure is non-fatal: Cloud Run must be able to start the container
        and serve /health even when the database is unreachable (cold start
        races, paused Supabase project, misconfigured DATABASE_URL).
        get_db_pool retries lazily on the first request that needs the DB.
        """
        try:
            await self._create_pool()
        except Exception as exc:
            logger.warning("Database connection failed at startup: %s", exc)

    async def _create_pool(self):
        logger.info("Connecting to PostgreSQL database...")
        self.pool = await asyncpg.create_pool(
            dsn=settings.database_url,
            min_size=2,
            max_size=10,
            timeout=10,
        )
        logger.info("Database connected.")

    async def disconnect(self):
        if self.pool:
            logger.info("Disconnecting from PostgreSQL database...")
            await self.pool.close()
            self.pool = None
            logger.info("Database disconnected.")

db = Database()

async def get_db_pool() -> asyncpg.Pool:
    """Dependency for FastAPI to get the connection pool."""
    if not db.pool:
        try:
            await db._create_pool()
        except Exception as exc:
            logger.error("Database unavailable: %s", exc)
            raise HTTPException(status_code=503, detail="Database unavailable")
    return db.pool

async def get_repository() -> RiverRepository:
    """Dependency for FastAPI to get the river repository."""
    pool = await get_db_pool()
    return RiverRepository(pool)
