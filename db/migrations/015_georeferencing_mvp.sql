-- Lightweight georeferencing metadata. Raster/intermediate bytes stay ephemeral.
CREATE TABLE IF NOT EXISTS poster_manifest (
    poster_id UUID PRIMARY KEY,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    generator JSONB NOT NULL,
    source JSONB NOT NULL,
    source_crs TEXT NOT NULL,
    source_bbox_3857 JSONB NOT NULL,
    source_bbox_4326 JSONB,
    map_frame JSONB NOT NULL,
    render_dimensions JSONB NOT NULL,
    render_settings JSONB NOT NULL,
    geographic_to_pixel JSONB NOT NULL,
    hydro_rivers_reference JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS georef_runs (
    run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poster_id UUID NOT NULL REFERENCES poster_manifest(poster_id) ON DELETE CASCADE,
    mode TEXT NOT NULL CHECK (mode IN ('native', 'recovery')),
    transformation TEXT NOT NULL,
    metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL CHECK (status IN ('passed', 'warning', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_georef_runs_poster ON georef_runs(poster_id);

CREATE TABLE IF NOT EXISTS georef_gcps (
    gcp_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES georef_runs(run_id) ON DELETE CASCADE,
    source_x DOUBLE PRECISION NOT NULL,
    source_y DOUBLE PRECISION NOT NULL,
    pixel_x DOUBLE PRECISION NOT NULL,
    pixel_y DOUBLE PRECISION NOT NULL,
    score DOUBLE PRECISION,
    residual DOUBLE PRECISION,
    is_inlier BOOLEAN,
    used_for_fit BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_georef_gcps_run ON georef_gcps(run_id);

ALTER TABLE poster_manifest ENABLE ROW LEVEL SECURITY;
ALTER TABLE georef_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE georef_gcps ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON poster_manifest, georef_runs, georef_gcps FROM anon, authenticated;
COMMENT ON TABLE poster_manifest IS 'Backend-only anonymous provenance; no image or geometry blobs.';
