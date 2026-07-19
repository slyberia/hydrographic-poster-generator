import os
import secrets

from fastapi import APIRouter, Depends, Header, HTTPException
import asyncpg

from app.database import get_db_pool
from app.services.rules_service import rules_service
from app.services.spatial_cache import clip_cache, boundary_cache


async def require_admin_key(x_admin_key: str = Header(default="", alias="X-Admin-Key")):
    """Shared-key auth for the admin surface (audit finding D1).

    Deny-all by default: with no ADMIN_API_KEY configured the endpoints are
    disabled outright, so an unconfigured deployment is closed rather than
    open. The key is read per-request (not at import) so tests and hot
    reconfiguration see the current environment.
    """
    expected = os.getenv("ADMIN_API_KEY", "")
    if not expected:
        raise HTTPException(
            status_code=403,
            detail="Admin endpoints are disabled: ADMIN_API_KEY is not configured.",
        )
    if not secrets.compare_digest(x_admin_key.encode(), expected.encode()):
        raise HTTPException(status_code=401, detail="Invalid admin key.")


router = APIRouter(dependencies=[Depends(require_admin_key)])

@router.post("/reload-rules")
async def reload_rules(pool: asyncpg.Pool = Depends(get_db_pool)):
    """Hot-reload platform rules from the database without redeployment.

    Also flushes the in-process spatial caches, so this doubles as the manual
    cache-invalidation hook after a data re-import.
    """
    await rules_service.reload(pool)
    cleared = clip_cache.clear() + boundary_cache.clear()
    return {
        "status": "reloaded",
        "source": rules_service.source,
        "rule_count": len(rules_service.rule_versions),
        "versions": rules_service.rule_versions,
        "spatial_cache_entries_cleared": cleared,
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
