# Supabase Security Posture

This application uses Supabase Auth and Storage, but application data is served
through FastAPI's direct PostgreSQL connection. The Supabase Data API exposes
the dedicated, empty `api` schema; `public` is not an exposed schema or extra
search path.

## Security Advisor treatment

| Advisor notice | Treatment | Expected after rollout |
| --- | --- | --- |
| Function search path mutable | Migration 017 recreates all six warned trigger functions with `search_path = ''` and schema-qualified runtime references. | Resolved |
| RLS enabled without policies | Intentional deny-by-default defense in depth. `anon` and `authenticated` have no application-table DML grants, so policies must not be added merely to silence the informational notice. | Accepted informational notices remain |
| PostGIS in `public` | Accepted provider constraint. Production PostGIS is non-relocatable and deeply depended upon; the Data API boundary removes browser exposure without destructive extension relocation. | Accepted warning remains |
| Leaked-password protection disabled | Enable in Supabase Auth settings after confirming the project is on Pro or higher. | Resolved after configuration change |

The accepted notices are not unresolved public-access defects. They describe a
database layout that the advisor cannot infer from the project's external Data
API configuration.

## Migration 017

Migration `017_supabase_security_hardening.sql` changes function definitions
only. Existing triggers remain attached because every function keeps its schema,
name, argument list, return type, owner, and privileges.

The boundary-subdivision trigger discovers PostGIS's installed schema from
`pg_extension` and safely injects the quoted schema into its definition. This
supports both the current `public` installation and newly provisioned databases
that place PostGIS in a dedicated schema.

## Production rollout

1. Merge and deploy the revision containing migration 017.
2. Apply migration 017 to the active project through the Supabase migration
   workflow.
3. Confirm all six functions have `proconfig = {search_path=""}` and execute
   representative timestamp, boundary-ingestion, and publication workflows.
4. In **Authentication → Sign In / Providers → Email**, enable leaked-password
   protection. The feature requires Supabase Pro or higher.
5. Rerun the Supabase Security Advisor.

Expected advisor result:

- no mutable-function-search-path warnings;
- no leaked-password-protection warning;
- RLS-without-policy informational notices remain intentionally;
- the PostGIS-in-public warning remains intentionally.

## Verification queries

```sql
-- Every application-owned trigger function must have a fixed empty search path.
select p.proname, p.proconfig
from pg_catalog.pg_proc as p
join pg_catalog.pg_namespace as n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'update_modified_column',
    'set_updated_at',
    'refresh_boundary_subdivision',
    'drone_guard_published_run_update',
    'drone_guard_published_run_delete',
    'drone_guard_published_cell_results'
  )
order by p.proname;

-- Browser roles must retain no application-table privileges.
select table_name, privilege_type, grantee
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;
```

The second query should return zero rows for application-owned tables. Also
verify in **Data API → Settings** that `api`, not `public`, is the exposed schema
and that `public` is absent from the extra search path.

## Rollback

Migration 017 contains no data mutation and no trigger replacement. If rollback
is required, apply a reviewed follow-up migration restoring the previous
function definitions from migrations 001, 005, 007, and 010. That rollback
reintroduces the mutable-search-path warning, so rolling the application back
does not by itself require rolling this database hardening back.

Do not use `DROP EXTENSION postgis CASCADE` as rollback or warning remediation.
If a zero-warning advisor report becomes a requirement, first take a verified
backup and engage Supabase Support for a provider-assisted PostGIS relocation
plan in a separate maintenance phase.
