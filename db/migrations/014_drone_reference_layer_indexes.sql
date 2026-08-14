-- Milestone C: cover the aviation safeguarding runway foreign key.
CREATE INDEX IF NOT EXISTS idx_aviation_safeguarding_runway_id
    ON aviation_safeguarding_surfaces (runway_id);
