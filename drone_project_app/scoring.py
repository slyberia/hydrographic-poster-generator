"""
scoring.py — The MCDA engine. Executes one model run against the schema.

Pipeline (all set-based SQL, per the implementation plan):
  1. CONSTRAINT PASS  — per cell, find constraint features within their resolved
     buffer (L3 feature-rule override, else L2 sub-type default). Retain every
     hit's rendered reason; most-severe zone wins (enum order = severity).
  2. FACTOR PASS      — per cell x factor, resolve each feature's score through
     the three-level cascade (L3 rule -> L2 default), MAX per factor per cell
     (most-restrictive-wins), buffered ST_DWithin for point features and
     ST_Intersects for polygon coverage.
  3. WEIGHTED OVERLAY — total = SUM(score_i * w_i) / SUM(w_i) over the factors
     PRESENT for that cell. Dividing by the sum of present-factor weights is
     the renormalisation step: it (a) keeps scores on the 1-5 scale, (b) makes
     any non-negative weight set valid (edits/sensitivity can't break runs),
     and (c) prevents sparse factors (airspace, regulatory in the MVP) from
     dragging every cell's score down by their absence.
  4. CLASSIFY         — thresholds snapshot -> zone; constraint zone overrides.
  5. ATTRIBUTE        — factor_scores JSONB, constraint_reasons[], dominant
     reason, and worst contributing data-confidence per cell.

Weights + thresholds are SNAPSHOTTED into mcda_model_runs at execution time,
so past runs remain reproducible after config edits.
"""

from __future__ import annotations

import json
import uuid
from typing import Optional

from sqlalchemy import text
from sqlalchemy.engine import Engine

# L3 matcher used identically in both passes: first active rule whose categorical
# value or numeric range matches the feature's attribute wins (lowest rule id).
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

# Render "{name}/{dist}/{value}" placeholders into a human reason string.
_RENDER_REASON = """
    replace(replace(replace(
        COALESCE(fr.reason_template, st.reason_template, st.subtype_name),
        '{name}',  COALESCE(f.name, st.subtype_name)),
        '{dist}',  COALESCE(fr.buffer_m, st.default_buffer_m, 0)::int::text),
        '{value}', COALESCE(f.attrs ->> fr.match_attribute, ''))
"""


def create_run(engine: Engine, region_key: str, label: Optional[str],
               weight_overrides: Optional[dict], created_by: Optional[str]) -> str:
    """Snapshot config (with optional per-run weight overrides) and register the run."""
    with engine.begin() as conn:
        region_id = conn.execute(text(
            "SELECT region_id FROM mcda_region_boundary WHERE region_key = :k"),
            {"k": region_key}).scalar()
        if region_id is None:
            raise ValueError(f"Unknown region_key '{region_key}'")

        weights = dict(conn.execute(text(
            "SELECT factor_key, weight FROM mcda_factors WHERE is_active")).fetchall())
        weights = {k: float(v) for k, v in weights.items()}
        if weight_overrides:
            unknown = set(weight_overrides) - set(weights)
            if unknown:
                raise ValueError(f"Unknown factor keys in overrides: {sorted(unknown)}")
            bad = {k: v for k, v in weight_overrides.items() if v < 0}
            if bad:
                raise ValueError(f"Weights must be non-negative: {bad}")
            weights.update({k: float(v) for k, v in weight_overrides.items()})

        thresholds = [dict(r._mapping) for r in conn.execute(text(
            "SELECT zone::text, score_min, score_max FROM mcda_zone_thresholds"))]

        run_id = str(uuid.uuid4())
        conn.execute(text("""
            INSERT INTO mcda_model_runs
                (run_id, region_id, h3_resolution, weights_snapshot, params, label, status, created_by)
            VALUES (:id, :region, 9, CAST(:w AS jsonb), CAST(:p AS jsonb), :label, 'pending', :by)
        """), {"id": run_id, "region": region_id,
               "w": json.dumps(weights),
               "p": json.dumps({"thresholds": thresholds}, default=float),
               "label": label, "by": created_by})
    return run_id


def execute_run(engine: Engine, run_id: str) -> dict:
    """Run the full pipeline for a registered run. Returns zone statistics."""
    with engine.begin() as conn:
        run = conn.execute(text(
            "SELECT region_id, weights_snapshot FROM mcda_model_runs WHERE run_id = :id"),
            {"id": run_id}).one()
        region_id = run.region_id
        conn.execute(text(
            "UPDATE mcda_model_runs SET status='running' WHERE run_id=:id"), {"id": run_id})

        # ---- weights temp table from the snapshot (renormalisation basis) ----
        conn.execute(text("""
            CREATE TEMP TABLE tmp_weights ON COMMIT DROP AS
            SELECT mf.factor_id, mf.factor_key, (w.value)::numeric AS weight
            FROM jsonb_each_text((SELECT weights_snapshot FROM mcda_model_runs WHERE run_id = :id)) w(key, value)
            JOIN mcda_factors mf ON mf.factor_key = w.key
        """), {"id": run_id})

        # ---- 0. PREPARE FEATURES (the optimization) ----
        # Resolve the three-level cascade ONCE PER FEATURE (289 rows), not once
        # per cell x feature pair (~5.6M). Buffers are computed in UTM 21N
        # (EPSG:32621) per the CRS policy, transformed back to 4326, and GiST-
        # indexed so both passes become plain indexed ST_Intersects joins.
        conn.execute(text(f"""
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
        """))
        conn.execute(text(
            "CREATE INDEX ON tmp_prepared USING GIST (geom)"))
        conn.execute(text("ANALYZE tmp_prepared"))

        # ---- 1. CONSTRAINT PASS (indexed intersects against prepared buffers) ----
        conn.execute(text("""
            CREATE TEMP TABLE tmp_constraints ON COMMIT DROP AS
            SELECT g.h3_index, p.zone, p.reason, p.confidence
            FROM mcda_grid g
            JOIN tmp_prepared p
              ON p.treatment = 'constraint'
             AND ST_Intersects(g.geom, p.geom)
            WHERE g.region_id = :region
        """), {"region": region_id})

        # ---- 2. FACTOR PASS (three-level cascade already resolved in tmp_prepared) ----
        conn.execute(text("""
            CREATE TEMP TABLE tmp_factor_hits ON COMMIT DROP AS
            SELECT g.h3_index, p.factor_id, p.score, p.reason, p.confidence
            FROM mcda_grid g
            JOIN tmp_prepared p
              ON p.treatment = 'factor'
             AND p.score IS NOT NULL
             AND ST_Intersects(g.geom, p.geom)
            WHERE g.region_id = :region
        """), {"region": region_id})

        conn.execute(text("""
            CREATE TEMP TABLE tmp_factor_scores ON COMMIT DROP AS
            SELECT h.h3_index, h.factor_id,
                   MAX(h.score) AS score,
                   (ARRAY_AGG(h.reason ORDER BY h.score DESC))[1] AS reason,
                   MAX(h.confidence) AS confidence      -- enum order: later = worse
            FROM tmp_factor_hits h
            GROUP BY h.h3_index, h.factor_id
        """))

        # Per-cell sum of PRESENT-factor weights (the renormalisation denominator).
        conn.execute(text("""
            CREATE TEMP TABLE tmp_cell_wsum ON COMMIT DROP AS
            SELECT fs.h3_index, SUM(w.weight) AS wsum
            FROM tmp_factor_scores fs
            JOIN tmp_weights w USING (factor_id)
            GROUP BY fs.h3_index
        """))

        # ---- 3+4+5. OVERLAY, CLASSIFY, ATTRIBUTE, WRITE RESULTS ----
        conn.execute(text("DELETE FROM mcda_cell_results WHERE run_id = :id"), {"id": run_id})
        conn.execute(text("""
            INSERT INTO mcda_cell_results
                (run_id, h3_index, final_zone, total_score, factor_scores,
                 constraint_reasons, dominant_reason, min_confidence)
            SELECT
                :id,
                g.h3_index,
                COALESCE(
                    c.worst_zone,                       -- constraint locks the zone
                    t.zone,                             -- else score threshold
                    'SUITABLE'::drone_zone              -- no data at all -> lowest risk band
                ) AS final_zone,
                s.total_score,
                s.factor_scores,
                c.reasons,
                COALESCE(c.dominant_constraint, s.dominant_factor_reason, 'No mapped risk factors') AS dominant_reason,
                GREATEST(c.worst_confidence, s.worst_confidence) AS min_confidence
            FROM mcda_grid g
            LEFT JOIN (   -- constraint aggregation per cell
                SELECT h3_index,
                       MIN(zone) AS worst_zone,                         -- enum order: first = most severe
                       ARRAY_AGG(DISTINCT reason) AS reasons,
                       (ARRAY_AGG(reason ORDER BY zone))[1] AS dominant_constraint,
                       MAX(confidence) AS worst_confidence
                FROM tmp_constraints GROUP BY h3_index
            ) c USING (h3_index)
            LEFT JOIN (   -- weighted overlay per cell (renormalised over PRESENT factors)
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
            WHERE g.region_id = :region
        """), {"id": run_id, "region": region_id})

        conn.execute(text("""
            UPDATE mcda_model_runs SET status='complete', completed_at=now()
            WHERE run_id = :id
        """), {"id": run_id})

    return run_stats(engine, run_id)


def run_stats(engine: Engine, run_id: str) -> dict:
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT r.final_zone::text AS zone,
                   COUNT(*) AS cells,
                   ROUND((SUM(ST_Area(g.geom::geography)) / 1e6)::numeric, 2) AS area_km2
            FROM mcda_cell_results r
            JOIN mcda_grid g USING (h3_index)
            WHERE r.run_id = :id
            GROUP BY r.final_zone
            ORDER BY r.final_zone
        """), {"id": run_id}).fetchall()
        total = sum(r.cells for r in rows) or 1
        return {
            "run_id": run_id,
            "zones": [{
                "zone": r.zone, "cells": r.cells,
                "area_km2": float(r.area_km2),
                "pct": round(100.0 * r.cells / total, 1),
            } for r in rows],
            "total_cells": total,
        }


def location_report(engine: Engine, run_id: str, h3_index: str) -> Optional[dict]:
    """The click-based location report required by the methodology: zone, main
    reason, contributing factors, authorization note, and data confidence."""
    with engine.connect() as conn:
        row = conn.execute(text("""
            SELECT r.final_zone::text AS zone, r.total_score, r.factor_scores,
                   r.constraint_reasons, r.dominant_reason, r.min_confidence::text AS confidence
            FROM mcda_cell_results r
            WHERE r.run_id = :id AND r.h3_index = :h
        """), {"id": run_id, "h": h3_index}).fetchone()
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
        "zone": row.zone,
        "risk_score": float(row.total_score) if row.total_score is not None else None,
        "main_reason": row.dominant_reason,
        "authorization_note": notes[row.zone],
        "constraint_reasons": row.constraint_reasons or [],
        "factor_breakdown": row.factor_scores or {},
        "data_confidence": row.confidence,
        "disclaimer": ("Decision-support output only — not an official authorization. "
                       "GCAA approval requirements are unaffected by this classification."),
    }


def results_geojson(engine: Engine, run_id: str, zone: Optional[str] = None) -> dict:
    """Cell results as a GeoJSON FeatureCollection for the web map."""
    q = """
        SELECT r.h3_index, r.final_zone::text AS zone, r.total_score,
               r.dominant_reason, r.min_confidence::text AS confidence,
               ST_AsGeoJSON(g.geom) AS geometry
        FROM mcda_cell_results r
        JOIN mcda_grid g USING (h3_index)
        WHERE r.run_id = :id
    """
    params = {"id": run_id}
    if zone:
        q += " AND r.final_zone = CAST(:zone AS drone_zone)"
        params["zone"] = zone
    with engine.connect() as conn:
        rows = conn.execute(text(q), params).fetchall()
    return {
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "geometry": json.loads(r.geometry),
            "properties": {
                "h3_index": r.h3_index,
                "zone": r.zone,
                "score": float(r.total_score) if r.total_score is not None else None,
                "reason": r.dominant_reason,
                "confidence": r.confidence,
            },
        } for r in rows],
    }
