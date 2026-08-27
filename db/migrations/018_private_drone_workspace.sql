-- 018_private_drone_workspace.sql
-- Drone published artifacts are served only through viewer-authorized backend
-- endpoints. Keep the bucket durable and idempotently private; the backend's
-- service credential continues to perform materialization and reads while
-- Postgres/PostGIS remains the analytical source of truth.

INSERT INTO storage.buckets (id, name, public)
VALUES ('drone-published', 'drone-published', false)
ON CONFLICT (id) DO UPDATE
SET public = false;
