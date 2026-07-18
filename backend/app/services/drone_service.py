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
    """List all recorded model runs sorted by creation time."""
    async with pool.acquire() as conn:
        rows = await conn.fetch("""
            SELECT run_id::text, label, status, weights_snapshot,
                   created_at::text, completed_at::text
            FROM mcda_model_runs
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
