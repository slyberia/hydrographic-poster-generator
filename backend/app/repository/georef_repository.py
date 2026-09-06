"""Atomic metadata persistence using the existing backend database connection."""

import json
import asyncpg
from uuid import UUID
from app.models.georef_models import PosterGeospatialManifest


class GeorefRepository:
    def __init__(self, pool):
        self.pool = pool

    async def check_readiness(self):
        """Check required columns, not just table names; no migration-on-request."""
        try:
            async with self.pool.acquire() as conn:
                await conn.execute("""
                    SELECT p.poster_id, p.geographic_to_pixel, p.hydro_rivers_reference,
                           r.run_id, r.metrics, g.pixel_x, g.used_for_fit
                    FROM poster_manifest p
                    LEFT JOIN georef_runs r ON r.poster_id=p.poster_id
                    LEFT JOIN georef_gcps g ON g.run_id=r.run_id WHERE FALSE
                """)
            return True
        except asyncpg.PostgresError:
            return False

    async def get_manifest(self, poster_id):
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM poster_manifest WHERE poster_id=$1", UUID(str(poster_id))
            )
        if row is None:
            return None
        fields = dict(row)
        for key in (
            "generator",
            "source",
            "source_bbox_3857",
            "source_bbox_4326",
            "map_frame",
            "render_dimensions",
            "render_settings",
            "geographic_to_pixel",
            "hydro_rivers_reference",
        ):
            if isinstance(fields[key], str):
                fields[key] = json.loads(fields[key])
        return PosterGeospatialManifest.model_validate(fields)

    async def save(self, manifest, qc=None, gcps=()):
        values = manifest.model_dump(mode="json")
        fields = (
            "generator",
            "source",
            "source_bbox_3857",
            "source_bbox_4326",
            "map_frame",
            "render_dimensions",
            "render_settings",
            "geographic_to_pixel",
            "hydro_rivers_reference",
        )
        encoded = {k: json.dumps(values[k], allow_nan=False) for k in fields}
        async with self.pool.acquire() as conn:
            async with conn.transaction():
                await conn.execute(
                    """
                    INSERT INTO poster_manifest
                    (poster_id,generated_at,generator,source,source_crs,source_bbox_3857,
                     source_bbox_4326,map_frame,render_dimensions,render_settings,
                     geographic_to_pixel,hydro_rivers_reference)
                    VALUES ($1,$2,$3::jsonb,$4::jsonb,$5,$6::jsonb,$7::jsonb,
                            $8::jsonb,$9::jsonb,$10::jsonb,$11::jsonb,$12::jsonb)
                    ON CONFLICT(poster_id) DO NOTHING
                """,
                    manifest.poster_id,
                    manifest.generated_at,
                    encoded["generator"],
                    encoded["source"],
                    manifest.source_crs,
                    encoded["source_bbox_3857"],
                    encoded["source_bbox_4326"],
                    encoded["map_frame"],
                    encoded["render_dimensions"],
                    encoded["render_settings"],
                    encoded["geographic_to_pixel"],
                    encoded["hydro_rivers_reference"],
                )
                if qc:
                    await conn.execute(
                        """
                        INSERT INTO georef_runs(run_id,poster_id,mode,transformation,metrics,status)
                        VALUES($1,$2,$3,$4,$5::jsonb,$6)
                    """,
                        qc.run_id,
                        manifest.poster_id,
                        qc.mode,
                        qc.transformation,
                        qc.model_dump_json(),
                        qc.status,
                    )
                    if gcps:
                        await conn.executemany(
                            """
                            INSERT INTO georef_gcps(run_id,source_x,source_y,pixel_x,pixel_y,score,residual,is_inlier,used_for_fit)
                            VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
                        """,
                            [
                                (
                                    qc.run_id,
                                    g.source_x,
                                    g.source_y,
                                    g.pixel_x,
                                    g.pixel_y,
                                    g.score,
                                    g.residual,
                                    g.is_inlier,
                                    g.used_for_fit,
                                )
                                for g in gcps
                            ],
                        )
