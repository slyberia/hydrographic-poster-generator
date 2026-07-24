"""Internal dashboard aggregates for drone zoning (UX-9).

Answers the NDC dashboard's questions from bounded SQL aggregates — published
zone distribution, run/publish recency, least-stable factors, classification
change across recent runs, and data freshness. Never returns cell geometry, so
the browser downloads small aggregate payloads instead of a ~19.5k-cell grid.

Viewer-authorized (enforced at the router); metrics are traceable to a run id
and the study area's methodology version.
"""

from datetime import datetime, timezone
import json
from typing import Any, Dict, List, Optional

import asyncpg

from app.services import drone_service

# A published run older than this is flagged for review on the dashboard. Not a
# hard rule — just the "is this still current?" signal the dashboard question asks.
STALE_THRESHOLD_DAYS = 90

# Recent runs shown in the "how has classification changed" history. Bounded so
# the payload stays small (<= this many rows x 4 zones).
RUN_HISTORY_LIMIT = 8


async def _study_area(conn: asyncpg.Connection) -> Optional[asyncpg.Record]:
    return await conn.fetchrow("""
        SELECT c.region_id, c.slug, c.display_name, c.methodology_version
        FROM mcda_study_area_config c
        ORDER BY EXISTS (
            SELECT 1 FROM mcda_model_runs r
            WHERE r.region_id = c.region_id AND r.lifecycle_state = 'published'
        ) DESC, c.slug
        LIMIT 1
    """)


async def _published_run(conn: asyncpg.Connection, region_id: int) -> Optional[asyncpg.Record]:
    return await conn.fetchrow("""
        SELECT run_id::text, label, lifecycle_state::text,
               published_at::text AS published_at, published_by,
               created_at::text AS created_at, completed_at::text AS completed_at
        FROM mcda_model_runs
        WHERE region_id = $1 AND lifecycle_state = 'published'
        LIMIT 1
    """, region_id)


async def _latest_run(conn: asyncpg.Connection, region_id: int) -> Optional[asyncpg.Record]:
    return await conn.fetchrow("""
        SELECT run_id::text, label, status,
               created_at::text AS created_at, completed_at::text AS completed_at
        FROM mcda_model_runs
        WHERE region_id = $1
          AND (params->>'parent_run_id') IS NULL
          AND status = 'complete'
        ORDER BY created_at DESC
        LIMIT 1
    """, region_id)


async def _run_history(conn: asyncpg.Connection, region_id: int) -> List[Dict[str, Any]]:
    """Recent completed runs with their zone distribution (bounded)."""
    rows = await conn.fetch("""
        WITH recent AS (
            SELECT run_id, label, lifecycle_state, created_at
            FROM mcda_model_runs
            WHERE region_id = $1
              AND (params->>'parent_run_id') IS NULL
              AND status = 'complete'
            ORDER BY created_at DESC
            LIMIT $2
        )
        SELECT r.run_id::text AS run_id, r.label,
               r.lifecycle_state::text AS lifecycle_state,
               r.created_at::text AS created_at,
               d.final_zone::text AS zone, d.cells
        FROM recent r
        LEFT JOIN LATERAL (
            SELECT final_zone, COUNT(*) AS cells
            FROM mcda_cell_results cr
            WHERE cr.run_id = r.run_id
            GROUP BY final_zone
        ) d ON TRUE
        ORDER BY r.created_at DESC, d.final_zone
    """, region_id, RUN_HISTORY_LIMIT)

    by_run: Dict[str, Dict[str, Any]] = {}
    order: List[str] = []
    for row in rows:
        rid = row["run_id"]
        if rid not in by_run:
            by_run[rid] = {
                "run_id": rid,
                "label": row["label"],
                "lifecycle_state": row["lifecycle_state"],
                "created_at": row["created_at"],
                "total_cells": 0,
                "_zones": [],
            }
            order.append(rid)
        if row["zone"] is not None:
            cells = int(row["cells"])
            by_run[rid]["_zones"].append({"zone": row["zone"], "cells": cells})
            by_run[rid]["total_cells"] += cells

    history: List[Dict[str, Any]] = []
    for rid in order:
        run = by_run[rid]
        total = run["total_cells"] or 1
        run["zone_distribution"] = [
            {"zone": z["zone"], "cells": z["cells"],
             "pct": round(100.0 * z["cells"] / total, 1)}
            for z in run.pop("_zones")
        ]
        history.append(run)
    return history


async def _latest_sensitivity(conn: asyncpg.Connection) -> Optional[Dict[str, Any]]:
    row = await conn.fetchrow("""
        SELECT s.sweep_id::text, s.base_run_id::text, m.label AS base_label,
               s.avg_stddev, s.max_stddev, s.total_zone_flips,
               s.pct_cells_flipped, s.factor_rankings, s.created_at::text AS created_at
        FROM mcda_sweep_summary s
        JOIN mcda_model_runs m ON m.run_id = s.base_run_id
        ORDER BY s.created_at DESC
        LIMIT 1
    """)
    if row is None:
        return None
    rankings = row["factor_rankings"]
    if isinstance(rankings, str):
        rankings = json.loads(rankings)
    return {
        "sweep_id": row["sweep_id"],
        "base_run_id": row["base_run_id"],
        "base_label": row["base_label"],
        "created_at": row["created_at"],
        "avg_stddev": float(row["avg_stddev"]),
        "max_stddev": float(row["max_stddev"]),
        "total_zone_flips": int(row["total_zone_flips"]),
        "pct_cells_flipped": float(row["pct_cells_flipped"]),
        "factor_rankings": rankings,
    }


def _freshness(published_at: Optional[str], methodology_version: Optional[str]) -> Dict[str, Any]:
    days: Optional[int] = None
    if published_at:
        try:
            pub = datetime.fromisoformat(published_at)
            if pub.tzinfo is None:
                pub = pub.replace(tzinfo=timezone.utc)
            days = (datetime.now(timezone.utc) - pub).days
        except ValueError:
            days = None
    return {
        "published_at": published_at,
        "days_since_published": days,
        "is_stale": days is not None and days > STALE_THRESHOLD_DAYS,
        "stale_threshold_days": STALE_THRESHOLD_DAYS,
        "methodology_version": methodology_version,
    }


async def get_dashboard(pool: asyncpg.Pool) -> Dict[str, Any]:
    """Assemble the internal dashboard aggregate. Well-formed even when nothing
    is published or no runs exist yet (nulls + empty lists drive the UI states)."""
    async with pool.acquire() as conn:
        config = await _study_area(conn)
        if config is None:
            return {
                "study_area": None, "published": None, "latest_run": None,
                "run_history": [], "sensitivity": None,
                "freshness": _freshness(None, None),
            }

        region_id = config["region_id"]
        pub_run = await _published_run(conn, region_id)
        latest = await _latest_run(conn, region_id)
        history = await _run_history(conn, region_id)
        sensitivity = await _latest_sensitivity(conn)

    published: Optional[Dict[str, Any]] = None
    if pub_run is not None:
        stats = await drone_service.run_stats(pool, pub_run["run_id"])
        published = {
            "run_id": pub_run["run_id"],
            "label": pub_run["label"],
            "lifecycle_state": pub_run["lifecycle_state"],
            "published_at": pub_run["published_at"],
            "published_by": pub_run["published_by"],
            "total_cells": stats["total_cells"],
            "analyzed_area_km2": round(sum(z["area_km2"] for z in stats["zones"]), 2),
            "zone_distribution": stats["zones"],
        }

    return {
        "study_area": {
            "slug": config["slug"],
            "display_name": config["display_name"],
            "methodology_version": config["methodology_version"],
        },
        "published": published,
        "latest_run": dict(latest) if latest is not None else None,
        "run_history": history,
        "sensitivity": sensitivity,
        "freshness": _freshness(
            pub_run["published_at"] if pub_run else None,
            config["methodology_version"],
        ),
    }
