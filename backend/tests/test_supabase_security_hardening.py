from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
MIGRATION = ROOT / "db" / "migrations" / "017_supabase_security_hardening.sql"

WARNED_FUNCTIONS = {
    "update_modified_column",
    "set_updated_at",
    "refresh_boundary_subdivision",
    "drone_guard_published_run_update",
    "drone_guard_published_run_delete",
    "drone_guard_published_cell_results",
}


def migration_sql() -> str:
    return MIGRATION.read_text(encoding="utf-8")


def test_all_warned_functions_receive_empty_search_paths():
    sql = migration_sql()

    for function_name in WARNED_FUNCTIONS:
        assert f"FUNCTION public.{function_name}()" in sql

    assert sql.count("SET search_path = ''") == len(WARNED_FUNCTIONS)


def test_runtime_database_references_are_schema_qualified():
    sql = migration_sql()

    assert sql.count("pg_catalog.now()") == 2
    assert "FROM public.mcda_model_runs" in sql
    assert "DELETE FROM public.admin_boundaries_subdivided" in sql
    assert "INSERT INTO public.admin_boundaries_subdivided" in sql

    # The migration discovers the installed PostGIS namespace, safely quotes
    # it with format(%I), and injects it into each spatial function reference.
    assert "JOIN pg_catalog.pg_namespace" in sql
    assert "%1$I.ST_IsValid" in sql
    assert "%1$I.ST_MakeValid" in sql
    assert "%1$I.ST_Subdivide" in sql


def test_hardening_does_not_weaken_rls_or_relocate_postgis():
    sql = migration_sql().upper()

    prohibited_statements = (
        "CREATE POLICY",
        "DISABLE ROW LEVEL SECURITY",
        "DROP EXTENSION",
        "ALTER EXTENSION",
        "GRANT SELECT",
        "GRANT INSERT",
        "GRANT UPDATE",
        "GRANT DELETE",
    )
    for statement in prohibited_statements:
        assert statement not in sql
