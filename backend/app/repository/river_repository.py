import asyncpg
import logging
from typing import Optional, Any

from app.services.spatial_cache import clip_cache, boundary_cache

logger = logging.getLogger(__name__)

# Raised above the default so the clip query's sort/detoast work stays in
# memory instead of spilling temp files (temp I/O counts against the Supabase
# disk-I/O budget). SET LOCAL keeps it scoped to the one transaction, which is
# also safe behind PgBouncer transaction pooling.
CLIP_WORK_MEM = "64MB"

# Clips against pre-subdivided boundary tiles (admin_boundaries_subdivided,
# migration 007) instead of one whole-country multipolygon: the GIST probe,
# ST_CoveredBy, and ST_Intersection all run against small geometries, which
# avoids repeated detoasting of a huge polygon. Rivers fully inside a tile
# skip ST_Intersection entirely. Per-tile pieces are re-merged with ST_Union;
# ST_CollectionExtract(..., 2) keeps only linework, dropping point artifacts
# where a river touches a tile only at its edge. Geometries are repaired once
# at rest by migration 007, so no per-row ST_MakeValid here.
_CLIP_SUBDIVIDED_SQL = """
    SELECT
        hr.hydrorivers_id,
        hr.stream_order,
        hr.upstream_area,
        hr.length_km,
        ST_AsGeoJSON(ST_Transform(ST_CollectionExtract(ST_Union(
            CASE WHEN ST_CoveredBy(hr.geom, s.geom) THEN hr.geom
                 ELSE ST_Intersection(hr.geom, s.geom)
            END
        ), 2), 3857)) AS geojson
    FROM hydro_rivers hr
    JOIN admin_boundaries_subdivided s
      ON s.boundary_id = $1
     AND ST_Intersects(hr.geom, s.geom)
    WHERE hr.stream_order >= $2
    GROUP BY hr.id, hr.hydrorivers_id, hr.stream_order, hr.upstream_area, hr.length_km
    ORDER BY hr.stream_order DESC;
"""

# Pre-007 fallback, used only when the subdivided table is missing or not yet
# populated for the requested boundary. Keeps ST_MakeValid because on this
# path the at-rest geometry repair from migration 007 has not run either.
_CLIP_LEGACY_SQL = """
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

class DatabaseUnavailable(Exception):
    pass

class QueryFailure(Exception):
    pass

class RiverRepository:
    def __init__(self, pool: asyncpg.Pool):
        self.pool = pool

    async def get_geography_boundary(self, geography_id: str) -> Optional[asyncpg.Record]:
        cached = boundary_cache.get(geography_id)
        if cached is not None:
            return cached
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
                row = await conn.fetchrow(query, geography_id)
        except asyncpg.PostgresConnectionError as e:
            logger.error(f"Connection error fetching geography {geography_id}: {e}")
            raise DatabaseUnavailable("Database connection is temporarily unavailable.")
        except asyncpg.PostgresError as e:
            logger.error(f"Query error fetching geography {geography_id}: {e}")
            raise QueryFailure(f"Database query failed: {e}")
        if row is not None:  # unknown ids are not cached: callers 404 them
            boundary_cache.put(geography_id, row)
        return row

    async def clip_rivers_to_geojson(self, geography_id: str, min_stream_order: int) -> list[asyncpg.Record]:
        cache_key = (geography_id, min_stream_order)
        cached = clip_cache.get(cache_key)
        if cached is not None:
            return cached
        try:
            async with self.pool.acquire() as conn:
                rows = await self._clip_query(conn, geography_id, min_stream_order)
        except asyncpg.PostgresConnectionError as e:
            logger.error(f"Connection error clipping rivers for {geography_id}: {e}")
            raise DatabaseUnavailable("Database connection is temporarily unavailable.")
        except asyncpg.PostgresError as e:
            logger.error(f"Query error clipping rivers for {geography_id}: {e}")
            raise QueryFailure(f"Database query failed: {e}")
        clip_cache.put(cache_key, rows)
        return rows

    async def _clip_query(self, conn: asyncpg.Connection, geography_id: str,
                          min_stream_order: int) -> list[asyncpg.Record]:
        try:
            async with conn.transaction():
                await conn.execute(f"SET LOCAL work_mem = '{CLIP_WORK_MEM}'")
                rows = await conn.fetch(_CLIP_SUBDIVIDED_SQL, geography_id, min_stream_order)
        except asyncpg.UndefinedTableError:
            logger.warning(
                "admin_boundaries_subdivided does not exist (migration 007 not applied); "
                "falling back to legacy whole-polygon clip for %s", geography_id
            )
            return await conn.fetch(_CLIP_LEGACY_SQL, geography_id, min_stream_order)

        if not rows:
            # Distinguish "no rivers at this order" from "boundary not subdivided
            # yet" (e.g. imported after migration 007 without the trigger firing).
            populated = await conn.fetchval(
                "SELECT EXISTS(SELECT 1 FROM admin_boundaries_subdivided WHERE boundary_id = $1)",
                geography_id,
            )
            if not populated:
                logger.warning(
                    "No subdivided tiles for boundary %s; falling back to legacy clip", geography_id
                )
                return await conn.fetch(_CLIP_LEGACY_SQL, geography_id, min_stream_order)
        return rows

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
