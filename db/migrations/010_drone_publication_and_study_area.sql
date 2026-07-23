-- =============================================================================
-- 010_drone_publication_and_study_area.sql
-- -----------------------------------------------------------------------------
-- ARC-1 — Published Runs & Study-Area Contract.
--
-- Establishes the minimum authoritative-data contract the Public Explorer needs:
--   * a PUBLICATION lifecycle on model runs, kept SEPARATE from the execution
--     `status` column (pending|running|complete|failed stays untouched);
--   * immutability + a single-published-run-per-study-area guarantee;
--   * a deployment-neutral study-area configuration model (display name, public
--     slug, map center, default zoom, coverage bbox) so those values stop living
--     in frontend components.
--
-- Reversible: see 010_drone_publication_and_study_area_down.sql.
-- Idempotent-friendly: guarded with IF NOT EXISTS / DROP ... IF EXISTS so a
-- partial application can be re-run.
--
-- NOTE: execution status ("has this run finished computing?") and lifecycle
-- state ("is this run a draft / approved / the published one / retired?") are
-- deliberately different axes. A run is `status='complete'` long before an
-- administrator decides to publish it.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. LIFECYCLE ENUM
-- -----------------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE drone_lifecycle_state AS ENUM (
        'draft',       -- freshly executed / analyst scratch. Never public.
        'approved',    -- reviewed, cleared for publication. Still not public.
        'published',   -- the one authoritative run for its study area. Public.
        'archived'     -- retired (superseded or withdrawn). Never public.
    );
EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'type drone_lifecycle_state already exists — skipping.';
END $$;


-- -----------------------------------------------------------------------------
-- 2. PUBLICATION COLUMNS ON mcda_model_runs (execution `status` preserved as-is)
-- -----------------------------------------------------------------------------
ALTER TABLE mcda_model_runs
    ADD COLUMN IF NOT EXISTS lifecycle_state  drone_lifecycle_state NOT NULL DEFAULT 'draft',
    ADD COLUMN IF NOT EXISTS approved_at      TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS approved_by      TEXT,
    ADD COLUMN IF NOT EXISTS published_at     TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS published_by     TEXT,
    ADD COLUMN IF NOT EXISTS archived_at      TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS archived_by      TEXT,
    ADD COLUMN IF NOT EXISTS supersedes_run_id UUID REFERENCES mcda_model_runs(run_id);

COMMENT ON COLUMN mcda_model_runs.lifecycle_state IS
    'Publication lifecycle, INDEPENDENT of the execution `status` column. '
    'draft -> approved -> published, with published -> archived on supersede/withdraw.';
COMMENT ON COLUMN mcda_model_runs.supersedes_run_id IS
    'The previously-published run this one replaced (set atomically at publish).';

-- Lifecycle lookups (list drafts for a region, find the published run, etc.).
CREATE INDEX IF NOT EXISTS idx_runs_lifecycle
    ON mcda_model_runs (region_id, lifecycle_state);

-- At most ONE published run per study area (region). Partial unique index is
-- checked per-row immediately, so publish must archive the incumbent first —
-- the publication service does exactly that inside one transaction.
CREATE UNIQUE INDEX IF NOT EXISTS uq_one_published_run_per_region
    ON mcda_model_runs (region_id)
    WHERE lifecycle_state = 'published';


-- -----------------------------------------------------------------------------
-- 3. IMMUTABILITY GUARDS
-- -----------------------------------------------------------------------------
-- A published run's content is frozen. The only permitted change is the
-- published -> archived transition (which touches lifecycle columns only).
CREATE OR REPLACE FUNCTION drone_guard_published_run_update()
RETURNS trigger AS $$
BEGIN
    IF OLD.lifecycle_state = 'published' THEN
        -- Content columns are frozen while published.
        IF ROW(NEW.region_id, NEW.h3_resolution, NEW.weights_snapshot,
               NEW.params, NEW.label, NEW.status, NEW.created_by, NEW.created_at)
           IS DISTINCT FROM
           ROW(OLD.region_id, OLD.h3_resolution, OLD.weights_snapshot,
               OLD.params, OLD.label, OLD.status, OLD.created_by, OLD.created_at)
        THEN
            RAISE EXCEPTION
                'Published run % is immutable; its content cannot be modified.',
                OLD.run_id USING ERRCODE = 'check_violation';
        END IF;
        -- Lifecycle may only remain published or move to archived.
        IF NEW.lifecycle_state NOT IN ('published', 'archived') THEN
            RAISE EXCEPTION
                'Published run % may only transition to archived (attempted %).',
                OLD.run_id, NEW.lifecycle_state USING ERRCODE = 'check_violation';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_runs_published_immutable ON mcda_model_runs;
CREATE TRIGGER trg_runs_published_immutable
    BEFORE UPDATE ON mcda_model_runs
    FOR EACH ROW EXECUTE FUNCTION drone_guard_published_run_update();

-- A published run cannot be deleted; it must be archived first (this also blocks
-- the cascade delete of its cell results via delete_run()).
CREATE OR REPLACE FUNCTION drone_guard_published_run_delete()
RETURNS trigger AS $$
BEGIN
    IF OLD.lifecycle_state = 'published' THEN
        RAISE EXCEPTION
            'Published run % cannot be deleted; archive it first.',
            OLD.run_id USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_runs_published_no_delete ON mcda_model_runs;
CREATE TRIGGER trg_runs_published_no_delete
    BEFORE DELETE ON mcda_model_runs
    FOR EACH ROW EXECUTE FUNCTION drone_guard_published_run_delete();

-- Cell results belonging to a published run are frozen too. Guard UPDATE/DELETE
-- only: the INSERT path (execute_run) writes cells while the run is still a
-- draft, so leaving INSERT unguarded keeps run execution off the per-row lookup.
CREATE OR REPLACE FUNCTION drone_guard_published_cell_results()
RETURNS trigger AS $$
DECLARE
    target_run UUID := COALESCE(NEW.run_id, OLD.run_id);
BEGIN
    IF (SELECT lifecycle_state FROM mcda_model_runs WHERE run_id = target_run)
       = 'published'
    THEN
        RAISE EXCEPTION
            'Cell results for published run % are immutable.', target_run
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cell_results_published_immutable ON mcda_cell_results;
CREATE TRIGGER trg_cell_results_published_immutable
    BEFORE UPDATE OR DELETE ON mcda_cell_results
    FOR EACH ROW EXECUTE FUNCTION drone_guard_published_cell_results();


-- -----------------------------------------------------------------------------
-- 4. STUDY-AREA CONFIGURATION MODEL (deployment-neutral, public-safe)
-- -----------------------------------------------------------------------------
-- One config row per study area (region). Holds the presentation contract the
-- frontend used to hardcode: public slug, display name, map center, zoom bounds,
-- coverage bbox, grid resolution, and the methodology version to surface
-- publicly. Nothing here is an editable model weight or an internal note.
CREATE TABLE IF NOT EXISTS mcda_study_area_config (
    region_id           INTEGER PRIMARY KEY
                            REFERENCES mcda_region_boundary(region_id) ON DELETE CASCADE,
    slug                TEXT UNIQUE NOT NULL,          -- stable public identifier
    display_name        TEXT NOT NULL,
    center_lat          DOUBLE PRECISION NOT NULL,
    center_lng          DOUBLE PRECISION NOT NULL,
    default_zoom        SMALLINT NOT NULL DEFAULT 10,
    min_zoom            SMALLINT NOT NULL DEFAULT 1,
    max_zoom            SMALLINT NOT NULL DEFAULT 18,
    bbox_west           DOUBLE PRECISION,
    bbox_south          DOUBLE PRECISION,
    bbox_east           DOUBLE PRECISION,
    bbox_north          DOUBLE PRECISION,
    h3_resolution       SMALLINT NOT NULL DEFAULT 9,
    methodology_version TEXT NOT NULL DEFAULT 'region-4-mvp-v1',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT study_area_zoom_bounds CHECK (min_zoom <= default_zoom AND default_zoom <= max_zoom)
);
DROP TRIGGER IF EXISTS trg_study_area_config_updated ON mcda_study_area_config;
CREATE TRIGGER trg_study_area_config_updated
    BEFORE UPDATE ON mcda_study_area_config
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Seed the Region 4 pilot config from the values previously hardcoded in the
-- frontend (MapView center/zoom, geocode coverage bbox). Conditional on the
-- region existing, so a not-yet-ingested database applies cleanly and picks up
-- the row once the boundary is loaded.
INSERT INTO mcda_study_area_config
    (region_id, slug, display_name, center_lat, center_lng, default_zoom,
     min_zoom, max_zoom, bbox_west, bbox_south, bbox_east, bbox_north, h3_resolution)
SELECT rb.region_id,
       'region-4-demerara-mahaica',
       'Region 4 · Demerara-Mahaica',
       6.6, -58.1, 10,
       1, 18,
       -58.9, 6.0, -57.3, 7.3,
       9
FROM mcda_region_boundary rb
WHERE rb.region_key = 'guyana_region_4'
ON CONFLICT (region_id) DO NOTHING;

-- RLS defense-in-depth, consistent with 009: browser roles get no direct access.
ALTER TABLE mcda_study_area_config ENABLE ROW LEVEL SECURITY;
