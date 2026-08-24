-- 017_supabase_security_hardening.sql
-- Pin every application-owned trigger function flagged by the Supabase
-- Security Advisor to an empty search path. All runtime object references are
-- schema-qualified so caller-controlled search paths cannot redirect them.
--
-- This migration intentionally does not create RLS policies or move PostGIS.
-- Browser roles are denied direct table access by migrations 009/011, and
-- PostGIS relocation is a separate provider-assisted maintenance operation.

CREATE OR REPLACE FUNCTION public.update_modified_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
    NEW.updated_at = pg_catalog.now();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
    NEW.updated_at = pg_catalog.now();
    RETURN NEW;
END;
$function$;

-- PostGIS may be installed in public (the current production layout) or in a
-- dedicated schema on a newly provisioned database. Generate this one function
-- with the installed extension's actual, safely quoted schema name so the
-- function remains portable while retaining search_path = ''.
DO $migration$
DECLARE
    postgis_schema name;
BEGIN
    SELECT namespace.nspname
      INTO postgis_schema
      FROM pg_catalog.pg_extension AS ext
      JOIN pg_catalog.pg_namespace AS namespace
        ON namespace.oid = ext.extnamespace
     WHERE ext.extname = 'postgis';

    IF postgis_schema IS NULL THEN
        RAISE EXCEPTION 'PostGIS must be installed before migration 017';
    END IF;

    EXECUTE pg_catalog.format($ddl$
CREATE OR REPLACE FUNCTION public.refresh_boundary_subdivision()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
    IF NOT %1$I.ST_IsValid(NEW.geom) THEN
        NEW.geom := %1$I.ST_MakeValid(NEW.geom);
    END IF;
    DELETE FROM public.admin_boundaries_subdivided
     WHERE boundary_id = NEW.id;
    INSERT INTO public.admin_boundaries_subdivided (boundary_id, geom)
    SELECT NEW.id, %1$I.ST_Subdivide(NEW.geom, 256);
    RETURN NEW;
END;
$function$;
$ddl$, postgis_schema);
END;
$migration$;

CREATE OR REPLACE FUNCTION public.drone_guard_published_run_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
    IF OLD.lifecycle_state = 'published' THEN
        IF ROW(NEW.region_id, NEW.h3_resolution, NEW.weights_snapshot,
               NEW.params, NEW.label, NEW.status, NEW.created_by, NEW.created_at)
           IS DISTINCT FROM
           ROW(OLD.region_id, OLD.h3_resolution, OLD.weights_snapshot,
               OLD.params, OLD.label, OLD.status, OLD.created_by, OLD.created_at)
        THEN
            RAISE EXCEPTION
                'Published run % is immutable; its content cannot be modified.',
                OLD.run_id USING ERRCODE = 'check_violation';
        END IF;
        IF NEW.lifecycle_state NOT IN ('published', 'archived') THEN
            RAISE EXCEPTION
                'Published run % may only transition to archived (attempted %).',
                OLD.run_id, NEW.lifecycle_state USING ERRCODE = 'check_violation';
        END IF;
    END IF;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.drone_guard_published_run_delete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
    IF OLD.lifecycle_state = 'published' THEN
        RAISE EXCEPTION
            'Published run % cannot be deleted; archive it first.',
            OLD.run_id USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;
END;
$function$;

CREATE OR REPLACE FUNCTION public.drone_guard_published_cell_results()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
DECLARE
    target_run pg_catalog.uuid := COALESCE(NEW.run_id, OLD.run_id);
BEGIN
    IF (SELECT lifecycle_state
          FROM public.mcda_model_runs
         WHERE run_id = target_run) = 'published'
    THEN
        RAISE EXCEPTION
            'Cell results for published run % are immutable.', target_run
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$function$;
