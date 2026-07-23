"""Publication lifecycle and study-area configuration for drone zoning runs.

This service owns the authoritative-data contract that the Public Explorer
depends on (ARC-1):

  * lifecycle transitions (approve / publish / archive) — administrator-only,
    enforced at the router; the transactional supersede logic lives here;
  * the deployment-neutral study-area configuration read model;
  * public-SAFE projections of the single published run — never a draft or
    approved run, never editable weights, internal notes, or draft identifiers.

Execution `status` (pending|running|complete|failed) is a separate axis and is
never touched here — only `lifecycle_state` moves.
"""

import json
import logging
from typing import Any, Dict, List, Optional

import asyncpg

logger = logging.getLogger(__name__)


class LifecycleError(ValueError):
    """A requested lifecycle transition is not valid from the current state."""


class NotFoundError(ValueError):
    """The referenced run, study area, or published data does not exist."""


# =============================================================================
#  Study-area configuration (deployment-neutral, public-safe)
# =============================================================================

_STUDY_AREA_COLUMNS = """
    c.region_id, c.slug, c.display_name, c.center_lat, c.center_lng,
    c.default_zoom, c.min_zoom, c.max_zoom,
    c.bbox_west, c.bbox_south, c.bbox_east, c.bbox_north,
    c.h3_resolution, c.methodology_version
"""


def _study_area_payload(row: asyncpg.Record) -> Dict[str, Any]:
    """Shape a config row into the public study-area contract."""
    bbox = None
    if None not in (row["bbox_west"], row["bbox_south"], row["bbox_east"], row["bbox_north"]):
        bbox = {
            "west": row["bbox_west"],
            "south": row["bbox_south"],
            "east": row["bbox_east"],
            "north": row["bbox_north"],
        }
    return {
        "slug": row["slug"],
        "display_name": row["display_name"],
        "center": {"lat": row["center_lat"], "lng": row["center_lng"]},
        "default_zoom": row["default_zoom"],
        "min_zoom": row["min_zoom"],
        "max_zoom": row["max_zoom"],
        "bbox": bbox,
        "h3_resolution": row["h3_resolution"],
        "methodology_version": row["methodology_version"],
    }


async def _default_config_row(conn: asyncpg.Connection) -> Optional[asyncpg.Record]:
    """The study area the public surface defaults to.

    MVP serves a single study area. When more than one is configured, prefer one
    that actually has a published run, then fall back to slug order so the choice
    is deterministic.
    """
    return await conn.fetchrow(f"""
        SELECT {_STUDY_AREA_COLUMNS}
        FROM mcda_study_area_config c
        ORDER BY EXISTS (
            SELECT 1 FROM mcda_model_runs r
            WHERE r.region_id = c.region_id AND r.lifecycle_state = 'published'
        ) DESC, c.slug
        LIMIT 1
    """)


async def get_public_config(pool: asyncpg.Pool) -> Dict[str, Any]:
    """Study-area presentation config plus published-run metadata (public-safe).

    Raises NotFoundError if no study area is configured at all. A configured
    area with nothing published returns ``published: null`` — a valid,
    explicit "no data yet" state for the Explorer.
    """
    async with pool.acquire() as conn:
        config = await _default_config_row(conn)
        if config is None:
            raise NotFoundError("No study area is configured.")

        published = await conn.fetchrow("""
            SELECT published_at::text AS published_at
            FROM mcda_model_runs
            WHERE region_id = $1 AND lifecycle_state = 'published'
            LIMIT 1
        """, config["region_id"])

    payload = {"study_area": _study_area_payload(config)}
    payload["published"] = (
        {
            "published_at": published["published_at"],
            "methodology_version": config["methodology_version"],
        }
        if published is not None
        else None
    )
    return payload


# =============================================================================
#  Public-safe published-run projections
# =============================================================================

async def _published_run_id(conn: asyncpg.Connection) -> Optional[str]:
    """run_id of the default study area's published run, or None."""
    config = await _default_config_row(conn)
    if config is None:
        return None
    return await conn.fetchval("""
        SELECT run_id::text
        FROM mcda_model_runs
        WHERE region_id = $1 AND lifecycle_state = 'published'
        LIMIT 1
    """, config["region_id"])


async def public_zoning_geojson(pool: asyncpg.Pool) -> Dict[str, Any]:
    """The published run as a GeoJSON FeatureCollection, public-safe.

    Properties are results only — classification zone, the plain-language
    dominant reason, and data confidence. The internal numeric score and any
    run identifier are deliberately omitted. Raises NotFoundError when nothing
    is published, so the Explorer shows an explicit unavailable state rather
    than an empty map that looks like "everything is fine".
    """
    async with pool.acquire() as conn:
        run_id = await _published_run_id(conn)
        if run_id is None:
            raise NotFoundError("No published zoning is available.")
        rows = await conn.fetch("""
            SELECT r.h3_index, r.final_zone::text AS zone,
                   r.dominant_reason, r.min_confidence::text AS confidence,
                   ST_AsGeoJSON(g.geom) AS geometry
            FROM mcda_cell_results r
            JOIN mcda_grid g USING (h3_index)
            WHERE r.run_id = $1::uuid
        """, run_id)

    return {
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "geometry": json.loads(row["geometry"]),
            "properties": {
                "h3_index": row["h3_index"],
                "zone": row["zone"],
                "reason": row["dominant_reason"],
                "confidence": row["confidence"],
            },
        } for row in rows],
    }


_ZONE_GUIDANCE = {
    "PROHIBITED": "Drone operations are not permitted in this area.",
    "RESTRICTED": "Formal authorization is required before operating here.",
    "CONDITIONAL": "Operations may be possible with caution, mitigation, or additional checks.",
    "SUITABLE": "Lower-risk area; normal drone rules apply.",
}

_DISCLAIMER = (
    "Decision-support output only — not an official authorization. GCAA approval "
    "requirements are unaffected by this classification."
)


async def public_location_report(pool: asyncpg.Pool, h3_index: str) -> Dict[str, Any]:
    """Plain-language cell report for the published run, public-safe.

    Excludes the raw score and the per-factor breakdown (which carries model
    weights). Raises NotFoundError when nothing is published or the cell is
    outside the published grid.
    """
    async with pool.acquire() as conn:
        run_id = await _published_run_id(conn)
        if run_id is None:
            raise NotFoundError("No published zoning is available.")
        config = await _default_config_row(conn)
        row = await conn.fetchrow("""
            SELECT r.final_zone::text AS zone, r.dominant_reason,
                   r.constraint_reasons, r.min_confidence::text AS confidence
            FROM mcda_cell_results r
            WHERE r.run_id = $1::uuid AND r.h3_index = $2
        """, run_id, h3_index)

    if row is None:
        raise NotFoundError(f"No published guidance for cell {h3_index}.")

    return {
        "h3_index": h3_index,
        "zone": row["zone"],
        "classification": row["zone"].title(),
        "main_reason": row["dominant_reason"],
        "guidance": _ZONE_GUIDANCE[row["zone"]],
        "constraint_reasons": row["constraint_reasons"] or [],
        "data_confidence": row["confidence"],
        "methodology_version": config["methodology_version"] if config else None,
        "disclaimer": _DISCLAIMER,
    }


# =============================================================================
#  Administrator-only lifecycle transitions
# =============================================================================

def _run_summary(row: asyncpg.Record) -> Dict[str, Any]:
    return {
        "run_id": row["run_id"],
        "lifecycle_state": row["lifecycle_state"],
        "status": row["status"],
        "approved_at": row["approved_at"],
        "published_at": row["published_at"],
        "archived_at": row["archived_at"],
        "supersedes_run_id": row["supersedes_run_id"],
    }


_RETURNING = """
    RETURNING run_id::text AS run_id, lifecycle_state::text AS lifecycle_state,
              status, approved_at::text AS approved_at,
              published_at::text AS published_at, archived_at::text AS archived_at,
              supersedes_run_id::text AS supersedes_run_id
"""


async def approve_run(pool: asyncpg.Pool, run_id: str, actor: str) -> Dict[str, Any]:
    """draft -> approved. Requires a completed execution."""
    async with pool.acquire() as conn:
        async with conn.transaction():
            run = await conn.fetchrow(
                "SELECT lifecycle_state, status FROM mcda_model_runs "
                "WHERE run_id = $1::uuid FOR UPDATE",
                run_id,
            )
            if run is None:
                raise NotFoundError(f"Run {run_id} not found")
            if run["status"] != "complete":
                raise LifecycleError(
                    f"Run {run_id} is '{run['status']}', not 'complete' — cannot approve."
                )
            if run["lifecycle_state"] != "draft":
                raise LifecycleError(
                    f"Run {run_id} is '{run['lifecycle_state']}'; only draft runs can be approved."
                )
            row = await conn.fetchrow(
                "UPDATE mcda_model_runs "
                "SET lifecycle_state = 'approved', approved_at = now(), approved_by = $2 "
                "WHERE run_id = $1::uuid" + _RETURNING,
                run_id, actor,
            )
    return _run_summary(row)


async def publish_run(pool: asyncpg.Pool, run_id: str, actor: str) -> Dict[str, Any]:
    """approved -> published, superseding the incumbent published run atomically.

    Within one transaction the current published run for the same study area (if
    any) is archived first, then this run is published with supersedes_run_id set
    to the archived run. The partial unique index guarantees only one published
    run per region even under concurrency (the row locks serialize publishers).
    """
    async with pool.acquire() as conn:
        async with conn.transaction():
            run = await conn.fetchrow(
                "SELECT region_id, lifecycle_state, status FROM mcda_model_runs "
                "WHERE run_id = $1::uuid FOR UPDATE",
                run_id,
            )
            if run is None:
                raise NotFoundError(f"Run {run_id} not found")
            if run["lifecycle_state"] != "approved":
                raise LifecycleError(
                    f"Run {run_id} is '{run['lifecycle_state']}'; only approved runs can be published."
                )

            incumbent = await conn.fetchval(
                "SELECT run_id::text FROM mcda_model_runs "
                "WHERE region_id = $1 AND lifecycle_state = 'published' "
                "AND run_id <> $2::uuid FOR UPDATE",
                run["region_id"], run_id,
            )
            if incumbent is not None:
                await conn.execute(
                    "UPDATE mcda_model_runs "
                    "SET lifecycle_state = 'archived', archived_at = now(), archived_by = $2 "
                    "WHERE run_id = $1::uuid",
                    incumbent, actor,
                )

            row = await conn.fetchrow(
                "UPDATE mcda_model_runs "
                "SET lifecycle_state = 'published', published_at = now(), "
                "    published_by = $2, supersedes_run_id = $3::uuid "
                "WHERE run_id = $1::uuid" + _RETURNING,
                run_id, actor, incumbent,
            )
    return _run_summary(row)


async def archive_run(pool: asyncpg.Pool, run_id: str, actor: str) -> Dict[str, Any]:
    """(draft|approved|published) -> archived."""
    async with pool.acquire() as conn:
        async with conn.transaction():
            run = await conn.fetchrow(
                "SELECT lifecycle_state FROM mcda_model_runs "
                "WHERE run_id = $1::uuid FOR UPDATE",
                run_id,
            )
            if run is None:
                raise NotFoundError(f"Run {run_id} not found")
            if run["lifecycle_state"] == "archived":
                raise LifecycleError(f"Run {run_id} is already archived.")
            row = await conn.fetchrow(
                "UPDATE mcda_model_runs "
                "SET lifecycle_state = 'archived', archived_at = now(), archived_by = $2 "
                "WHERE run_id = $1::uuid" + _RETURNING,
                run_id, actor,
            )
    return _run_summary(row)
