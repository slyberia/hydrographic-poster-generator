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

## Planned (R3, R4) — not yet implemented

- **R3**: persist weight-independent per-cell-per-factor scores once per
  sweep, then run the 2 × N children as pure re-aggregations (no
  `ST_Buffer`/`ST_Intersects`/temp GIST builds — ~12× less sweep I/O).
- **R4**: after a sweep completes, persist volatility/summary aggregates and
  delete the child runs (`ON DELETE CASCADE` from `mcda_model_runs`), so the
  largest hot table stops growing by ~12 × grid rows per sweep.

## Operational notes

- Apply pending migrations in order (003, 004, 007) to the active Supabase
  project; the Cloud Run audit found 003/004 missing in deployed
  environments.
- If I/O warnings persist after these changes, a compute upgrade raises both
  the I/O budget and cache RAM — but check the post-fix Reports → Database
  graphs first.
