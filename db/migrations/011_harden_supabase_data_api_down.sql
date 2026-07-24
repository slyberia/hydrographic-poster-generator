-- 011_harden_supabase_data_api_down.sql
-- The schema must be empty before it can be removed. Restoring `public` as an
-- exposed Data API schema is a separate Supabase project-setting rollback.

REVOKE USAGE ON SCHEMA api FROM anon, authenticated;
DROP SCHEMA IF EXISTS api;
