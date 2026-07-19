# Database Disk-I/O Optimization

Supabase small compute tiers meter disk I/O against a burstable budget.
Live `pg_stat_statements` analysis (2026-07-19) ranked this app's I/O
consumers:

1. **The river clip query** — top total runtime and ~81 MB of temp-file
   spill across 44 calls; re-executed on every preview/export even when only
   palette/typography changed.
2. **Sensitivity sweeps** — each sweep re-runs the full spatial pipeline for
   every child (2 × N_factors) and permanently writes child results:
   `mcda_cell_results` measured at exactly 13 × grid size after one sweep.
3. **Status polling** — factor-ranking self-joins over all child results on
   every poll.

## Implemented (R1, R2, R5)

### R1 — In-process clip/boundary caches

`app/services/spatial_cache.py`: small LRU caches (no TTL — spatial data
changes only via imports).

- Clip cache key is `(geography_id, min_stream_order)` — the only inputs the
  SQL depends on. Classification maps are applied per-request downstream, so
  rules edits that keep the same min order never serve stale data.
- `POST /admin/reload-rules` clears both caches (manual flush after imports).
- Sizes via `CLIP_CACHE_SIZE` (default 8) and `BOUNDARY_CACHE_SIZE`
  (default 64); clip entries can be large, keep the default modest.

### R2 — Cheaper clip query (migration `007_spatial_io_optimization.sql`)

- **Geometry validity moved to rest**: one-time `ST_MakeValid` repair of
  `hydro_rivers` / `admin_boundaries`, maintained by a trigger on boundary
  writes — the hot query no longer repairs per row per request.
- **Subdivided boundary tiles**: `admin_boundaries_subdivided` holds
  `ST_Subdivide(geom, 256)` tiles per boundary (GIST-indexed, refreshed by
  the same trigger on every import path). The clip query joins rivers to
  tiles, skips `ST_Intersection` for rivers fully inside a tile
  (`ST_CoveredBy`), and re-merges pieces with
  `ST_CollectionExtract(ST_Union(...), 2)`.
- **`SET LOCAL work_mem = '64MB'`** for the clip transaction, eliminating
  the temp-file spills observed in `pg_stat_statements`.
- If migration 007 has not been applied (missing table or unpopulated
  boundary), the repository logs a warning and falls back to the legacy
  whole-polygon query — apply the migration to get the fast path.

### R5 — Cheap sweep polls

`get_sensitivity_status` computes the factor-ranking/summary aggregations
only when no children are active (terminal state). In-flight polls are pure
status counts. The frontend already renders `summary: null` while running.

### R3 + R4 — Sweep restructure (migration `008_sweep_aggregates.sql`)

A sensitivity sweep now runs on **one connection inside one transaction**
(`_execute_sweep`):

- The weight-independent spatial passes (`tmp_prepared`, constraint/factor
  hits, per-cell-per-factor scores) are built **once** and shared by every
  child; each child re-runs only the weighted aggregation. Previously all
  2 × N_factors children rebuilt identical temp tables and GIST indexes.
- Children score into a transaction-local temp table and **never write to
  `mcda_cell_results`** (which previously grew ~12 × grid rows per sweep,
  permanently). Only sweep-level aggregates are persisted:
  `mcda_sweep_summary` (one row) and `mcda_sweep_volatility` (one row per
  scored cell).
- The single transaction is also required for correctness behind PgBouncer
  transaction pooling, where temp tables don't survive across transactions.
- Failure handling is all-or-nothing: any error rolls back the whole sweep
  and marks all children failed (child failures are systemic here — the
  children share the same spatial inputs).
- Read paths prefer the persisted aggregates; sweeps executed before
  migration 008 fall back to aggregating their retained child results.
  Migration 008 backfills aggregates for existing complete sweeps and then
  deletes their child cell results.
- Behavior change: in-flight sweeps no longer expose partial volatility
  (children don't write cell results), and progress counters jump to
  complete when the sweep transaction commits. With the shared spatial pass
  the whole sweep takes seconds, so incremental progress had no remaining
  UX value.

## Security hardening shipped alongside (audit findings D1/D2)

- `/admin/*` requires `X-Admin-Key` matching the `ADMIN_API_KEY` env var
  (Secret Manager-backed in `cloudbuild.yaml`); deny-all when unset.
- `/debug/*` is only mounted when `ENABLE_DEBUG_ENDPOINTS` is truthy —
  off in production, on in `docker-compose.yml` and tests.

## Operational notes

- Apply pending migrations in order (003, 004, 007, 008) to the active
  Supabase project; the Cloud Run audit found 003/004 missing in deployed
  environments. Apply 003/004 only after the D1 admin-auth fix is deployed —
  003 makes the previously-broken `/admin/reload-rules` functional.
- If I/O warnings persist after these changes, a compute upgrade raises both
  the I/O budget and cache RAM — but check the post-fix Reports → Database
  graphs first.
