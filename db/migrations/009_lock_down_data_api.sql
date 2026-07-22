-- 009_lock_down_data_api.sql
-- Application data is served through FastAPI's direct PostgreSQL connection.
-- The Supabase Data API is not an application data path, so browser roles must
-- not receive implicit access to tables in the exposed public schema.

-- Remove existing Data API privileges. Supabase Auth continues to operate in
-- its own schemas; these grants only affect public tables, views, and sequences.
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public
    FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public
    FROM anon, authenticated;

-- Prevent future migrations run by the application database owner from
-- silently granting new public-schema objects to browser roles.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE ALL PRIVILEGES ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE ALL PRIVILEGES ON SEQUENCES FROM anon, authenticated;

-- RLS is defense in depth for every application-owned table in Supabase's
-- exposed public schema. No policies are intentional: browser roles have no
-- direct data access. The table owner used by FastAPI is not affected.
DO $$
DECLARE
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY ARRAY[
        'admin_boundaries',
        'admin_boundaries_subdivided',
        'export_log',
        'hydro_rivers',
        'mcda_cell_results',
        'mcda_factors',
        'mcda_feature_rules',
        'mcda_features',
        'mcda_grid',
        'mcda_ingestion_runs',
        'mcda_layers',
        'mcda_model_runs',
        'mcda_region_boundary',
        'mcda_source_provenance',
        'mcda_subtypes',
        'mcda_sweep_summary',
        'mcda_sweep_volatility',
        'mcda_zone_thresholds',
        'platform_rules',
        'staging_features',
        'staging_grid',
        'staging_region_boundary'
    ]
    LOOP
        IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
            EXECUTE format(
                'ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',
                table_name
            );
        END IF;
    END LOOP;
END
$$;

-- PostgreSQL views use the owner's permissions by default. Keep this internal
-- diagnostic view aligned with caller permissions if access is explicitly
-- granted in a future migration.
ALTER VIEW IF EXISTS public.mcda_weight_check
    SET (security_invoker = true);
