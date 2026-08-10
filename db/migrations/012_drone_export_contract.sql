-- =============================================================================
-- 012_drone_export_contract.sql
-- -----------------------------------------------------------------------------
-- Makes the classification path explicit for each persisted H3 result. A score
-- is meaningful only when weighted MCDA selected the zone; a score retained on
-- a hard-constraint result is explanatory context, not its classification basis.
-- =============================================================================

ALTER TABLE mcda_cell_results
    ADD COLUMN IF NOT EXISTS classification_method TEXT,
    ADD COLUMN IF NOT EXISTS score_applicability TEXT;

ALTER TABLE mcda_cell_results
    DROP CONSTRAINT IF EXISTS chk_cell_results_classification_method,
    ADD CONSTRAINT chk_cell_results_classification_method CHECK (
        classification_method IN (
            'hard_constraint',
            'weighted_mcda',
            'default_no_mapped_factors'
        )
    );

ALTER TABLE mcda_cell_results
    DROP CONSTRAINT IF EXISTS chk_cell_results_score_applicability,
    ADD CONSTRAINT chk_cell_results_score_applicability CHECK (
        score_applicability IN (
            'classification_basis',
            'context_only',
            'not_applicable'
        )
    );

-- Existing completed runs get deterministic semantics without synthesising
-- scores. A constraint remains authoritative even where factor overlap also
-- happened to produce a weighted score.
UPDATE mcda_cell_results
SET classification_method = CASE
        WHEN COALESCE(cardinality(constraint_reasons), 0) > 0 THEN 'hard_constraint'
        WHEN total_score IS NOT NULL THEN 'weighted_mcda'
        ELSE 'default_no_mapped_factors'
    END,
    score_applicability = CASE
        WHEN COALESCE(cardinality(constraint_reasons), 0) > 0
             AND total_score IS NOT NULL THEN 'context_only'
        WHEN COALESCE(cardinality(constraint_reasons), 0) > 0 THEN 'not_applicable'
        WHEN total_score IS NOT NULL THEN 'classification_basis'
        ELSE 'not_applicable'
    END
WHERE classification_method IS NULL OR score_applicability IS NULL;

ALTER TABLE mcda_cell_results
    ALTER COLUMN classification_method SET NOT NULL,
    ALTER COLUMN score_applicability SET NOT NULL;

COMMENT ON COLUMN mcda_cell_results.classification_method IS
    'Authoritative path to final_zone: hard_constraint, weighted_mcda, or default_no_mapped_factors.';
COMMENT ON COLUMN mcda_cell_results.score_applicability IS
    'Meaning of total_score: classification_basis, context_only, or not_applicable.';
