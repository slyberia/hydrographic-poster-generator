# Phase C: Sensitivity Analysis — Backend Implementation Plan (Revision 2)

> **Audience**: Claude Code, operating against `https://github.com/slyberia/hydrographic-poster-generator.git`
>
> **Scope**: Backend only — service functions, router endpoints, unit tests. **No frontend changes.**
>
> **Branch**: Create `drone-phase-c-sensitivity` from `drone-b3-osm-features` (tip: `cd72727`).
>
> **Revision 2 (2026-07-18)**: Incorporates the plan-review findings. Changes from
> Revision 1 are listed in §10 and are integrated into the body below. Revision 1's
> "settled" design decisions otherwise stand unchanged.

---

## 0. Orientation

Read these files first:

```
AGENTS.md                                    — governance rules (authority, safety, scope)
CLAUDE.md                                    — project overview, architecture expectations
db/migrations/005_drone_mcda_schema.sql      — MCDA schema: factors, subtypes, grid, runs, results
backend/app/services/drone_service.py        — existing async MCDA engine (create_run, execute_run)
backend/app/routers/drone.py                 — existing REST endpoints
frontend/src/lib/droneApi.ts                 — frontend API client (read for contract awareness)
```

### Key facts
- **Database**: Supabase PostgreSQL + PostGIS. Accessed via `asyncpg` connection pool.
- **Score scale**: 1.0 – 5.0. Zone thresholds: SUITABLE [1.0, 2.5), CONDITIONAL [2.5, 4.0), RESTRICTED [4.0, 5.01). PROHIBITED is constraint-assigned, not score-derived.
- **Weight normalization (corrected)**: The engine renormalizes **per cell, over the
  factors present in that cell** (`tmp_cell_wsum` in `execute_run`), not globally over
  all active weights. Consequences:
  - A cell not touched by the perturbed factor has an **identical score** in that
    child run — deviation and zone flips concentrate exclusively where the perturbed
    factor has spatial coverage.
  - "Perturbing F changes the other factors' normalized shares" holds only within
    cells that contain F.
  This convention must not change.
- **Active factors**: Currently 6 (population, land_use, infrastructure_sensitive, environmental, airspace_activity, regulatory), with equal provisional weights (0.1667 each). But the code must not hardcode 6.
- **Existing `create_run`**: Accepts `weight_overrides: dict` which replaces specific factor raw weights before snapshotting. This is how sensitivity children will be created. Note: `create_run` also writes `params = {"thresholds": [...]}` — see §3h.
- **Existing `execute_run`**: Fully async, runs the complete PostGIS scoring pipeline (~7 seconds for 19,445 cells). Safe to call inside `asyncio.create_task`, subject to the Cloud Run caveat in §3i.

---

## 1. Phase State File

Before any edits, commit this phase state file to `.agents/state/current_phase.json`:

```json
{
  "schema_version": 1,
  "phase_id": "drone-phase-c-sensitivity",
  "phase_name": "Drone Phase C: Validation & Sensitivity Analysis (Backend)",
  "status": "approved",
  "approved_by_human": true,
  "baseline_commit": "<HEAD of drone-phase-c-sensitivity after branch creation>",
  "branch": "drone-phase-c-sensitivity",
  "protected_branches": [],
  "allowed_paths": [
    "backend/app/services/drone_service.py",
    "backend/app/routers/drone.py",
    "backend/tests/test_drone_sensitivity.py",
    ".agents/state/current_phase.json",
    ".agents/config/verification_commands_drone_c.json"
  ],
  "excluded_paths": [
    "frontend/**",
    "scripts/ingest_drone_data.py",
    "db/migrations/**"
  ],
  "approved_operations": [
    "sensitivity_service_functions",
    "router_endpoint_additions",
    "unit_test_creation"
  ],
  "prohibited_operations": [
    "database_schema_changes",
    "frontend_modifications",
    "deployment_changes"
  ],
  "verification_commands_file": ".agents/config/verification_commands_drone_c.json",
  "approved_baseline_file": ".agents/state/baselines/drone-phase-c-sensitivity/baseline_approved.json"
}
```

---

## 2. Verification Commands File

Create `.agents/config/verification_commands_drone_c.json`:

```json
{
  "schema_version": 1,
  "commands": [
    {
      "name": "sensitivity_unit_tests",
      "command": ["python", "-m", "pytest", "backend/tests/test_drone_sensitivity.py", "-v"],
      "cwd": ".",
      "enabled": true
    },
    {
      "name": "existing_drone_tests",
      "command": ["python", "-m", "pytest", "backend/tests/test_feature_ingestion.py", "backend/tests/test_grid_generation.py", "-v"],
      "cwd": ".",
      "enabled": true
    }
  ],
  "note": "Phase C: Sensitivity sweep triggering, volatility statistics, idempotency, and failure handling."
}
```

---

## 3. Design Decisions (settled — do not deviate)

### 3a. Sweep Identity

Every sensitivity sweep gets a `sweep_id` (UUID). It is stored in each child run's `params` JSONB alongside `parent_run_id`. **All aggregation queries must be scoped to `sweep_id`**, not `parent_run_id` alone. This prevents a second sweep from corrupting the first sweep's statistics.

### 3b. OAT Perturbation Convention

- Perturb one factor's **raw weight** by `±delta` (default 10%) at a time.
- The engine's existing **per-cell** renormalization (over factors present in the cell)
  applies to the perturbed snapshot — see the corrected Key Facts above.
- Cells without spatial coverage of the perturbed factor are unaffected; within
  covered cells, the perturbation shifts every present factor's normalized share.
  This is the intended attribution semantics for this engine.
- The score scale (1–5) and zone thresholds are unchanged across all perturbation runs.
- This must be documented in a docstring on `trigger_sensitivity_analysis`.

### 3c. Zone Flip Definition (SINGLE definition, used everywhere)

A "zone flip" for a given cell is:

> A child run (within the current sweep) whose `final_zone` differs from the baseline run's `final_zone` for that same `h3_index`.

SQL fragment: `SUM(CASE WHEN c.final_zone != base.final_zone THEN 1 ELSE 0 END)`.

This is used in **both** the factor ranking query and the per-cell volatility query. Maximum possible flips per cell = `2 × N_active_factors`.

### 3d. Children-Only Aggregation — POPULATION statistics

STDDEV, VARIANCE, and zone flips are computed over **child runs only**. The baseline is joined as a reference row but is **not** a member of the perturbation set. Including the baseline biases stddev toward zero.

**Use `STDDEV_POP` and `VAR_POP`, never bare `STDDEV`/`VARIANCE`.** Postgres's
`STDDEV` is an alias for `STDDEV_SAMP` (sample stddev). An OAT sweep is the *entire
population* of perturbations, not a sample drawn from one, so population statistics
are correct — and the volatility thresholds in §3f and the expectation in test #3
(§6) are calibrated against population stddev. Sample stddev runs ~5–25% higher at
these run counts and would silently shift cells across category boundaries.

### 3e. Dynamic Factor Count

The number of child runs is `2 × N_active_factors`, derived from `SELECT COUNT(*) FROM mcda_factors WHERE is_active` at trigger time. `total_expected` is stored in each child's params. Nothing is hardcoded to 12.

### 3f. Volatility Categories (backend-owned)

Thresholds are defined and applied **only in backend SQL**. The frontend will color by the string label. Thresholds are calibrated against **population stddev** (§3d).

| Category | stddev range | Rationale |
|---|---|---|
| `LOW` | < 0.15 | < 10% of minimum inter-zone gap (1.5 units) |
| `MEDIUM` | 0.15 to < 0.40 | 10–27% of gap — noticeable instability |
| `HIGH` | ≥ 0.40 | > 27% of gap — cell may cross zone boundary |

### 3g. List Runs Filtering

`list_runs()` must exclude sensitivity child runs from the sidebar. Filter: `WHERE (params->>'parent_run_id') IS NULL`. (Note: `create_run` always writes a non-null `params`, so an `OR params IS NULL` clause is unnecessary; keeping the filter to the one meaningful condition.)

### 3h. Child params update is a MERGE, never a replace

`create_run` writes `params = {"thresholds": [...]}` on every run; per the schema
comments, this snapshot is what keeps past runs reproducible after zone thresholds
are later edited. The sensitivity metadata added to each child MUST therefore be
merged into the existing JSONB, never assigned over it:

```sql
UPDATE mcda_model_runs
SET params = COALESCE(params, '{}'::jsonb) || $2::jsonb
WHERE run_id = $1::uuid
```

A plain `SET params = $2::jsonb` destroys the thresholds snapshot and is a
reproducibility regression. Test #9 (§6) guards this.

### 3i. NULL `total_score` handling

`total_score` is NULL for constraint-locked cells and for cells with no factor hits
(see `mcda_cell_results` schema comment). Constraints ignore weights, so these cells
are NULL in the baseline **and** every child. Left unfiltered, `STDDEV_POP(NULL…)`
returns NULL, the volatility `CASE` falls through to `ELSE 'HIGH'` (the most
alarming category for the most immovable cells), and the non-optional
`VolatilityRecord.stddev: float` raises a validation error.

Therefore both aggregation queries MUST exclude NULL scores:
`AND c.total_score IS NOT NULL AND base.total_score IS NOT NULL`.

This correctly drops constraint-locked cells from volatility output — their zone is
weight-independent and cannot flip by definition. Test #10 (§6) guards this.

### 3j. Known production caveat: background execution on Cloud Run

A sweep is roughly `2 × N_factors × 7s` (~85 s at 6 factors) of work running *after*
the 202 response returns. On Cloud Run with default request-based CPU allocation,
CPU is throttled to near zero between requests, so an `asyncio.create_task`
background sweep can stall or die mid-flight in production while working perfectly
in local development. The staleness rule (§4) cleans up stalled children, but does
not make them complete.

**This phase intentionally makes no deployment changes.** Deploying this feature to
Cloud Run requires one of: (a) CPU always-allocated on the backend service, (b) a
Cloud Run job / task queue for sweep execution, or (c) executing pending children
inside the status-poll request path. Record this in the phase completion report; do
not silently absorb it.

---

## 4. Implementation — `drone_service.py`

### Add these functions:

#### `trigger_sensitivity_analysis(pool, base_run_id, delta=0.10, label=None)`

```python
"""
Trigger a one-at-a-time (OAT) weight perturbation sweep.

Perturbation convention:
  - Each active factor's raw weight is perturbed by ±delta one at a time.
  - The engine renormalizes weights PER CELL over the factors present in that cell
    (tmp_cell_wsum in execute_run). Cells without coverage of the perturbed factor
    are unaffected; within covered cells, the perturbation shifts every present
    factor's normalized share.
  - Score scale (1–5) and zone thresholds are unchanged.
  - Attribution (MAD, zone flips) therefore reflects the combined normalized-share
    effect within the perturbed factor's spatial footprint — not a global
    ceteris-paribus effect. This is the intended OAT semantics for this engine.
"""
```

Logic:
1. Validate base run exists and `status == 'complete'`.
2. **Idempotency guard**: Query for active sweep children (`params->>'parent_run_id' = base_run_id` AND `status IN ('pending', 'running')`). If found, return existing sweep status. (Known limitation: this is check-then-act without a lock; two simultaneous triggers can both pass. Acceptable for a single-analyst tool — do not add advisory locking in this phase.)
3. Query active factors: `SELECT factor_key, weight FROM mcda_factors WHERE is_active ORDER BY factor_key`.
4. Generate `sweep_id = str(uuid.uuid4())`.
5. Get `region_key` from the base run's `region_id`.
6. For each factor, create two child runs using the existing `create_run(pool, region_key, label, weight_overrides)`:
   - `+delta`: `{factor_key: base_weight * (1 + delta)}`
   - `-delta`: `{factor_key: base_weight * (1 - delta)}`
   - After each `create_run`, **merge** (per §3h) into the child's `params`:
     ```json
     {"parent_run_id": "...", "sweep_id": "...", "sensitivity_factor": "...",
      "sensitivity_delta": 0.10, "sensitivity_direction": "up|down",
      "total_expected": 12}
     ```
7. Launch `asyncio.create_task(_execute_sweep(pool, child_run_ids))`. (See §3j for the Cloud Run caveat — behavior is correct locally; production deployment has a known prerequisite.)
8. Return `SensitivityStatus` with `status="running"`.

#### `_execute_sweep(pool, run_ids)`

Sequential execution with per-child error isolation:

```python
async def _execute_sweep(pool: asyncpg.Pool, run_ids: list[str]) -> None:
    for run_id in run_ids:
        try:
            await execute_run(pool, run_id)
        except Exception as exc:
            logger.error("Sensitivity child %s failed: %s", run_id, exc)
            async with pool.acquire() as conn:
                await conn.execute(
                    "UPDATE mcda_model_runs SET status='failed' WHERE run_id=$1::uuid",
                    run_id,
                )
```

#### `get_sensitivity_status(pool, base_run_id, sweep_id)`

1. Query children: `SELECT run_id, status, created_at, completed_at FROM mcda_model_runs WHERE params->>'sweep_id' = $sweep_id`.
2. **Staleness rule**: Mark any child as `'failed'` if `status IN ('pending', 'running')` AND `created_at < now() - interval '15 minutes'`. (Yes, this GET performs a write; that is deliberate — without it, a crashed child blocks the idempotency guard forever.)
3. Derive overall status:
   - All complete → `"complete"`
   - Any failed, none pending/running → `"failed"`
   - Any pending/running → `"running"`
4. If `completed_runs > 0`, compute factor rankings over completed children only:

```sql
SELECT
    m.params ->> 'sensitivity_factor'   AS factor_key,
    m.params ->> 'sensitivity_direction' AS direction,
    AVG(ABS(r.total_score - base.total_score))   AS mean_absolute_deviation,
    SUM(CASE WHEN r.final_zone != base.final_zone THEN 1 ELSE 0 END) AS zone_flips
FROM mcda_cell_results r
JOIN mcda_cell_results base
    ON base.h3_index = r.h3_index AND base.run_id = $1::uuid
JOIN mcda_model_runs m ON m.run_id = r.run_id
WHERE m.params ->> 'sweep_id' = $2
  AND m.status = 'complete'
  AND r.total_score IS NOT NULL
  AND base.total_score IS NOT NULL
GROUP BY factor_key, direction
ORDER BY zone_flips DESC, mean_absolute_deviation DESC
```

5. Compute global summary: `avg_stddev`, `max_stddev`, `total_zone_flips`, `pct_cells_flipped` (distinct cells with ≥1 flip / total cells). All stddev/variance aggregates use `STDDEV_POP`/`VAR_POP` (§3d).
6. Flag `partial_results: true` if not all children are complete.

#### `get_volatility_data(pool, base_run_id, sweep_id)` → List[dict]

Returns a thin list (no geometry). Returns whatever completed children exist —
partial sweeps yield partial (but internally consistent) volatility data, and
`partial_results` on the status endpoint tells the client so.

```sql
SELECT
    c.h3_index,
    ROUND(STDDEV_POP(c.total_score)::numeric, 4)   AS stddev,
    ROUND(VAR_POP(c.total_score)::numeric, 4)      AS variance,
    SUM(CASE WHEN c.final_zone != base.final_zone THEN 1 ELSE 0 END) AS zone_flips,
    base.final_zone::text       AS baseline_zone,
    base.total_score            AS baseline_score,
    CASE
        WHEN STDDEV_POP(c.total_score) < 0.15 THEN 'LOW'
        WHEN STDDEV_POP(c.total_score) < 0.40 THEN 'MEDIUM'
        ELSE 'HIGH'
    END AS volatility_category
FROM mcda_cell_results c
JOIN mcda_cell_results base
    ON base.h3_index = c.h3_index AND base.run_id = $1::uuid
JOIN mcda_model_runs m ON m.run_id = c.run_id
WHERE m.params ->> 'sweep_id' = $2
  AND m.status = 'complete'
  AND c.total_score IS NOT NULL
  AND base.total_score IS NOT NULL
GROUP BY c.h3_index, base.final_zone, base.total_score
```

#### Modify: `list_runs(pool)`

Exclude sensitivity children:

```sql
SELECT run_id::text, label, status, weights_snapshot,
       created_at::text, completed_at::text
FROM mcda_model_runs
WHERE (params->>'parent_run_id') IS NULL
ORDER BY created_at DESC
```

---

## 5. Implementation — `drone.py`

### Add Pydantic models

```python
from pydantic import BaseModel, Field
from typing import Literal, Optional, List

class SensitivityTriggerRequest(BaseModel):
    delta: float = Field(0.10, ge=0.01, le=0.50,
        description="Fractional perturbation (e.g. 0.10 = ±10%)")
    label: Optional[str] = None

class SensitivityFactorRank(BaseModel):
    factor_key: str
    direction: Literal["up", "down"]
    mean_absolute_deviation: float
    zone_flips: int

class SensitivitySummary(BaseModel):
    avg_stddev: float
    max_stddev: float
    total_zone_flips: int
    pct_cells_flipped: float
    factor_rankings: List[SensitivityFactorRank]

class SensitivityStatus(BaseModel):
    sweep_id: str
    status: Literal["running", "complete", "failed"]
    total_runs: int
    completed_runs: int
    failed_runs: int
    partial_results: bool
    summary: Optional[SensitivitySummary] = None

class VolatilityRecord(BaseModel):
    h3_index: str
    stddev: float
    variance: float
    zone_flips: int
    volatility_category: Literal["LOW", "MEDIUM", "HIGH"]
    baseline_zone: str
    baseline_score: Optional[float]
```

(Revision 2: dropped `"partial"` from the `status` Literal — the derivation rules in
§4 never produce it; partial completion is expressed by `partial_results` +
`completed_runs`.)

### Add endpoints

```python
@router.post("/runs/{run_id}/sensitivity", tags=["Drone Sensitivity"], status_code=202)
async def trigger_sensitivity(
    run_id: str,
    body: SensitivityTriggerRequest,
    pool: asyncpg.Pool = Depends(get_db_pool),
):
    """Trigger OAT weight perturbation sweep. Idempotent: returns existing active sweep."""
    ...

@router.get("/runs/{run_id}/sensitivity/{sweep_id}", tags=["Drone Sensitivity"])
async def get_sensitivity_status(
    run_id: str,
    sweep_id: str,
    pool: asyncpg.Pool = Depends(get_db_pool),
):
    """Poll sweep progress and factor rankings (partial results OK)."""
    ...

@router.get("/runs/{run_id}/sensitivity/{sweep_id}/volatility", tags=["Drone Sensitivity"])
async def get_volatility(
    run_id: str,
    sweep_id: str,
    pool: asyncpg.Pool = Depends(get_db_pool),
):
    """Per-cell volatility (thin payload, no geometry). Partial sweeps return partial data."""
    ...
```

---

## 6. Tests — `backend/tests/test_drone_sensitivity.py`

These tests validate the contested semantics. They run against mocked data, not a live database. Use `monkeypatch` and `asyncio` fixtures.

### Required tests

1. **`test_sweep_id_scoping`**: Create two sweeps. Assert querying sweep_1's `sweep_id` returns only sweep_1's children.

2. **`test_flip_definition_consistent`**: Construct a scenario where a cell flips zone in exactly 2 child runs. Assert both the factor-ranking query and the per-cell volatility query return `zone_flips = 2` for that cell.

3. **`test_children_only_stddev`**: Compute stddev for 3 children with scores [2.0, 2.5, 3.0]. Assert the result matches `statistics.pstdev([2.0, 2.5, 3.0])` (population stddev ≈ 0.4082) — **not** the sample stddev (0.5), and **not** the value you'd get if the baseline (e.g. 2.3) were included. This pins the `STDDEV_POP` requirement from §3d.

4. **`test_idempotent_trigger`**: Mock the *dependencies* of `trigger_sensitivity_analysis` (`create_run`, the child-status query) so that an active sweep appears to exist. Assert a second call returns the same `sweep_id` and `create_run` is never invoked.

5. **`test_staleness_marks_failed`**: Create a child run with `status='pending'` and `created_at = now() - 20 minutes`. Call `get_sensitivity_status`. Assert the child is now marked `'failed'` and the overall status reflects it.

6. **`test_dynamic_factor_count`**: Mock 4 active factors instead of 6. Assert the sweep creates exactly `2 × 4 = 8` child runs, and `total_expected` in params equals 8.

7. **`test_list_runs_excludes_children`**: Create a parent run and sensitivity children. Call `list_runs`. Assert children are not returned.

8. **`test_volatility_categories`**: Assert that population-stddev values of 0.05, 0.25, 0.50 produce `LOW`, `MEDIUM`, `HIGH` respectively.

9. **`test_params_merge_preserves_thresholds`**: Create a child whose `params` already contains `{"thresholds": [...]}`. Apply the sensitivity-metadata update. Assert the resulting `params` contains **both** the thresholds snapshot and the sensitivity keys (§3h).

10. **`test_null_scores_excluded`**: Include a constraint-locked cell (`total_score = NULL` in baseline and all children) in the mocked data. Assert it appears in **neither** the volatility output nor the factor rankings, and that no `HIGH` category or validation error is produced for it (§3i).

---

## 7. What NOT to do

- **No frontend changes.** The frontend integration (droneApi.ts, ControlRail.tsx, MapView.tsx, ReportDrawer.tsx) will be done separately.
- **No database migrations.** The existing schema supports everything via `params` JSONB.
- **No deployment changes.** No Dockerfile, Cloud Run, or environment variable modifications. (But report the §3j Cloud Run prerequisite in the phase completion notes.)
- **Do not hardcode `12` or `6` anywhere.** Always derive from the active factor count at trigger time.
- **Do not include the baseline run in STDDEV/VARIANCE aggregations.** Children only.
- **Do not use bare `STDDEV`/`VARIANCE` in SQL.** `STDDEV_POP`/`VAR_POP` only (§3d).
- **Do not replace child `params` wholesale.** Merge only (§3h).
- **Do not duplicate volatility thresholds.** They exist only in the backend SQL `CASE` statement.
- **Do not add a JSONB index on `params`.** `mcda_model_runs` holds tens of rows; the `params->>'sweep_id'` filters are fine unindexed.

---

## 8. Commit Convention

Use this commit message format:

```
Phase C (backend): <concise description>

- <bullet summary of changes>
```

Push to `drone-phase-c-sensitivity`. Do not merge into `main` or `drone-b3-osm-features`.

---

## 9. Verification

After implementation, run:

```bash
python -m pytest backend/tests/test_drone_sensitivity.py -v
python -m pytest backend/tests/test_feature_ingestion.py backend/tests/test_grid_generation.py -v
```

Both must pass. Report results.

---

## 10. Revision 2 Change Log

Findings from the plan review (2026-07-18), verified against `drone_service.py` and
`db/migrations/005_drone_mcda_schema.sql`:

1. **`STDDEV` → `STDDEV_POP` / `VAR_POP`** (§3d, §4, tests #3/#8). Postgres `STDDEV`
   is sample stddev; the plan's own test #3 expected population stddev, so Revision 1
   was internally inconsistent and would have failed its own acceptance test.
2. **Child `params` update is now an explicit JSONB merge** (§3h, test #9).
   `create_run` stores the thresholds snapshot in `params`; a replace-style UPDATE
   would have silently destroyed run reproducibility.
3. **Renormalization description corrected to per-cell** (Key facts, §3b, docstring).
   The engine renormalizes over factors present in each cell, not globally; Revision
   1's stated convention described a different engine.
4. **NULL `total_score` exclusion added** (§3i, both queries, test #10).
   Constraint-locked cells would otherwise be categorized `HIGH` and crash the
   non-optional `VolatilityRecord.stddev` field.
5. **Cloud Run background-task caveat documented** (§3j). Request-based CPU
   allocation can starve the post-202 sweep in production.
6. Minor: dropped the never-produced `"partial"` status literal; volatility endpoint
   docstring now matches its partial-data behavior; test #4 reworded to mock
   dependencies rather than the function under test; idempotency-guard race
   acknowledged as accepted; dead `OR params IS NULL` clause removed from the
   `list_runs` filter.

### Out-of-scope observation (for the repo owner, not this phase)

The drone MCDA subsystem lives in a repository whose `CLAUDE.md` scopes the project
to the hydrographic poster generator and prohibits unrelated feature growth. Either
the drone work should move to its own repository or `CLAUDE.md` should be amended to
acknowledge the second product. That decision is deliberately **not** made here.
