# Database

Supabase PostgreSQL with PostGIS enabled.

**Responsibilities:**
- Stores `hydro_rivers` and `admin_boundaries` spatial data
- Executes dynamic clipping queries

**Access model:**
- FastAPI connects directly to PostgreSQL using the server-side `DATABASE_URL`.
- Browser roles have no direct access to application tables through the
  Supabase Data API.
- Supabase Auth remains available to the frontend, but the Data API exposes the
  dedicated, empty `api` schema instead of `public`.
- In **Data API > Settings**, `public` must remain excluded from Exposed schemas
  and Extra search path. The expected state is zero exposed application tables
  and zero exposed `public` functions.
- Migration `011_harden_supabase_data_api.sql` creates the `api` schema and
  grants schema usage. Supabase's exposed-schema selection is project
  configuration and must be verified separately after provisioning or restore.
- Any future public or authenticated Data API object must be added to `api`
  explicitly with least-privilege grants and matching RLS policies.
- The intentional RLS, function-search-path, PostGIS, and Auth advisor
  treatments are documented in `docs/SUPABASE_SECURITY.md`.

*Note: Database connection config must be environment-driven (e.g., DATABASE_URL).*
