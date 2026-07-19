-- 008_sweep_aggregates.sql
-- R3/R4 (docs/DB_IO_OPTIMIZATION.md): sensitivity sweeps now persist only
-- sweep-level aggregates; child runs no longer write to mcda_cell_results.
-- This migration creates the aggregate tables, backfills them from any
-- existing sweeps' retained child results, and then deletes those child
-- results (previously ~2 x N_factors x grid rows of permanent growth per
-- sweep).

CREATE TABLE IF NOT EXISTS mcda_sweep_summary (
    sweep_id          UUID PRIMARY KEY,
    base_run_id       UUID NOT NULL REFERENCES mcda_model_runs(run_id) ON DELETE CASCADE,
    avg_stddev        NUMERIC NOT NULL,
    max_stddev        NUMERIC NOT NULL,
    total_zone_flips  INTEGER NOT NULL,
    pct_cells_flipped NUMERIC NOT NULL,
    factor_rankings   JSONB NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- No FK to mcda_sweep_summary: the sweep writes volatility rows first and
-- derives the summary from them inside the same transaction.
CREATE TABLE IF NOT EXISTS mcda_sweep_volatility (
    sweep_id            UUID NOT NULL,
    h3_index            TEXT NOT NULL,
    stddev              NUMERIC NOT NULL,
    variance            NUMERIC NOT NULL,
    zone_flips          INTEGER NOT NULL,
    baseline_zone       TEXT NOT NULL,
    baseline_score      NUMERIC,
    volatility_category TEXT NOT NULL,
    PRIMARY KEY (sweep_id, h3_index)
);

-- ---------------------------------------------------------------------------
-- Backfill: preserve aggregates for sweeps whose children completed under the
-- old engine, so their volatility/summary views survive the cleanup below.
-- Semantics mirror the legacy read queries (STDDEV_POP, flip CASE, NULL-score
-- exclusion, 0.15/0.40 category thresholds).
-- ---------------------------------------------------------------------------

INSERT INTO mcda_sweep_volatility
    (sweep_id, h3_index, stddev, variance, zone_flips,
     baseline_zone, baseline_score, volatility_category)
SELECT
    (m.params->>'sweep_id')::uuid,
    c.h3_index,
    ROUND(STDDEV_POP(c.total_score)::numeric, 4),
    ROUND(VAR_POP(c.total_score)::numeric, 4),
    SUM(CASE WHEN c.final_zone != base.final_zone THEN 1 ELSE 0 END),
    base.final_zone::text,
    base.total_score,
    CASE
        WHEN STDDEV_POP(c.total_score) < 0.15 THEN 'LOW'
        WHEN STDDEV_POP(c.total_score) < 0.40 THEN 'MEDIUM'
        ELSE 'HIGH'
    END
FROM mcda_cell_results c
JOIN mcda_model_runs m
    ON m.run_id = c.run_id
   AND m.params ? 'sweep_id'
   AND m.status = 'complete'
JOIN mcda_cell_results base
    ON base.run_id = (m.params->>'parent_run_id')::uuid
   AND base.h3_index = c.h3_index
WHERE c.total_score IS NOT NULL
  AND base.total_score IS NOT NULL
GROUP BY m.params->>'sweep_id', c.h3_index, base.final_zone, base.total_score
ON CONFLICT (sweep_id, h3_index) DO NOTHING;

INSERT INTO mcda_sweep_summary
    (sweep_id, base_run_id, avg_stddev, max_stddev, total_zone_flips,
     pct_cells_flipped, factor_rankings)
SELECT
    v.sweep_id,
    (SELECT (m.params->>'parent_run_id')::uuid
     FROM mcda_model_runs m
     WHERE m.params->>'sweep_id' = v.sweep_id::text
     LIMIT 1),
    COALESCE(ROUND(AVG(v.stddev), 4), 0),
    COALESCE(ROUND(MAX(v.stddev), 4), 0),
    COALESCE(SUM(v.zone_flips), 0)::int,
    COALESCE(ROUND(100.0 * COUNT(*) FILTER (WHERE v.zone_flips > 0)
                   / NULLIF(COUNT(*), 0), 2), 0),
    COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
                   'factor_key', r.factor_key,
                   'direction', r.direction,
                   'mean_absolute_deviation', r.mad,
                   'zone_flips', r.flips)
               ORDER BY r.mad DESC)
        FROM (
            SELECT m.params->>'sensitivity_factor'   AS factor_key,
                   m.params->>'sensitivity_direction' AS direction,
                   AVG(ABS(c.total_score - base.total_score))::float8 AS mad,
                   SUM(CASE WHEN c.final_zone != base.final_zone THEN 1 ELSE 0 END) AS flips
            FROM mcda_cell_results c
            JOIN mcda_model_runs m
                ON m.run_id = c.run_id
               AND m.params->>'sweep_id' = v.sweep_id::text
               AND m.status = 'complete'
            JOIN mcda_cell_results base
                ON base.run_id = (m.params->>'parent_run_id')::uuid
               AND base.h3_index = c.h3_index
            WHERE c.total_score IS NOT NULL
              AND base.total_score IS NOT NULL
            GROUP BY 1, 2
        ) r
    ), '[]'::jsonb)
FROM mcda_sweep_volatility v
WHERE NOT EXISTS (SELECT 1 FROM mcda_sweep_summary s WHERE s.sweep_id = v.sweep_id)
GROUP BY v.sweep_id;

-- ---------------------------------------------------------------------------
-- R4 cleanup: child cell results are now redundant (aggregates preserved
-- above). This is the table growth of ~12 x grid rows per historical sweep.
-- ---------------------------------------------------------------------------

DELETE FROM mcda_cell_results r
USING mcda_model_runs m
WHERE m.run_id = r.run_id
  AND m.params ? 'parent_run_id';
