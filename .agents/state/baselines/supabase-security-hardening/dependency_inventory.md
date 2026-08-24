# Dependency Inventory

## Trigger functions

- `public.update_modified_column`: producer for `hydro_rivers` and `admin_boundaries` update timestamps.
- `public.set_updated_at`: producer for MCDA configuration and study-area update timestamps.
- `public.refresh_boundary_subdivision`: producer for repaired and subdivided boundary geometry; consumes PostGIS functions and `public.admin_boundaries_subdivided`.
- `public.drone_guard_published_run_update`: producer for published-run immutability.
- `public.drone_guard_published_run_delete`: producer for published-run deletion protection.
- `public.drone_guard_published_cell_results`: producer for published-cell immutability; consumes `public.mcda_model_runs`.

## Access model

- Migrations 009 and 011 are the authoritative producers for the deny-by-default Data API boundary.
- `db/README.md`, deployment documentation, and Track A documentation are consumers of that contract.
- `anon` and `authenticated` have no table DML privileges on the 27 RLS-enabled application tables in production.
- FastAPI's direct PostgreSQL connection and the server-side service path remain the application data consumers.

## PostGIS

- PostGIS types and functions are consumed across the hydrographic and drone schemas, ingestion scripts, repositories, and model services.
- Production PostGIS 3.3.7 is non-relocatable and owns 876 dependent objects.
- Relocation is excluded because it would require a separate backup/restore maintenance plan or provider support.

## Supabase Auth

- The Planning Console login consumes password authentication.
- The invitation acceptance page consumes password updates and already surfaces Supabase Auth errors.
- Leaked-password protection is a project-level Auth configuration and requires no frontend contract change.
