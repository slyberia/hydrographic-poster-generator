-- 007_spatial_io_optimization.sql
-- Disk-I/O reduction for the hot river-clip path (see docs/DB_IO_OPTIMIZATION.md).
-- Re-runnable: the subdivided table is rebuilt from scratch on each run.

-- 1) Repair geometries once at rest, so the clip query no longer runs
--    ST_MakeValid per river per request.
UPDATE hydro_rivers      SET geom = ST_MakeValid(geom) WHERE NOT ST_IsValid(geom);
UPDATE admin_boundaries  SET geom = ST_MakeValid(geom) WHERE NOT ST_IsValid(geom);

-- 2) Subdivided boundary tiles. Clipping joins rivers against small tiles
--    (<= 256 vertices each) instead of whole-country multipolygons, which
--    slashes detoast reads and per-pair ST_Intersection cost.
CREATE TABLE IF NOT EXISTS admin_boundaries_subdivided (
    id          BIGSERIAL PRIMARY KEY,
    boundary_id UUID NOT NULL REFERENCES admin_boundaries(id) ON DELETE CASCADE,
    geom        geometry(Geometry, 4326) NOT NULL
);

TRUNCATE admin_boundaries_subdivided;
INSERT INTO admin_boundaries_subdivided (boundary_id, geom)
SELECT id, ST_Subdivide(geom, 256)
FROM admin_boundaries;

CREATE INDEX IF NOT EXISTS idx_ab_subdiv_geom     ON admin_boundaries_subdivided USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_ab_subdiv_boundary ON admin_boundaries_subdivided (boundary_id);

-- 3) Keep tiles fresh automatically: every boundary import path (there are
--    several scripts) goes through INSERT/UPDATE on admin_boundaries, so a
--    row trigger re-subdivides on write. It also repairs the incoming
--    geometry, preserving the "valid at rest" invariant from step 1.
CREATE OR REPLACE FUNCTION refresh_boundary_subdivision() RETURNS trigger AS $$
BEGIN
    IF NOT ST_IsValid(NEW.geom) THEN
        NEW.geom := ST_MakeValid(NEW.geom);
    END IF;
    DELETE FROM admin_boundaries_subdivided WHERE boundary_id = NEW.id;
    INSERT INTO admin_boundaries_subdivided (boundary_id, geom)
    SELECT NEW.id, ST_Subdivide(NEW.geom, 256);
    RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_boundary_subdivide ON admin_boundaries;
CREATE TRIGGER trg_boundary_subdivide
BEFORE INSERT OR UPDATE OF geom ON admin_boundaries
FOR EACH ROW EXECUTE FUNCTION refresh_boundary_subdivision();

ANALYZE admin_boundaries_subdivided;
