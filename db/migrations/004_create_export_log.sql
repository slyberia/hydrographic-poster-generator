-- 004_create_export_log.sql

CREATE TABLE IF NOT EXISTS export_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    geography_id VARCHAR(100) NOT NULL,
    density_preset VARCHAR(50) NOT NULL,
    palette_preset VARCHAR(50) NOT NULL,
    typography_preset VARCHAR(50) NOT NULL,
    design_asset_mode BOOLEAN NOT NULL DEFAULT FALSE,
    export_format VARCHAR(10) NOT NULL,
    export_size VARCHAR(50) NOT NULL,
    river_count INTEGER NOT NULL,
    output_hash VARCHAR(64),
    manifest_json JSONB NOT NULL,
    exported_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_export_log_geo ON export_log (geography_id);
CREATE INDEX IF NOT EXISTS idx_export_log_time ON export_log (exported_at);
