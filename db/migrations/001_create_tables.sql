-- 001_create_tables.sql
-- Migration to create the core spatial tables for Hydrographic Poster Generator

-- Enable PostGIS if not already enabled (Supabase typically has this enabled, but good practice)
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Create hydro_rivers table
CREATE TABLE IF NOT EXISTS hydro_rivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    region_code VARCHAR(50) NOT NULL,
    source_dataset VARCHAR(100) NOT NULL,
    source_version VARCHAR(20),
    hydrorivers_id BIGINT NOT NULL,
    stream_order INTEGER,
    upstream_area DOUBLE PRECISION,
    length_km DOUBLE PRECISION,
    display_class VARCHAR(50),
    geom GEOMETRY(MultiLineString, 4326) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Unique constraint for idempotent upserts
ALTER TABLE hydro_rivers ADD CONSTRAINT unique_hydrorivers_region UNIQUE (hydrorivers_id, region_code);

-- Indexes for hydro_rivers
CREATE INDEX IF NOT EXISTS idx_hydro_rivers_geom ON hydro_rivers USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_hydro_rivers_region_code ON hydro_rivers (region_code);
CREATE INDEX IF NOT EXISTS idx_hydro_rivers_display_class ON hydro_rivers (display_class);

-- 2. Create admin_boundaries table
CREATE TABLE IF NOT EXISTS admin_boundaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    country VARCHAR(255),
    country_code VARCHAR(3),
    admin_level INTEGER NOT NULL,
    parent_id UUID REFERENCES admin_boundaries(id) ON DELETE SET NULL,
    region_code VARCHAR(50) NOT NULL,
    source VARCHAR(100) NOT NULL,
    source_version VARCHAR(20),
    geom GEOMETRY(MultiPolygon, 4326) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Unique constraint to prevent duplicate boundary imports
ALTER TABLE admin_boundaries ADD CONSTRAINT unique_boundary_name_level_region UNIQUE (name, admin_level, region_code);

-- Indexes for admin_boundaries
CREATE INDEX IF NOT EXISTS idx_admin_boundaries_geom ON admin_boundaries USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_admin_boundaries_country_code ON admin_boundaries (country_code);
CREATE INDEX IF NOT EXISTS idx_admin_boundaries_admin_level ON admin_boundaries (admin_level);
CREATE INDEX IF NOT EXISTS idx_admin_boundaries_parent_id ON admin_boundaries (parent_id);
CREATE INDEX IF NOT EXISTS idx_admin_boundaries_region_code ON admin_boundaries (region_code);

-- 3. Update triggers for updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_hydro_rivers_modtime
    BEFORE UPDATE ON hydro_rivers
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_admin_boundaries_modtime
    BEFORE UPDATE ON admin_boundaries
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();
