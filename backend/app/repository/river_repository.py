import asyncpg
import logging
from typing import Optional, Any

logger = logging.getLogger(__name__)

class DatabaseUnavailable(Exception):
    pass

class QueryFailure(Exception):
    pass

class RiverRepository:
    def __init__(self, pool: asyncpg.Pool):
        self.pool = pool

    async def get_geography_boundary(self, geography_id: str) -> Optional[asyncpg.Record]:
        query = """
            SELECT name, region_code,
                   ST_XMin(ST_Transform(geom, 3857)) AS bbox_min_x,
                   ST_YMin(ST_Transform(geom, 3857)) AS bbox_min_y,
                   ST_XMax(ST_Transform(geom, 3857)) AS bbox_max_x,
                   ST_YMax(ST_Transform(geom, 3857)) AS bbox_max_y,
                   ST_XMin(geom) AS bbox4326_min_x,
                   ST_YMin(geom) AS bbox4326_min_y,
                   ST_XMax(geom) AS bbox4326_max_x,
                   ST_YMax(geom) AS bbox4326_max_y
            FROM admin_boundaries
            WHERE id = $1;
        """
        try:
            async with self.pool.acquire() as conn:
                return await conn.fetchrow(query, geography_id)
        except asyncpg.PostgresConnectionError as e:
            logger.error(f"Connection error fetching geography {geography_id}: {e}")
            raise DatabaseUnavailable("Database connection is temporarily unavailable.")
        except asyncpg.PostgresError as e:
            logger.error(f"Query error fetching geography {geography_id}: {e}")
            raise QueryFailure(f"Database query failed: {e}")

    async def clip_rivers_to_geojson(self, geography_id: str, min_stream_order: int) -> list[asyncpg.Record]:
        query = """
            SELECT 
                hr.hydrorivers_id,
                hr.stream_order,
                hr.upstream_area,
                hr.length_km,
                ST_AsGeoJSON(ST_Transform(ST_MakeValid(ST_Intersection(ST_MakeValid(hr.geom), geo.geom)), 3857)) as geojson
            FROM hydro_rivers hr
            JOIN (SELECT geom FROM admin_boundaries WHERE id = $1) geo
            ON ST_Intersects(hr.geom, geo.geom)
            WHERE hr.stream_order >= $2
            ORDER BY hr.stream_order DESC;
        """
        try:
            async with self.pool.acquire() as conn:
                return await conn.fetch(query, geography_id, min_stream_order)
        except asyncpg.PostgresConnectionError as e:
            logger.error(f"Connection error clipping rivers for {geography_id}: {e}")
            raise DatabaseUnavailable("Database connection is temporarily unavailable.")
        except asyncpg.PostgresError as e:
            logger.error(f"Query error clipping rivers for {geography_id}: {e}")
            raise QueryFailure(f"Database query failed: {e}")

    async def check_readiness(self) -> bool:
        """Perform startup schema and extension checks."""
        try:
            async with self.pool.acquire() as conn:
                ext = await conn.fetchval("SELECT extname FROM pg_extension WHERE extname = 'postgis'")
                if not ext:
                    logger.error("PostGIS extension is not installed.")
                    return False
                tables = await conn.fetchval("""
                    SELECT COUNT(*) 
                    FROM information_schema.tables 
                    WHERE table_name IN ('admin_boundaries', 'hydro_rivers')
                """)
                if tables < 2:
                    logger.error("Required tables are missing.")
                    return False
                return True
        except Exception as e:
            logger.error(f"Readiness check failed: {e}")
            return False
