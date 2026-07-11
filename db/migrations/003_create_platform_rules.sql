-- 003_create_platform_rules.sql
-- Externalizes preset/rule definitions into the database.

CREATE TABLE IF NOT EXISTS platform_rules (
    id VARCHAR(100) PRIMARY KEY,              -- e.g., 'density:balanced', 'palette:abyss'
    rule_type VARCHAR(50) NOT NULL,           -- 'density', 'palette', 'typography'
    version INTEGER NOT NULL DEFAULT 1,
    payload JSONB NOT NULL,                   -- the full preset definition
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_platform_rules_type ON platform_rules (rule_type);

-- Seed with current hardcoded presets

-- Density presets
INSERT INTO platform_rules (id, rule_type, payload) VALUES
('density:balanced', 'density', '{
    "id": "balanced", "name": "Balanced", "min_stream_order": 3,
    "description": "Elegant, readable hierarchy. Emphasizes major/primary/secondary rivers.",
    "classification_map": {"10":"major","9":"major","8":"primary","7":"primary","6":"secondary","5":"secondary","4":"minor","3":"minor"}
}'::jsonb),
('density:detailed', 'density', '{
    "id": "detailed", "name": "Detailed", "min_stream_order": 2,
    "description": "More network complexity. Includes minor features.",
    "classification_map": {"10":"major","9":"major","8":"primary","7":"primary","6":"secondary","5":"secondary","4":"minor","3":"minor","2":"headwater"}
}'::jsonb),
('density:dense', 'density', '{
    "id": "dense", "name": "Full Network", "min_stream_order": 1,
    "description": "Maximum hydrographic texture. All stream orders.",
    "classification_map": {"10":"major","9":"major","8":"primary","7":"primary","6":"secondary","5":"secondary","4":"minor","3":"minor","2":"headwater","1":"headwater"}
}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Palette presets
INSERT INTO platform_rules (id, rule_type, payload) VALUES
('palette:abyss', 'palette', '{
    "id": "abyss", "name": "Abyss", "type": "dark",
    "tokens": {"background":"#0F172A","feature_major":"#38BDF8","feature_primary":"#0EA5E9","feature_secondary":"#0284C7","feature_minor":"#0369A1","feature_headwater":"#075985","text_primary":"#F8FAFC","text_secondary":"#94A3B8"}
}'::jsonb),
('palette:parchment', 'palette', '{
    "id": "parchment", "name": "Parchment", "type": "light",
    "tokens": {"background":"#FDFBF7","feature_major":"#1E3A8A","feature_primary":"#2563EB","feature_secondary":"#3B82F6","feature_minor":"#60A5FA","feature_headwater":"#93C5FD","text_primary":"#1E293B","text_secondary":"#64748B"}
}'::jsonb),
('palette:obsidian', 'palette', '{
    "id": "obsidian", "name": "Obsidian", "type": "dark",
    "tokens": {"background":"#000000","feature_major":"#F8FAFC","feature_primary":"#CBD5E1","feature_secondary":"#94A3B8","feature_minor":"#475569","feature_headwater":"#334155","text_primary":"#FFFFFF","text_secondary":"#64748B"}
}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Typography presets
INSERT INTO platform_rules (id, rule_type, payload) VALUES
('typography:gallery_poster', 'typography', '{
    "id": "gallery_poster", "name": "Gallery Poster",
    "title_font": "Inter", "title_weight": "700", "title_tracking": "0.05em",
    "subtitle_font": "Inter", "subtitle_weight": "400", "subtitle_tracking": "0.02em"
}'::jsonb),
('typography:technical_atlas', 'typography', '{
    "id": "technical_atlas", "name": "Technical Atlas",
    "title_font": "Roboto Mono", "title_weight": "500", "title_tracking": "0em",
    "subtitle_font": "Roboto Mono", "subtitle_weight": "400", "subtitle_tracking": "0em"
}'::jsonb),
('typography:field_plate', 'typography', '{
    "id": "field_plate", "name": "Field Plate",
    "title_font": "Outfit", "title_weight": "600", "title_tracking": "0.1em",
    "subtitle_font": "Outfit", "subtitle_weight": "300", "subtitle_tracking": "0.05em"
}'::jsonb)
ON CONFLICT (id) DO NOTHING;
