import asyncpg
from typing import Optional
from app.settings import settings

class Database:
    def __init__(self):
        self.pool: Optional[asyncpg.Pool] = None

    async def connect(self):
        print("Connecting to PostgreSQL database...")
        self.pool = await asyncpg.create_pool(
            dsn=settings.database_url,
            min_size=2,
            max_size=10
        )
        print("Database connected.")

    async def disconnect(self):
        if self.pool:
            print("Disconnecting from PostgreSQL database...")
            await self.pool.close()
            print("Database disconnected.")

db = Database()

async def get_db_pool() -> asyncpg.Pool:
    """Dependency for FastAPI to get the connection pool."""
    if not db.pool:
        raise Exception("Database pool not initialized")
    return db.pool
