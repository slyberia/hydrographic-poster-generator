-- Migration: Create staging schema and provenance tables for Drone Ingestion
-- Phase ID: drone-b1-ingestion-contracts

CREATE TABLE IF NOT EXISTS mcda_ingestion_runs (
    run_id UUID PRIMARY KEY,
    status TEXT NOT NULL CHECK (status IN ('created', 'validated', 'staged', 'failed', 'approved_for_promotion', 'promoted', 'rolled_back')),
    branch TEXT,
    commit_hash TEXT,
    source_hashes JSONB,
    config_params JSONB,
    started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ,
    row_counts JSONB,
    warnings TEXT[] DEFAULT '{}',
    failure_reason TEXT
);

CREATE TABLE IF NOT EXISTS mcda_source_provenance (
    id SERIAL PRIMARY KEY,
    run_id UUID REFERENCES mcda_ingestion_runs(run_id) ON DELETE CASCADE,
    source_type TEXT NOT NULL,
    source_name TEXT NOT NULL,
    source_path TEXT,
    checksum TEXT,
    retrieved_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    crs TEXT,
    license TEXT
);

-- Staging Tables
CREATE TABLE IF NOT EXISTS staging_region_boundary (
    staging_id SERIAL PRIMARY KEY,
    run_id UUID REFERENCES mcda_ingestion_runs(run_id) ON DELETE CASCADE,
    region_key TEXT NOT NULL,
    region_name TEXT,
    geom geometry(MultiPolygon, 4326),
    raw_properties JSONB,
    validation_status TEXT DEFAULT 'unvalidated',
    validation_warnings TEXT[] DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS staging_grid (
    staging_id SERIAL PRIMARY KEY,
    run_id UUID REFERENCES mcda_ingestion_runs(run_id) ON DELETE CASCADE,
    h3_index TEXT NOT NULL,
    resolution SMALLINT NOT NULL,
    geom geometry(Polygon, 4326),
    centroid geometry(Point, 4326),
    validation_status TEXT DEFAULT 'unvalidated',
    validation_warnings TEXT[] DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS staging_features (
    staging_id SERIAL PRIMARY KEY,
    run_id UUID REFERENCES mcda_ingestion_runs(run_id) ON DELETE CASCADE,
    source_key TEXT NOT NULL, -- deterministic uniqueness (e.g. osm:node:123)
    layer_key TEXT NOT NULL,
    subtype_key TEXT NOT NULL,
    name TEXT,
    attrs JSONB,
    geom geometry(Geometry, 4326),
    confidence TEXT,
    validation_status TEXT DEFAULT 'unvalidated',
    validation_warnings TEXT[] DEFAULT '{}'
);

-- Indexes for Staging Performance
CREATE INDEX IF NOT EXISTS idx_staging_region_geom ON staging_region_boundary USING gist(geom);
CREATE INDEX IF NOT EXISTS idx_staging_grid_geom ON staging_grid USING gist(geom);
CREATE INDEX IF NOT EXISTS idx_staging_features_geom ON staging_features USING gist(geom);
CREATE INDEX IF NOT EXISTS idx_staging_features_run_id ON staging_features(run_id);
CREATE INDEX IF NOT EXISTS idx_staging_grid_run_id ON staging_grid(run_id);
