-- =============================================================================
-- 012_drone_export_contract.sql
-- -----------------------------------------------------------------------------
-- Makes the classification path explicit without changing published results.
-- Published cell results are immutable; their semantics are derived by the API
-- from the pre-existing constraint_reasons and total_score fields.
-- =============================================================================

ALTER TABLE mcda_cell_results
    ADD COLUMN IF NOT EXISTS classification_method TEXT,
    ADD COLUMN IF NOT EXISTS score_applicability TEXT;

ALTER TABLE mcda_cell_results
    DROP CONSTRAINT IF EXISTS chk_cell_results_classification_method,
    ADD CONSTRAINT chk_cell_results_classification_method CHECK (
        classification_method IS NULL OR classification_method IN (
            'hard_constraint',
            'weighted_mcda',
            'default_no_mapped_factors'
        )
    );

ALTER TABLE mcda_cell_results
    DROP CONSTRAINT IF EXISTS chk_cell_results_score_applicability,
    ADD CONSTRAINT chk_cell_results_score_applicability CHECK (
        score_applicability IS NULL OR score_applicability IN (
            'classification_basis',
            'context_only',
            'not_applicable'
        )
    );

-- Backfill mutable historical rows only. The published-result immutability
-- trigger intentionally prevents updating published output; those legacy rows
-- retain NULLs and are interpreted at read time using the same CASE logic.
UPDATE mcda_cell_results r
SET classification_method = CASE
        WHEN COALESCE(cardinality(r.constraint_reasons), 0) > 0 THEN 'hard_constraint'
        WHEN r.total_score IS NOT NULL THEN 'weighted_mcda'
        ELSE 'default_no_mapped_factors'
    END,
    score_applicability = CASE
        WHEN COALESCE(cardinality(r.constraint_reasons), 0) > 0
             AND r.total_score IS NOT NULL THEN 'context_only'
        WHEN COALESCE(cardinality(r.constraint_reasons), 0) > 0 THEN 'not_applicable'
        WHEN r.total_score IS NOT NULL THEN 'classification_basis'
        ELSE 'not_applicable'
    END
FROM mcda_model_runs run
WHERE run.run_id = r.run_id
  AND run.lifecycle_state <> 'published'
  AND (r.classification_method IS NULL OR r.score_applicability IS NULL);

COMMENT ON COLUMN mcda_cell_results.classification_method IS
    'Authoritative final-zone path. NULL is permitted only for legacy immutable published results and is derived at read time.';
COMMENT ON COLUMN mcda_cell_results.score_applicability IS
    'Meaning of total_score. NULL is permitted only for legacy immutable published results and is derived at read time.';
