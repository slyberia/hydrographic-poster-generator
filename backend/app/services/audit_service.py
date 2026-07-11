import json
import logging
from typing import Optional
import asyncpg
from fastapi import BackgroundTasks
from app.models.manifest_models import ExportManifest

logger = logging.getLogger(__name__)

class AuditService:
    @staticmethod
    async def log_export_async(pool: asyncpg.Pool, manifest: ExportManifest):
        """Log the export to the database."""
        query = """
            INSERT INTO export_log (
                geography_id, density_preset, palette_preset, typography_preset,
                design_asset_mode, export_format, export_size, river_count,
                output_hash, manifest_json
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        """
        try:
            async with pool.acquire() as conn:
                await conn.execute(
                    query,
                    manifest.geography_id,
                    manifest.density_preset,
                    manifest.palette,
                    manifest.typography,
                    manifest.design_asset_mode,
                    manifest.export_format,
                    manifest.export_size,
                    manifest.river_count,
                    manifest.output_hash,
                    manifest.model_dump_json()
                )
            logger.info(f"Logged export for geography '{manifest.geography_id}' (hash: {manifest.output_hash})")
        except Exception as e:
            logger.error(f"Failed to log export: {e}")

    @staticmethod
    def queue_audit_log(background_tasks: BackgroundTasks, pool: asyncpg.Pool, manifest: ExportManifest):
        """Enqueue the audit log task."""
        background_tasks.add_task(AuditService.log_export_async, pool, manifest)
