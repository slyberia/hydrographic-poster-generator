-- Milestone A: immutable, published-run GeoJSON artifact manifest.
-- PostGIS remains authoritative; Storage contains a reproducible read cache.

CREATE TABLE IF NOT EXISTS mcda_published_artifacts (
    run_id          UUID NOT NULL REFERENCES mcda_model_runs(run_id) ON DELETE CASCADE,
    artifact_type   TEXT NOT NULL CHECK (artifact_type IN ('dissolved', 'cell', 'clipped_cell')),
    storage_bucket  TEXT NOT NULL,
    storage_path    TEXT NOT NULL,
    content_type    TEXT NOT NULL DEFAULT 'application/geo+json',
    byte_size       BIGINT NOT NULL CHECK (byte_size >= 0),
    sha256          TEXT NOT NULL CHECK (length(sha256) = 64),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (run_id, artifact_type),
    UNIQUE (storage_bucket, storage_path)
);

COMMENT ON TABLE mcda_published_artifacts IS
    'Materialized read artifacts for immutable published runs. PostGIS remains authoritative.';

CREATE INDEX IF NOT EXISTS idx_published_artifacts_type
    ON mcda_published_artifacts (artifact_type);

ALTER TABLE mcda_published_artifacts ENABLE ROW LEVEL SECURITY;
