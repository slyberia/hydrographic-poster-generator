# Deployment Closeout Plan

Execution plan for closing out the Cloud Run audit findings and the disk-I/O
optimization rollout. Written to be executed by an operator or agent session
with `gcloud` access to the GCP project and SQL access to the active Supabase
project. Each step has a **gate** — do not start a step until the previous
step's gate passes, and report any gate failure using the findings rubric in
`docs/CLOUD_RUN_AUDIT.md` §6 instead of improvising a fix.

## Context (read first)

- PR **#17** on `slyberia/hydrographic-poster-generator` contains: the R1–R5
  disk-I/O optimizations (`docs/DB_IO_OPTIMIZATION.md`), admin-key auth for
  `/admin/*` (audit finding D1), and production gating of `/debug/*` (D2).
  PR **#16** (already merged) added `--no-cpu-throttling`.
- The **active database is the Supabase project "HydroRivers Image Generator
  small version"** (ref `iyijaywownhftzjwqhzj`, us-west-2). The old us-east-2
  project is paused — do not touch it.
- Migrations **007** and **008** are already applied to the active database.
  Migrations **003** and **004** are NOT applied — that is audit finding C1,
  fixed in step 3.
- **Ordering is load-bearing**: 003 makes `/admin/reload-rules` functional,
  so it must not be applied until the D1 auth code (step 2) is serving.

Conventions:

```text
REGION      = us-central1
BACKEND     = hydro-backend
BACKEND_URL = $(gcloud run services describe hydro-backend --region us-central1 --format='value(status.url)')
ADMIN_KEY   = the value stored in Secret Manager in step 1
```

---

## Step 1 — Create the admin key secret

The next deploy wires `ADMIN_API_KEY` from the Secret Manager secret
`hydro-admin-api-key` (`_ADMIN_KEY_SECRET` in `cloudbuild.yaml`). The deploy
**fails** if the secret does not exist or the runtime service account cannot
read it.

```bash
# Generate and store a strong key (record it somewhere safe — it is the
# credential for /admin/* from now on):
python3 -c "import secrets; print(secrets.token_urlsafe(32))" | tr -d '\n' \
  | gcloud secrets create hydro-admin-api-key --data-file=-

# Grant read access to the Cloud Run runtime service account. Determine it:
gcloud run services describe hydro-backend --region us-central1 \
  --format='value(spec.template.spec.serviceAccountName)'
# (empty output = the Compute Engine default SA: PROJECT_NUMBER-compute@developer.gserviceaccount.com)

gcloud secrets add-iam-policy-binding hydro-admin-api-key \
  --member="serviceAccount:<RUNTIME_SA>" \
  --role="roles/secretmanager.secretAccessor"
```

**Gate 1**: `gcloud secrets versions access latest --secret=hydro-admin-api-key`
prints the key.

---

## Step 2 — Merge PR #17 and deploy

1. Merge PR #17 (review it first if that's the workflow; it is currently a
   draft — mark ready, then merge).
2. From the repo root on `main`:

```bash
gcloud builds submit --config cloudbuild.yaml
```

3. Confirm the new revision serves 100% traffic and is `Ready`:

```bash
gcloud run services describe hydro-backend --region us-central1 \
  --format='value(status.latestReadyRevisionName, status.traffic)'
```

**Gate 2** — all four must hold before step 3:

| # | Check | Command | Expected |
|---|---|---|---|
| 2a | Health | `curl -s -o /dev/null -w '%{http_code}' $BACKEND_URL/health` | `200` |
| 2b | Debug gated (D2) | `curl -s -o /dev/null -w '%{http_code}' -X POST $BACKEND_URL/debug/sensitivity` | `404` |
| 2c | Admin locked without key (D1) | `curl -s -o /dev/null -w '%{http_code}' $BACKEND_URL/admin/export-history` | `401` |
| 2d | Admin accepts the key | `curl -s -o /dev/null -w '%{http_code}' -H "X-Admin-Key: $ADMIN_KEY" $BACKEND_URL/admin/export-history` | `500` for now (table missing until step 3) — anything but 401/403 proves auth passes |

If 2c returns `403` instead of `401`, the secret did not reach the container —
re-check step 1's IAM binding and the deploy logs; do not proceed.

---

## Step 3 — Apply migrations 003 and 004

Target: the **active** Supabase project (`iyijaywownhftzjwqhzj`). Apply in
order via the Supabase SQL editor, MCP `apply_migration`, or psql:

```text
db/migrations/003_create_platform_rules.sql   (creates + seeds platform_rules)
db/migrations/004_create_export_log.sql       (creates export_log)
```

Then flip the running service from hardcoded to database-backed rules without
a restart:

```bash
curl -s -X POST -H "X-Admin-Key: $ADMIN_KEY" $BACKEND_URL/admin/reload-rules
```

**Gate 3** — the reload response must show:

- `"status": "reloaded"` and `"source": "database"` (not `"hardcoded"`),
- `"rule_count"` > 0 (003 seeds density/palette/typography/flag presets),
- `"spatial_cache_entries_cleared"` present (any number — proves the R1
  cache-flush hook is live).

Also confirm `curl -H "X-Admin-Key: $ADMIN_KEY" $BACKEND_URL/admin/export-history`
now returns `200` with `[]` (empty log, no longer a 500), and that a poster
export afterwards adds a row — that closes the silent-audit-log-loss half of C1.

---

## Step 4 — Re-audit and close the findings

Re-run **only** the affected checks from `docs/CLOUD_RUN_AUDIT.md`; the rest
of the report stands. Report results as findings per the §6 rubric (same IDs,
`severity`, `evidence`, `remediation-type`), so the closeout report appends
cleanly to the original audit.

| ID | What to verify now | Expected outcome |
|---|---|---|
| C1 | `platform_rules` / `export_log` exist on the **active** project; rules source is `database`; exports write audit rows | `pass` |
| D1 | Anonymous `POST /admin/reload-rules` → 401; keyed request → 200 | `pass` |
| D2 | `POST /debug/sensitivity` → 404 | `pass` |
| B4 (re-run) | Trigger one sensitivity sweep and poll (§B4 of the audit plan) | `pass` — but read the note below |
| B1/B3 (spot) | `/geographies` and one `/preview` against the active DB | `pass`; preview should be markedly faster on repeat (R1 cache) |

**B4 expectations changed by PR #17 — do not misreport these as failures:**

- The sweep completes in **seconds**, not ~48–85 s (shared spatial pass).
- Progress does not increment: polls show `completed_runs: 0` while running,
  then jump straight to `12/12 complete` when the sweep transaction commits.
  This is the designed single-transaction behavior, not a stall.
- The volatility endpoint returns data only after completion (from
  `mcda_sweep_volatility`); in-flight it returns `[]`.
- After the sweep, confirm `mcda_cell_results` row count did **not** grow
  (children no longer write there) and `mcda_sweep_volatility` gained rows
  for the new `sweep_id`:

```sql
SELECT (SELECT count(*) FROM mcda_cell_results)                       AS cell_results,
       (SELECT count(DISTINCT sweep_id) FROM mcda_sweep_volatility)   AS sweeps_persisted;
-- cell_results should equal baseline-runs x grid size only (19,445 per baseline run today)
```

**Closeout report skeleton** (append to the original audit report):

```markdown
# Cloud Run audit closeout — <date>, image tag <BUILD_ID>
| ID | Severity | One-line | Remediation applied |
|----|----------|----------|---------------------|
<one row per re-checked finding>
## Residual items
<anything still open, with owner and next action — an empty section means the audit is fully closed>
```

## Out of scope for this plan

Do **not** widen the work: no new endpoints, no cache-size tuning, no compute
tier changes, no touching the paused us-east-2 Supabase project. If a gate
fails in a way this plan doesn't cover, stop and report the failure with
evidence rather than repairing ad hoc.
