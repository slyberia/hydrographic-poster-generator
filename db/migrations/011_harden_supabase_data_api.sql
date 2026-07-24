-- 011_harden_supabase_data_api.sql
-- The application uses Supabase Auth but routes all application data through
-- FastAPI's direct PostgreSQL connection. Keep the Data API on a dedicated,
-- empty schema so PostGIS-managed objects in public are not browser-accessible.
--
-- Supabase project configuration must expose `api` instead of `public`. That
-- external setting is documented in db/README.md.

CREATE SCHEMA IF NOT EXISTS api;
GRANT USAGE ON SCHEMA api TO anon, authenticated;
