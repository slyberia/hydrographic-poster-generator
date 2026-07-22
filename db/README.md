# Database

Supabase PostgreSQL with PostGIS enabled.

**Responsibilities:**
- Stores `hydro_rivers` and `admin_boundaries` spatial data
- Executes dynamic clipping queries

**Access model:**
- FastAPI connects directly to PostgreSQL using the server-side `DATABASE_URL`.
- Browser roles have no direct access to application tables through the
  Supabase Data API.
- Application tables in the exposed `public` schema have RLS enabled without
  browser policies. Any future public or authenticated Data API access must be
  added explicitly with least-privilege grants and matching RLS policies.

*Note: Database connection config must be environment-driven (e.g., DATABASE_URL).*
