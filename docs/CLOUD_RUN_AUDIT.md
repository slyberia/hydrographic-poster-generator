# Cloud Run Live-Service Audit Plan

Purpose: verify that the deployed `hydro-backend` and `hydro-frontend` Cloud Run
services match the configuration this repo declares (`cloudbuild.yaml`,
`docs/DEPLOYMENT.md`) and that the runtime behavior added since the last deploy —
poster preview/export and the drone sensitivity sweep — actually works in
production, not just locally.

This document is written to be executed by any operator or agent session with
`gcloud` access to the project. Findings must be reported using the rubric in
§6 so remediation can be planned from the report alone, without re-running the
audit.

Read-only guarantee: Phases A, C, and D make no changes. Phase B sends real
requests (including one sensitivity sweep, ~85 s of backend work) but writes
only drone-run rows the app creates in normal use. Nothing in this plan
modifies service configuration; remediation is a separate, later step.

Conventions used below:

```text
REGION   = us-central1
BACKEND  = hydro-backend
FRONTEND = hydro-frontend
BACKEND_URL / FRONTEND_URL = discovered in step A1
```

---

## Phase A — Configuration audit (read-only, ~5 min)

### A1. Service inventory

```bash
gcloud run services list --region us-central1
gcloud run services describe hydro-backend  --region us-central1 --format=yaml > backend.yaml
gcloud run services describe hydro-frontend --region us-central1 --format=yaml > frontend.yaml
BACKEND_URL=$(gcloud run services describe hydro-backend  --region us-central1 --format='value(status.url)')
FRONTEND_URL=$(gcloud run services describe hydro-frontend --region us-central1 --format='value(status.url)')
```

Check: both services exist, latest revision is `Ready` and carries 100% traffic,
and the serving image tag corresponds to a build that includes the current
`main` (compare the image's `$BUILD_ID` tag against recent
`gcloud builds list` entries). A stale image is a finding on its own — it means
every later check audits old code.

### A2. Backend spec vs. repo expectations

Compare `backend.yaml` against this table. Every row cites where the repo
declares the expected value.

| # | Field (in service YAML) | Expected | Declared in |
|---|---|---|---|
| A2.1 | `annotations."run.googleapis.com/cpu-throttling"` | `"false"` (CPU always allocated) | `cloudbuild.yaml` `--no-cpu-throttling`; PHASE_C_SENSITIVITY_PLAN.md §3j |
| A2.2 | container `resources.limits.memory` | `2Gi` | `cloudbuild.yaml`, DEPLOYMENT.md §backend sizing |
| A2.3 | container `resources.limits.cpu` | `2` | same |
| A2.4 | `containerConcurrency` | `2` | same — do not accept higher without proportional memory |
| A2.5 | `timeoutSeconds` | `300` | `cloudbuild.yaml` |
| A2.6 | container port | `8080` | `cloudbuild.yaml` |
| A2.7 | `DATABASE_URL` sourced from Secret Manager (`hydro-database-url:latest`), not a literal env value | secretKeyRef present; no plaintext DSN anywhere in the YAML | `cloudbuild.yaml` `--set-secrets`; CLAUDE.md deployment principles |
| A2.8 | `CORS_ORIGINS` env | contains `$FRONTEND_URL` (and typically `http://localhost:3000`) | `cloudbuild.yaml` deploy + patch-backend-cors steps |
| A2.9 | `autoscaling.knative.dev/minScale` | `0` (or absent) unless warm starts were deliberately chosen — matters for cost now that CPU is always-allocated | DEPLOYMENT.md §backend sizing |
| A2.10 | ingress / auth | `--allow-unauthenticated` is expected for the MVP; note the actual IAM binding | `cloudbuild.yaml` |

A2.1 is the headline check: if `cpu-throttling` is `"true"` or absent, the
deployed service predates the always-allocated fix and sensitivity sweeps will
stall in production regardless of what the repo says.

### A3. Frontend spec

| # | Field | Expected |
|---|---|---|
| A3.1 | memory | `512Mi` |
| A3.2 | port | `3000` |
| A3.3 | CPU throttling | default (throttled) is fine — the frontend has no post-response work |
| A3.4 | baked API URL | cannot be read from the service YAML (build-arg); verified functionally in B5 |

---

## Phase B — Functional smoke tests (~10 min, includes one real sweep)

Run in order; later steps depend on earlier ones. Record HTTP status, latency,
and response body (or its first ~200 chars) for every call — these become
rubric evidence.

### B1. Health and core lookups

```bash
curl -sS -w '\n%{http_code} %{time_total}s\n' $BACKEND_URL/health
curl -sS -w '\n%{http_code}\n' $BACKEND_URL/presets | head -c 400
curl -sS -w '\n%{http_code}\n' "$BACKEND_URL/geographies" | head -c 400
```

Note: `/health` returns `{"status": "ok"}` without touching the database, so a
passing health check does **not** prove DB connectivity — `/geographies` is the
real connectivity probe (it queries `admin_boundaries`).

### B2. CORS from the frontend origin

```bash
curl -sS -i -X OPTIONS "$BACKEND_URL/presets" \
  -H "Origin: $FRONTEND_URL" \
  -H "Access-Control-Request-Method: GET" | head -20
```

Check: `access-control-allow-origin` echoes the frontend URL. A missing header
means the patch-backend-cors step never ran or the frontend URL changed.

### B3. Poster preview path

POST `/preview` with a small known-good geography and default presets (take a
valid payload from the frontend's network tab or `frontend/` API client
`droneApi.ts` / poster equivalents). Expect 200 and an SVG/render payload well
inside the 300 s timeout.

### B4. Drone sweep end-to-end — the CPU-allocation proof

This is the one test that distinguishes "config looks right" from "background
work actually survives after the 202". It exercises
`drone_service.py::trigger` → `asyncio.create_task(_execute_sweep(...))`.

1. Create or pick a completed drone run: `GET $BACKEND_URL/runs` (create via
   `POST /runs` if none exist).
2. Trigger: `POST $BACKEND_URL/runs/{run_id}/sensitivity` → expect
   `202`-style response with `sweep_id`, `status: "running"`, and
   `total_expected = 2 × N_factors` (never hardcode 12 — read
   `GET /config/factors`).
3. Poll `GET $BACKEND_URL/runs/{run_id}/sensitivity/{sweep_id}` every ~10 s.
   **Do not send other requests to the backend while polling from a second
   channel is avoidable** — the point is to verify the sweep progresses with no
   foreground request keeping the instance CPU-active. If polling itself is the
   only traffic, note poll frequency in the evidence (polls grant CPU on a
   request-throttled service and can mask the defect; a 60 s poll interval is a
   stronger test than 5 s).
4. Expect `status: "complete"` with all children finished in roughly
   `2 × N_factors × 7s` (~85 s at 6 factors) + overhead. Then fetch
   `GET .../volatility` and expect a well-formed response.

Failure signatures and what they mean:

- Sweep stuck at partial progress that only advances when you poll → CPU
  throttling is still active (A2.1 finding confirmed behaviorally).
- Children marked stalled/stale by the staleness cleanup → same root cause,
  observed after the fact.
- 5xx on trigger → check B1/DB findings first; likely unrelated to CPU.

### B5. Frontend serving and wiring

```bash
curl -sS -o /dev/null -w '%{http_code} %{time_total}s\n' $FRONTEND_URL
```

Then load `$FRONTEND_URL` in a browser (or Playwright): confirm the app
renders, the network tab shows API calls going to `$BACKEND_URL` (proves the
build-arg `NEXT_PUBLIC_API_URL` was baked correctly), and no CORS errors appear
in the console. If the repo's Playwright E2E suite (`frontend/`, Phase D) can be
pointed at the deployed URL, run it and attach the summary.

---

## Phase C — Logs and runtime behavior (~5 min, covering the Phase B window)

```bash
# Errors and warnings during the test window
gcloud logging read 'resource.type="cloud_run_revision" resource.labels.service_name="hydro-backend" severity>=WARNING' \
  --freshness=1h --limit=50

# Instance lifecycle: OOM kills, container exits, cold starts
gcloud logging read 'resource.type="cloud_run_revision" resource.labels.service_name="hydro-backend" textPayload:("memory" OR "SIGKILL" OR "exceeded")' \
  --freshness=1h --limit=20
```

Check for:

- C1. Any 5xx or unhandled exception during the smoke tests.
- C2. Memory pressure / OOM (the 2 GiB ceiling is sized for export rasters;
  a sweep plus a concurrent export at concurrency 2 is the worst case).
- C3. asyncpg / PgBouncer errors (`DuplicatePreparedStatementError` would mean
  `statement_cache_size=0` regressed; pool-exhaustion errors during the sweep
  mean the sweep's concurrent queries outgrow the pool).
- C4. Instance churn during the sweep: if the instance serving the 202 was
  retired mid-sweep, the sweep dies even with CPU always-allocated —
  always-allocated CPU does not pin instance lifetime. Repeated occurrence is
  the signal to move to §3j option (b), a Cloud Run job / task queue.

Metrics (console or `gcloud monitoring`): billable instance time before/after
the always-allocated change (cost check for A2.9), CPU utilization during the
sweep, request latencies.

---

## Phase D — Security and exposure posture (~5 min)

| # | Check | How | Expected / concern |
|---|---|---|---|
| D1 | `/admin/*` reachable unauthenticated | `curl -X POST $BACKEND_URL/admin/reload-rules`, `curl $BACKEND_URL/admin/export-history` | These routers are mounted unconditionally in `app/main.py` on an `--allow-unauthenticated` service. If they respond to anonymous calls, that is at minimum a `warning`; `reload-rules` mutates process state, so treat public write access as `block`-severity for any non-demo deployment. |
| D2 | `/debug/sensitivity` reachable unauthenticated | `curl -X POST $BACKEND_URL/debug/sensitivity` | Same concern: a public endpoint that can start ~85 s CPU-bound work is a trivial cost/DoS lever on an always-allocated service. |
| D3 | Secret hygiene | grep `backend.yaml` for `postgres://` / `postgresql://` | DSN must appear only as a secretKeyRef (A2.7). |
| D4 | CORS scope | inspect `CORS_ORIGINS` value | Only the frontend URL(s) + localhost; no `*`. |
| D5 | Unauthenticated invoke | `gcloud run services get-iam-policy hydro-backend --region us-central1` | `allUsers: roles/run.invoker` is the documented MVP posture — record it explicitly so it is a decision, not an accident. |

---

## §6. Findings rubric

Report every check above as a finding, including passes — a pass with evidence
is what lets the next session skip re-verification. Use the repo's QA severity
vocabulary.

### Severity levels

| Severity | Meaning | Response expectation |
|---|---|---|
| `pass` | Observed matches expected | None; recorded for baseline |
| `warning` | Deviation that degrades quality, cost, or posture but does not break the product now | Schedule; batch with other fixes |
| `block` | Breaks a shipped feature in production, risks data/credential exposure, or invalidates the audit itself (e.g. stale image in A1) | Fix before relying on the deployment |

### Finding format

One block per finding, machine-parseable headers:

```markdown
### [A2.1] CPU allocation on hydro-backend
- severity: block
- category: config          # config | functional | observability | security | cost
- expected: run.googleapis.com/cpu-throttling = "false" (cloudbuild.yaml)
- observed: annotation absent (request-based CPU allocation active)
- evidence: |
    $ gcloud run services describe hydro-backend --region us-central1 \
        --format='value(spec.template.metadata.annotations)'
    <output>
- impact: sensitivity sweeps stall after the 202 response in production
- remediation-type: service-update   # redeploy | service-update | code-change | docs-change | decision-needed | none
- proposed-remediation: gcloud run services update hydro-backend --region us-central1 --no-cpu-throttling
```

Field rules:

- **ID** is the check number from this plan (A2.1, B4, D2 …) so findings map
  back to procedure without prose.
- **evidence** is the literal command and trimmed output — enough for a reader
  to trust the observation without re-running it.
- **remediation-type** drives triage on report-back:
  - `service-update` — one `gcloud run services update`, no build needed;
  - `redeploy` — requires `gcloud builds submit` (config already fixed in repo);
  - `code-change` — repo change needed first (open an issue/PR);
  - `docs-change` — deployment matches reality but repo docs don't;
  - `decision-needed` — deviation may be intentional (e.g. D5, A2.9); owner
    must confirm before anyone "fixes" it.
- Never bundle two deviations into one finding, even with a shared fix —
  severity and remediation are per-observation.

### Report skeleton

```markdown
# Cloud Run audit — <date>, image tag <BUILD_ID>
## Summary table
| ID | Severity | Category | One-line |
|----|----------|----------|----------|
## Findings
<one block per finding, blocks first, then warnings, then passes>
## Not run / blocked checks
<any check skipped, with reason — a skipped check is not a pass>
```

The summary table plus per-finding `remediation-type` is what this repo's
sessions will use to structure the fix plan, so completeness there matters more
than narrative.
