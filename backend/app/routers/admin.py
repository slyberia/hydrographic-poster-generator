from fastapi import APIRouter, Depends
import asyncpg

from app.database import get_db_pool
from app.services.rules_service import rules_service

router = APIRouter()

@router.post("/reload-rules")
async def reload_rules(pool: asyncpg.Pool = Depends(get_db_pool)):
    """Hot-reload platform rules from the database without redeployment."""
    await rules_service.reload(pool)
    return {
        "status": "reloaded",
        "source": rules_service.source,
        "rule_count": len(rules_service.rule_versions),
        "versions": rules_service.rule_versions,
    }

@router.get("/export-history")
async def get_export_history(limit: int = 50, pool: asyncpg.Pool = Depends(get_db_pool)):
    """Fetch recent exports from the audit log."""
    query = """
        SELECT id, geography_id, density_preset, palette_preset, typography_preset,
               export_format, export_size, river_count, exported_at
        FROM export_log
        ORDER BY exported_at DESC
        LIMIT $1
    """
    async with pool.acquire() as conn:
        rows = await conn.fetch(query, limit)
    
    return [dict(row) for row in rows]
