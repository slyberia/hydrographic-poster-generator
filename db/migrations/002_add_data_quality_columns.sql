-- 002_add_data_quality_columns.sql
-- Adds data quality tracking and geometry validation infrastructure.

-- 1. Add quality tracking columns to hydro_rivers
ALTER TABLE hydro_rivers
  ADD COLUMN IF NOT EXISTS geom_valid BOOLEAN,
  ADD COLUMN IF NOT EXISTS geom_repaired BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS import_batch_id VARCHAR(50);

-- 2. Add quality tracking columns to admin_boundaries
ALTER TABLE admin_boundaries
  ADD COLUMN IF NOT EXISTS geom_valid BOOLEAN,
  ADD COLUMN IF NOT EXISTS geom_repaired BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS import_batch_id VARCHAR(50);

-- 3. Create quarantine table for rejected geometries
CREATE TABLE IF NOT EXISTS geometry_quarantine (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_table VARCHAR(50) NOT NULL,          -- 'hydro_rivers' or 'admin_boundaries'
    source_id BIGINT,                           -- hydrorivers_id or boundary import id
    region_code VARCHAR(50),
    rejection_reason TEXT NOT NULL,
    raw_geom_wkt TEXT,                          -- store the WKT so it can be examined
    import_batch_id VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_quarantine_source ON geometry_quarantine (source_table, region_code);

-- 4. Create import_batches table for provenance tracking
CREATE TABLE IF NOT EXISTS import_batches (
    id VARCHAR(50) PRIMARY KEY,                 -- e.g., 'hr_sa_20260711_143000'
    source_table VARCHAR(50) NOT NULL,
    region_code VARCHAR(50) NOT NULL,
    source_file VARCHAR(500),
    source_version VARCHAR(20),
    total_features_read INTEGER DEFAULT 0,
    total_features_imported INTEGER DEFAULT 0,
    total_features_quarantined INTEGER DEFAULT 0,
    total_features_repaired INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 5. Backfill: validate all existing geometries in hydro_rivers
-- UPDATE hydro_rivers SET geom_valid = ST_IsValid(geom) WHERE geom_valid IS NULL;

-- 6. Backfill: validate all existing geometries in admin_boundaries
-- UPDATE admin_boundaries SET geom_valid = ST_IsValid(geom) WHERE geom_valid IS NULL;

-- 7. Auto-repair invalid geometries that already exist
-- UPDATE hydro_rivers
--   SET geom = ST_MakeValid(geom), geom_repaired = TRUE
--   WHERE geom_valid = FALSE;

-- UPDATE admin_boundaries
--   SET geom = ST_MakeValid(geom), geom_repaired = TRUE
--   WHERE geom_valid = FALSE;

-- 8. Re-validate after repair
-- UPDATE hydro_rivers SET geom_valid = ST_IsValid(geom) WHERE geom_repaired = TRUE;
-- UPDATE admin_boundaries SET geom_valid = ST_IsValid(geom) WHERE geom_repaired = TRUE;
