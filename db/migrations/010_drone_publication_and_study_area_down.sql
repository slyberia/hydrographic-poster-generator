-- =============================================================================
-- 010_drone_publication_and_study_area_down.sql
-- -----------------------------------------------------------------------------
-- Reverses 010_drone_publication_and_study_area.sql.
--
-- Drops the study-area configuration model, the publication immutability guards,
-- the single-published-per-region index, the publication columns on
-- mcda_model_runs, and the lifecycle enum — leaving the execution `status`
-- column and all pre-010 objects untouched.
--
-- Order matters: triggers before their functions, columns before the enum they
-- depend on.
-- =============================================================================

-- 4. Study-area configuration model.
DROP TRIGGER IF EXISTS trg_study_area_config_updated ON mcda_study_area_config;
DROP TABLE IF EXISTS mcda_study_area_config;

-- 3. Immutability guards.
DROP TRIGGER IF EXISTS trg_cell_results_published_immutable ON mcda_cell_results;
DROP FUNCTION IF EXISTS drone_guard_published_cell_results();

DROP TRIGGER IF EXISTS trg_runs_published_no_delete ON mcda_model_runs;
DROP FUNCTION IF EXISTS drone_guard_published_run_delete();

DROP TRIGGER IF EXISTS trg_runs_published_immutable ON mcda_model_runs;
DROP FUNCTION IF EXISTS drone_guard_published_run_update();

-- 2. Publication columns + indexes on mcda_model_runs.
DROP INDEX IF EXISTS uq_one_published_run_per_region;
DROP INDEX IF EXISTS idx_runs_lifecycle;

ALTER TABLE mcda_model_runs
    DROP COLUMN IF EXISTS supersedes_run_id,
    DROP COLUMN IF EXISTS archived_by,
    DROP COLUMN IF EXISTS archived_at,
    DROP COLUMN IF EXISTS published_by,
    DROP COLUMN IF EXISTS published_at,
    DROP COLUMN IF EXISTS approved_by,
    DROP COLUMN IF EXISTS approved_at,
    DROP COLUMN IF EXISTS lifecycle_state;

-- 1. Lifecycle enum (only after every dependent column is gone).
DROP TYPE IF EXISTS drone_lifecycle_state;
