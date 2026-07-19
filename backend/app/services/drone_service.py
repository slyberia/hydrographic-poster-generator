import asyncio
import json
import uuid
import logging
from typing import Optional, Dict, List, Any
import asyncpg

logger = logging.getLogger(__name__)

# L3 matcher: resolves overrides by inspecting feature attributes against rules.
_L3_LATERAL = """
    LEFT JOIN LATERAL (
        SELECT fr.*
        FROM mcda_feature_rules fr
        WHERE fr.subtype_id = st.subtype_id
          AND fr.is_active
          AND (
                (fr.match_value IS NOT NULL
                 AND f.attrs ->> fr.match_attribute = fr.match_value)
             OR (fr.match_value IS NULL
                 AND (f.attrs ->> fr.match_attribute) ~ '^-?[0-9]+(\\.[0-9]+)?$'
                 AND ((f.attrs ->> fr.match_attribute)::numeric >= COALESCE(fr.value_min, '-Infinity'::numeric))
                 AND ((f.attrs ->> fr.match_attribute)::numeric <  COALESCE(fr.value_max,  'Infinity'::numeric)))
          )
        ORDER BY fr.feature_rule_id
        LIMIT 1
    ) fr ON TRUE
"""

# Render reason template into a human-readable reason string.
_RENDER_REASON = """
    replace(replace(replace(
        COALESCE(fr.reason_template, st.reason_template, st.subtype_name),
        '{name}',  COALESCE(f.name, st.subtype_name)),
        '{dist}',  COALESCE(fr.buffer_m, st.default_buffer_m, 0)::int::text),
        '{value}', COALESCE(f.attrs ->> fr.match_attribute, ''))
"""


async def get_factors(pool: asyncpg.Pool) -> List[Dict[str, Any]]:
    """Fetch active factor weights with their normalized calculations."""
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM mcda_weight_check")
        return [dict(r) for r in rows]


async def patch_factor(pool: asyncpg.Pool, key: str, weight: float) -> List[Dict[str, Any]]:
    """Update factor raw weight, then return the full updated list."""
    async with pool.acquire() as conn:
        async with conn.transaction():
            # Verify factor exists
            exists = await conn.fetchval("SELECT 1 FROM mcda_factors WHERE factor_key = $1", key)
            if not exists:
                raise ValueError(f"Unknown factor key '{key}'")
            if weight < 0:
                raise ValueError("Weight must be non-negative")

            await conn.execute("UPDATE mcda_factors SET weight = $1 WHERE factor_key = $2", weight, key)
            
        # Return updated list
        return await get_factors(pool)


async def list_runs(pool: asyncpg.Pool) -> List[Dict[str, Any]]:
    """List all recorded model runs sorted by creation time.

    Sensitivity sweep children (runs carrying params.parent_run_id) are excluded —
    they are internal perturbation runs, not user-facing scenarios.
    """
    async with pool.acquire() as conn:
        rows = await conn.fetch("""
            SELECT run_id::text, label, status, weights_snapshot,
                   created_at::text, completed_at::text
            FROM mcda_model_runs
            WHERE (params->>'parent_run_id') IS NULL
            ORDER BY created_at DESC
        """)
        return [dict(r) for r in rows]


async def get_run_details(pool: asyncpg.Pool, run_id: str) -> Optional[Dict[str, Any]]:
    """Get metadata summary and aggregate statistics for a specific run."""
    async with pool.acquire() as conn:
        run = await conn.fetchrow("""
            SELECT run_id::text, label, status, weights_snapshot,
                   created_at::text, completed_at::text
            FROM mcda_model_runs
            WHERE run_id = $1::uuid
        """, run_id)
        if not run:
            return None
        
        stats = await run_stats(pool, run_id)
        result = dict(run)
        result["stats"] = stats
        return result


async def create_run(pool: asyncpg.Pool, region_key: str, label: Optional[str],
                     weight_overrides: Optional[dict], created_by: Optional[str] = None) -> str:
    """Snapshot factor config with overrides and register a pending run."""
    async with pool.acquire() as conn:
        async with conn.transaction():
            region_id = await conn.fetchval(
                "SELECT region_id FROM mcda_region_boundary WHERE region_key = $1", region_key
            )
            if region_id is None:
                raise ValueError(f"Unknown region_key '{region_key}'")

            rows = await conn.fetch("SELECT factor_key, weight FROM mcda_factors WHERE is_active")
            weights = {r["factor_key"]: float(r["weight"]) for r in rows}
            if weight_overrides:
                unknown = set(weight_overrides) - set(weights)
                if unknown:
                    raise ValueError(f"Unknown factor keys in overrides: {sorted(unknown)}")
                bad = {k: v for k, v in weight_overrides.items() if v < 0}
                if bad:
                    raise ValueError(f"Weights must be non-negative: {bad}")
                weights.update({k: float(v) for k, v in weight_overrides.items()})

            threshold_rows = await conn.fetch("SELECT zone::text, score_min, score_max FROM mcda_zone_thresholds")
            thresholds = [dict(r) for r in threshold_rows]

            run_id = str(uuid.uuid4())
            await conn.execute("""
                INSERT INTO mcda_model_runs
                    (run_id, region_id, h3_resolution, weights_snapshot, params, label, status, created_by)
                VALUES ($1::uuid, $2, 9, $3::jsonb, $4::jsonb, $5, 'pending', $6)
            """, run_id, region_id, json.dumps(weights),
                 json.dumps({"thresholds": thresholds}, default=float),
                 label, created_by)
    return run_id


async def execute_run(pool: asyncpg.Pool, run_id: str) -> Dict[str, Any]:
    """Run the complete async spatial scoring and aggregation pipeline."""
    async with pool.acquire() as conn:
        async with conn.transaction():
            # Get run details
            run = await conn.fetchrow(
                "SELECT region_id, weights_snapshot FROM mcda_model_runs WHERE run_id = $1::uuid", run_id
            )
            if not run:
                raise ValueError(f"Run {run_id} not registered")
            
            region_id = run["region_id"]
            
            await conn.execute(
                "UPDATE mcda_model_runs SET status='running' WHERE run_id=$1::uuid", run_id
            )

            # 1. Create weights temp table from snapshot
            await conn.execute("""
                CREATE TEMP TABLE tmp_weights ON COMMIT DROP AS
                SELECT mf.factor_id, mf.factor_key, (w.value)::numeric AS weight
                FROM jsonb_each_text((SELECT weights_snapshot FROM mcda_model_runs WHERE run_id = $1::uuid)) w(key, value)
                JOIN mcda_factors mf ON mf.factor_key = w.key
            """, run_id)

            # 2. Prepare features (resolve 3-level cascade and buffer geometry)
            await conn.execute(f"""
                CREATE TEMP TABLE tmp_prepared ON COMMIT DROP AS
                SELECT f.feature_id,
                       st.treatment,
                       st.factor_id,
                       COALESCE(fr.score, st.default_score)                AS score,
                       COALESCE(fr.output_zone, st.default_zone)           AS zone,
                       {_RENDER_REASON}                                    AS reason,
                       l.confidence,
                       CASE
                         WHEN COALESCE(fr.buffer_m, st.default_buffer_m, 0) > 0
                         THEN ST_Transform(
                                ST_Buffer(ST_Transform(f.geom, 32621),
                                          COALESCE(fr.buffer_m, st.default_buffer_m)),
                                4326)
                         ELSE f.geom
                       END AS geom
                FROM mcda_features f
                JOIN mcda_subtypes st ON st.subtype_key = f.subtype_key AND st.is_active
                JOIN mcda_layers  l   ON l.layer_id = f.layer_id AND l.is_active
                {_L3_LATERAL}
            """)
            await conn.execute("CREATE INDEX ON tmp_prepared USING GIST (geom)")
            await conn.execute("ANALYZE tmp_prepared")

            # 3. Constraint pass
            await conn.execute("""
                CREATE TEMP TABLE tmp_constraints ON COMMIT DROP AS
                SELECT g.h3_index, p.zone, p.reason, p.confidence
                FROM mcda_grid g
                JOIN tmp_prepared p
                  ON p.treatment = 'constraint'
                 AND ST_Intersects(g.geom, p.geom)
                WHERE g.region_id = $1
            """, region_id)

            # 4. Factor pass
            await conn.execute("""
                CREATE TEMP TABLE tmp_factor_hits ON COMMIT DROP AS
                SELECT g.h3_index, p.factor_id, p.score, p.reason, p.confidence
                FROM mcda_grid g
                JOIN tmp_prepared p
                  ON p.treatment = 'factor'
                 AND p.score IS NOT NULL
                 AND ST_Intersects(g.geom, p.geom)
                WHERE g.region_id = $1
            """, region_id)

            # 5. Factor scoring aggregation (MAX score per factor per cell)
            await conn.execute("""
                CREATE TEMP TABLE tmp_factor_scores ON COMMIT DROP AS
                SELECT h.h3_index, h.factor_id,
                       MAX(h.score) AS score,
                       (ARRAY_AGG(h.reason ORDER BY h.score DESC))[1] AS reason,
                       MAX(h.confidence) AS confidence
                FROM tmp_factor_hits h
                GROUP BY h.h3_index, h.factor_id
            """)

            # 6. Sum of present-factor weights
            await conn.execute("""
                CREATE TEMP TABLE tmp_cell_wsum ON COMMIT DROP AS
                SELECT fs.h3_index, SUM(w.weight) AS wsum
                FROM tmp_factor_scores fs
                JOIN tmp_weights w USING (factor_id)
                GROUP BY fs.h3_index
            """)

            # 7. Write final results to table
            await conn.execute("DELETE FROM mcda_cell_results WHERE run_id = $1::uuid", run_id)
            await conn.execute("""
                INSERT INTO mcda_cell_results
                    (run_id, h3_index, final_zone, total_score, factor_scores,
                     constraint_reasons, dominant_reason, min_confidence)
                SELECT
                    $1::uuid,
                    g.h3_index,
                    COALESCE(
                        c.worst_zone,
                        t.zone,
                        'SUITABLE'::drone_zone
                    ) AS final_zone,
                    s.total_score,
                    s.factor_scores,
                    c.reasons,
                    COALESCE(c.dominant_constraint, s.dominant_factor_reason, 'No mapped risk factors') AS dominant_reason,
                    GREATEST(c.worst_confidence, s.worst_confidence) AS min_confidence
                FROM mcda_grid g
                LEFT JOIN (
                    SELECT h3_index,
                           MIN(zone) AS worst_zone,
                           ARRAY_AGG(DISTINCT reason) AS reasons,
                           (ARRAY_AGG(reason ORDER BY zone))[1] AS dominant_constraint,
                           MAX(confidence) AS worst_confidence
                    FROM tmp_constraints GROUP BY h3_index
                ) c USING (h3_index)
                LEFT JOIN (
                    SELECT fs.h3_index,
                           ROUND(SUM(fs.score * w.weight) / NULLIF(cw.wsum, 0), 3) AS total_score,
                           jsonb_object_agg(w.factor_key, jsonb_build_object(
                               'score', fs.score,
                               'weight', ROUND(w.weight / NULLIF(cw.wsum, 0), 4),
                               'reason', fs.reason)) AS factor_scores,
                           (ARRAY_AGG(fs.reason ORDER BY fs.score * w.weight DESC))[1] AS dominant_factor_reason,
                           MAX(fs.confidence) AS worst_confidence
                    FROM tmp_factor_scores fs
                    JOIN tmp_weights w USING (factor_id)
                    JOIN tmp_cell_wsum cw USING (h3_index)
                    GROUP BY fs.h3_index, cw.wsum
                ) s USING (h3_index)
                LEFT JOIN LATERAL (
                    SELECT zone FROM mcda_zone_thresholds th
                    WHERE s.total_score IS NOT NULL
                      AND th.score_min IS NOT NULL
                      AND s.total_score >= th.score_min AND s.total_score < th.score_max
                    LIMIT 1
                ) t ON TRUE
                WHERE g.region_id = $2
            """, run_id, region_id)

            await conn.execute("""
                UPDATE mcda_model_runs SET status='complete', completed_at=now()
                WHERE run_id = $1::uuid
            """, run_id)

    return await run_stats(pool, run_id)


async def run_stats(pool: asyncpg.Pool, run_id: str) -> Dict[str, Any]:
    """Calculate the grid suitability percentage distributions for a run."""
    async with pool.acquire() as conn:
        rows = await conn.fetch("""
            SELECT r.final_zone::text AS zone,
                   COUNT(*) AS cells,
                   ROUND((SUM(ST_Area(g.geom::geography)) / 1e6)::numeric, 2) AS area_km2
            FROM mcda_cell_results r
            JOIN mcda_grid g USING (h3_index)
            WHERE r.run_id = $1::uuid
            GROUP BY r.final_zone
            ORDER BY r.final_zone
        """, run_id)
        
        total = sum(r["cells"] for r in rows) or 1
        return {
            "run_id": run_id,
            "zones": [{
                "zone": r["zone"], "cells": r["cells"],
                "area_km2": float(r["area_km2"]),
                "pct": round(100.0 * r["cells"] / total, 1),
            } for r in rows],
            "total_cells": total,
        }


async def location_report(pool: asyncpg.Pool, run_id: str, h3_index: str) -> Optional[Dict[str, Any]]:
    """Build a detailed per-cell risk factor and justification report."""
    async with pool.acquire() as conn:
        row = await conn.fetchrow("""
            SELECT r.final_zone::text AS zone, r.total_score, r.factor_scores,
                   r.constraint_reasons, r.dominant_reason, r.min_confidence::text AS confidence
            FROM mcda_cell_results r
            WHERE r.run_id = $1::uuid AND r.h3_index = $2
        """, run_id, h3_index)
        
    if row is None:
        return None
        
    notes = {
        "PROHIBITED":  "Drone operations are not permitted in this area.",
        "RESTRICTED":  "Formal authorization is required before operating here.",
        "CONDITIONAL": "Operations may be possible with caution, mitigation, or additional checks.",
        "SUITABLE":    "Lower-risk area; normal drone rules apply.",
    }
    
    return {
        "h3_index": h3_index,
        "zone": row["zone"],
        "risk_score": float(row["total_score"]) if row["total_score"] is not None else None,
        "main_reason": row["dominant_reason"],
        "authorization_note": notes[row["zone"]],
        "constraint_reasons": row["constraint_reasons"] or [],
        "factor_breakdown": json.loads(row["factor_scores"]) if isinstance(row["factor_scores"], str) else (row["factor_scores"] or {}),
        "data_confidence": row["confidence"],
        "disclaimer": ("Decision-support output only — not an official authorization. "
                       "GCAA approval requirements are unaffected by this classification."),
    }


async def results_geojson(pool: asyncpg.Pool, run_id: str, zone: Optional[str] = None) -> Dict[str, Any]:
    """Retrieve full grid results formatted as a GeoJSON FeatureCollection."""
    q = """
        SELECT r.h3_index, r.final_zone::text AS zone, r.total_score,
               r.dominant_reason, r.min_confidence::text AS confidence,
               ST_AsGeoJSON(g.geom) AS geometry
        FROM mcda_cell_results r
        JOIN mcda_grid g USING (h3_index)
        WHERE r.run_id = $1::uuid
    """
    params = [run_id]
    if zone:
        q += " AND r.final_zone = CAST($2 AS drone_zone)"
        params.append(zone)
        
    async with pool.acquire() as conn:
        rows = await conn.fetch(q, *params)
        
    return {
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "geometry": json.loads(r["geometry"]),
            "properties": {
                "h3_index": r["h3_index"],
                "zone": r["zone"],
                "score": float(r["total_score"]) if r["total_score"] is not None else None,
                "reason": r["dominant_reason"],
                "confidence": r["confidence"],
            },
        } for r in rows],
    }


# =============================================================================
# Phase C: Sensitivity Analysis (OAT weight perturbation sweeps)
# =============================================================================

SWEEP_STALE_MINUTES = 15

# Population statistics (STDDEV_POP / VAR_POP) are used throughout: an OAT sweep is
# the entire population of perturbations, not a sample drawn from one, and the
# volatility category thresholds below are calibrated against population stddev.
# Constraint-locked cells carry NULL total_score in the baseline and every child
# (constraints ignore weights), so both aggregation queries exclude NULL scores —
# those cells cannot flip zone by definition and must not be categorized.

_FACTOR_RANKING_SQL = """
    SELECT
        m.params ->> 'sensitivity_factor'    AS factor_key,
        m.params ->> 'sensitivity_direction' AS direction,
        AVG(ABS(c.total_score - base.total_score))                        AS mean_absolute_deviation,
        SUM(CASE WHEN c.final_zone != base.final_zone THEN 1 ELSE 0 END)  AS zone_flips
    FROM mcda_cell_results c
    JOIN mcda_cell_results base
        ON base.h3_index = c.h3_index AND base.run_id = $1::uuid
    JOIN mcda_model_runs m ON m.run_id = c.run_id
    WHERE m.params ->> 'sweep_id' = $2
      AND m.status = 'complete'
      AND c.total_score IS NOT NULL
      AND base.total_score IS NOT NULL
    GROUP BY factor_key, direction
    ORDER BY zone_flips DESC, mean_absolute_deviation DESC
"""

_SWEEP_SUMMARY_SQL = """
    WITH per_cell AS (
        SELECT c.h3_index,
               STDDEV_POP(c.total_score) AS sd,
               SUM(CASE WHEN c.final_zone != base.final_zone THEN 1 ELSE 0 END) AS flips
        FROM mcda_cell_results c
        JOIN mcda_cell_results base
            ON base.h3_index = c.h3_index AND base.run_id = $1::uuid
        JOIN mcda_model_runs m ON m.run_id = c.run_id
        WHERE m.params ->> 'sweep_id' = $2
          AND m.status = 'complete'
          AND c.total_score IS NOT NULL
          AND base.total_score IS NOT NULL
        GROUP BY c.h3_index
    )
    SELECT COALESCE(ROUND(AVG(sd)::numeric, 4), 0)                    AS avg_stddev,
           COALESCE(ROUND(MAX(sd)::numeric, 4), 0)                    AS max_stddev,
           COALESCE(SUM(flips), 0)::int                               AS total_zone_flips,
           COALESCE(ROUND((100.0 * COUNT(*) FILTER (WHERE flips > 0)
                           / NULLIF(COUNT(*), 0))::numeric, 2), 0)    AS pct_cells_flipped
    FROM per_cell
"""

_VOLATILITY_SQL = """
    SELECT
        c.h3_index,
        ROUND(STDDEV_POP(c.total_score)::numeric, 4)  AS stddev,
        ROUND(VAR_POP(c.total_score)::numeric, 4)     AS variance,
        SUM(CASE WHEN c.final_zone != base.final_zone THEN 1 ELSE 0 END) AS zone_flips,
        base.final_zone::text  AS baseline_zone,
        base.total_score       AS baseline_score,
        CASE
            WHEN STDDEV_POP(c.total_score) < 0.15 THEN 'LOW'
            WHEN STDDEV_POP(c.total_score) < 0.40 THEN 'MEDIUM'
            ELSE 'HIGH'
        END AS volatility_category
    FROM mcda_cell_results c
    JOIN mcda_cell_results base
        ON base.h3_index = c.h3_index AND base.run_id = $1::uuid
    JOIN mcda_model_runs m ON m.run_id = c.run_id
    WHERE m.params ->> 'sweep_id' = $2
      AND m.status = 'complete'
      AND c.total_score IS NOT NULL
      AND base.total_score IS NOT NULL
    GROUP BY c.h3_index, base.final_zone, base.total_score
"""


async def trigger_sensitivity_analysis(pool: asyncpg.Pool, base_run_id: str,
                                       delta: float = 0.10,
                                       label: Optional[str] = None) -> Dict[str, Any]:
    """Trigger a one-at-a-time (OAT) weight perturbation sweep.

    Perturbation convention:
      - Each active factor's raw weight is perturbed by ±delta one at a time.
      - The engine renormalizes weights PER CELL over the factors present in that
        cell (tmp_cell_wsum in execute_run). Cells without coverage of the perturbed
        factor are unaffected; within covered cells, the perturbation shifts every
        present factor's normalized share.
      - Score scale (1-5) and zone thresholds are unchanged.
      - Attribution (MAD, zone flips) therefore reflects the combined
        normalized-share effect within the perturbed factor's spatial footprint —
        not a global ceteris-paribus effect. This is the intended OAT semantics
        for this engine.

    Idempotent: if the base run already has children in pending/running state, the
    existing sweep's status is returned and no new runs are created. (Known
    limitation: the guard is check-then-act without a lock; acceptable for a
    single-analyst tool.)
    """
    async with pool.acquire() as conn:
        base = await conn.fetchrow(
            "SELECT status, region_id FROM mcda_model_runs WHERE run_id = $1::uuid",
            base_run_id,
        )
        if base is None:
            raise ValueError(f"Base run {base_run_id} not found")
        if base["status"] != "complete":
            raise ValueError(f"Base run {base_run_id} is '{base['status']}', not 'complete'")

        existing_sweep_id = await conn.fetchval("""
            SELECT params->>'sweep_id'
            FROM mcda_model_runs
            WHERE params->>'parent_run_id' = $1
              AND status IN ('pending', 'running')
            LIMIT 1
        """, base_run_id)
        if existing_sweep_id:
            return await get_sensitivity_status(pool, base_run_id, existing_sweep_id)

        factors = await conn.fetch(
            "SELECT factor_key, weight FROM mcda_factors WHERE is_active ORDER BY factor_key"
        )
        if not factors:
            raise ValueError("No active factors — cannot run sensitivity analysis")
        region_key = await conn.fetchval(
            "SELECT region_key FROM mcda_region_boundary WHERE region_id = $1",
            base["region_id"],
        )

    sweep_id = str(uuid.uuid4())
    total_expected = 2 * len(factors)
    child_run_ids: List[str] = []

    for f in factors:
        base_weight = float(f["weight"])
        for direction, mult in (("up", 1.0 + delta), ("down", 1.0 - delta)):
            sign = "+" if direction == "up" else "-"
            child_label = (f"{label or 'sensitivity'}: "
                           f"{f['factor_key']} {sign}{round(delta * 100):g}%")
            child_id = await create_run(
                pool, region_key, child_label,
                {f["factor_key"]: base_weight * mult},
            )
            # Merge — never replace — so create_run's thresholds snapshot survives.
            meta = {
                "parent_run_id": base_run_id,
                "sweep_id": sweep_id,
                "sensitivity_factor": f["factor_key"],
                "sensitivity_delta": delta,
                "sensitivity_direction": direction,
                "total_expected": total_expected,
            }
            async with pool.acquire() as conn:
                await conn.execute("""
                    UPDATE mcda_model_runs
                    SET params = COALESCE(params, '{}'::jsonb) || $2::jsonb
                    WHERE run_id = $1::uuid
                """, child_id, json.dumps(meta))
            child_run_ids.append(child_id)

    # NOTE: this background task outlives the request; it requires CPU
    # always-allocated on Cloud Run (--no-cpu-throttling, set in cloudbuild.yaml)
    # or it stalls after the 202 returns; see PHASE_C_SENSITIVITY_PLAN.md §3j.
    asyncio.create_task(_execute_sweep(pool, child_run_ids))

    return {
        "sweep_id": sweep_id,
        "status": "running",
        "total_runs": total_expected,
        "completed_runs": 0,
        "failed_runs": 0,
        "partial_results": False,
        "summary": None,
    }


async def _execute_sweep(pool: asyncpg.Pool, run_ids: List[str]) -> None:
    """Execute sweep children sequentially with per-child error isolation."""
    for run_id in run_ids:
        try:
            await execute_run(pool, run_id)
        except Exception as exc:
            logger.error("Sensitivity child %s failed: %s", run_id, exc)
            async with pool.acquire() as conn:
                await conn.execute(
                    "UPDATE mcda_model_runs SET status='failed' WHERE run_id=$1::uuid",
                    run_id,
                )


async def get_sensitivity_status(pool: asyncpg.Pool, base_run_id: str,
                                 sweep_id: str) -> Dict[str, Any]:
    """Poll sweep progress; includes factor rankings over completed children.

    Deliberately writes on read: children stuck in pending/running beyond
    SWEEP_STALE_MINUTES are marked failed here, so a crashed sweep cannot block
    the trigger's idempotency guard forever.
    """
    async with pool.acquire() as conn:
        await conn.execute(f"""
            UPDATE mcda_model_runs SET status='failed'
            WHERE params->>'sweep_id' = $1
              AND status IN ('pending', 'running')
              AND created_at < now() - interval '{SWEEP_STALE_MINUTES} minutes'
        """, sweep_id)

        children = await conn.fetch("""
            SELECT run_id::text, status
            FROM mcda_model_runs
            WHERE params->>'sweep_id' = $1
        """, sweep_id)
        if not children:
            raise ValueError(f"Sweep {sweep_id} not found")

        total = len(children)
        completed = sum(1 for c in children if c["status"] == "complete")
        failed = sum(1 for c in children if c["status"] == "failed")
        active = total - completed - failed

        if completed == total:
            status = "complete"
        elif active > 0:
            status = "running"
        else:
            status = "failed"

        summary = None
        if completed > 0:
            ranking_rows = await conn.fetch(_FACTOR_RANKING_SQL, base_run_id, sweep_id)
            summary_row = await conn.fetchrow(_SWEEP_SUMMARY_SQL, base_run_id, sweep_id)
            summary = {
                "avg_stddev": float(summary_row["avg_stddev"]),
                "max_stddev": float(summary_row["max_stddev"]),
                "total_zone_flips": int(summary_row["total_zone_flips"]),
                "pct_cells_flipped": float(summary_row["pct_cells_flipped"]),
                "factor_rankings": [{
                    "factor_key": r["factor_key"],
                    "direction": r["direction"],
                    "mean_absolute_deviation": float(r["mean_absolute_deviation"]),
                    "zone_flips": int(r["zone_flips"]),
                } for r in ranking_rows],
            }

    return {
        "sweep_id": sweep_id,
        "status": status,
        "total_runs": total,
        "completed_runs": completed,
        "failed_runs": failed,
        "partial_results": completed < total,
        "summary": summary,
    }


async def get_volatility_data(pool: asyncpg.Pool, base_run_id: str,
                              sweep_id: str) -> List[Dict[str, Any]]:
    """Per-cell volatility across a sweep (thin payload, no geometry).

    Partial sweeps return partial (but internally consistent) data over the
    completed children; the status endpoint's partial_results flag tells the
    client. Constraint-locked cells (NULL total_score) are excluded — their zone
    is weight-independent and cannot flip.
    """
    async with pool.acquire() as conn:
        exists = await conn.fetchval(
            "SELECT 1 FROM mcda_model_runs WHERE params->>'sweep_id' = $1 LIMIT 1",
            sweep_id,
        )
        if not exists:
            raise ValueError(f"Sweep {sweep_id} not found")
        rows = await conn.fetch(_VOLATILITY_SQL, base_run_id, sweep_id)

    return [{
        "h3_index": r["h3_index"],
        "stddev": float(r["stddev"]),
        "variance": float(r["variance"]),
        "zone_flips": int(r["zone_flips"]),
        "volatility_category": r["volatility_category"],
        "baseline_zone": r["baseline_zone"],
        "baseline_score": float(r["baseline_score"]) if r["baseline_score"] is not None else None,
    } for r in rows]
