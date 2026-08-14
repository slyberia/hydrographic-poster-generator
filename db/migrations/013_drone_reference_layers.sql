-- Milestone C: reference-only infrastructure and aviation layers.
-- PostGIS remains authoritative; these tables are not model-run outputs.

CREATE TABLE IF NOT EXISTS aviation_runways (
    runway_id BIGSERIAL PRIMARY KEY,
    airport_id TEXT NOT NULL,
    airport_code TEXT,
    runway_designation TEXT,
    threshold_a geometry(Point, 4326),
    threshold_b geometry(Point, 4326),
    centerline geometry(LineString, 4326) NOT NULL,
    length_m NUMERIC,
    width_m NUMERIC,
    heading NUMERIC,
    source TEXT NOT NULL,
    source_reference TEXT,
    confidence data_confidence NOT NULL DEFAULT 'unverified',
    operational_status TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_aviation_runways_centerline
    ON aviation_runways USING GIST (centerline);

CREATE TABLE IF NOT EXISTS aviation_safeguarding_surfaces (
    surface_id BIGSERIAL PRIMARY KEY,
    runway_id BIGINT REFERENCES aviation_runways(runway_id) ON DELETE CASCADE,
    airport_id TEXT NOT NULL,
    surface_type TEXT NOT NULL CHECK (surface_type IN ('approach', 'departure')),
    geometry geometry(Polygon, 4326) NOT NULL,
    representation_type TEXT NOT NULL DEFAULT 'planning_reference',
    classification_effect TEXT NOT NULL DEFAULT 'none',
    rule_source_reference TEXT,
    geometry_confidence data_confidence NOT NULL DEFAULT 'unverified',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT aviation_reference_only CHECK (
        representation_type = 'planning_reference' AND classification_effect = 'none'
    )
);

CREATE INDEX IF NOT EXISTS idx_aviation_safeguarding_geometry
    ON aviation_safeguarding_surfaces USING GIST (geometry);

CREATE INDEX IF NOT EXISTS idx_aviation_safeguarding_runway_id
    ON aviation_safeguarding_surfaces (runway_id);

CREATE TABLE IF NOT EXISTS aviation_notification_areas (
    notification_area_id BIGSERIAL PRIMARY KEY,
    airport_id TEXT NOT NULL,
    geometry geometry(Polygon, 4326) NOT NULL,
    radius_m NUMERIC NOT NULL DEFAULT 5000 CHECK (radius_m > 0),
    representation_type TEXT NOT NULL DEFAULT 'planning_reference',
    classification_effect TEXT NOT NULL DEFAULT 'none',
    source TEXT NOT NULL,
    source_reference TEXT,
    confidence data_confidence NOT NULL DEFAULT 'unverified',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT aviation_notification_reference_only CHECK (
        representation_type = 'planning_reference' AND classification_effect = 'none'
    )
);

CREATE INDEX IF NOT EXISTS idx_aviation_notification_geometry
    ON aviation_notification_areas USING GIST (geometry);

-- These are backend/service-role reference tables. Keep them unavailable to
-- anon/authenticated Data API callers unless an explicit policy is added.
ALTER TABLE aviation_runways ENABLE ROW LEVEL SECURITY;
ALTER TABLE aviation_safeguarding_surfaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE aviation_notification_areas ENABLE ROW LEVEL SECURITY;

-- The former 5 km aerodrome buffer is retained as provenance/reference data,
-- but no longer participates in MCDA classification.
UPDATE mcda_subtypes
SET is_active = FALSE,
    score_source = 'Retained as 5 km notification/coordination reference only; classification_effect=none.'
WHERE subtype_key = 'aerodrome_proximity';

COMMENT ON TABLE aviation_safeguarding_surfaces IS
    'V1 planning/reference geometry only. Never used to assign a zoning class.';
COMMENT ON TABLE aviation_notification_areas IS
    '5 km aerodrome notification/coordination context, not a prohibition boundary.';
