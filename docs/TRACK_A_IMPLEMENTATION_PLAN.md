# Track A — Production Architecture: Implementation Plan & Execution Guide

> This document governs **Track A only** (Production Architecture). Track B (Product
> Experience) is out of scope here and is referenced only where it consumes a Track A
> contract. This document is the source of truth for scope, sequence, and completion
> for Track A. Do not expand a task because adjacent improvements appear useful.

---

## 1. Operating Directive

Priority order for every Track A decision:

1. Current approved task contract (the `TA-*` contract being executed)
2. Track A milestone and dependency sequence (§5)
3. Product objectives (§2)
4. Follow-up backlog (§13)
5. General best practices

General best practices must not override an explicit scope decision unless there is an
immediate **security, data-loss, or destructive-operation** risk. No `TA-*` task begins
until its contract (§6) is accepted.

---

## 2. Product North Star

- **Product purpose:** A protocol-driven hydrographic poster generator, plus a drone
  MCDA (multi-criteria decision analysis) suitability console that classifies an H3 hex
  grid into flight-suitability zones for a study region.
- **Primary users (Track A relevant):** internal analysts/admins operating the drone
  console; a future public/read audience consuming *published* authoritative runs.
- **Primary workflows touched by Track A:** create/execute drone model runs; approve and
  publish an authoritative run per region; serve published runs to a read surface.
- **Current maturity & deployment state:** Backend + frontend containerized for Cloud
  Run via `cloudbuild.yaml`. PR #20 (Supabase RLS lockdown + JWT auth + role-gated drone
  mutations) is **merged to `main`** but **not verified in production**. No CI. No rate
  limiting.
- **Intended outcome of this iteration (Track A):** a coherent, deployable production
  architecture — verified security posture, an authoritative run lifecycle, reproducible
  deploys, a migration baseline, CI protection, and rate limiting before any public
  exposure.
- **Explicit non-goals (this iteration):** Public Explorer page, landing page, dashboard,
  console redesign, saved-scenario libraries, multi-tenancy, microservices,
  Redis/Memorystore, materialized aggregates, a general audit-event platform. (These are
  Track B or deferred.) **Note:** *single-client* Region 4 / study-area configuration is
  **in Track A scope** under TA-3B (§6) — it is a configuration change, not multi-tenancy
  or a client-branding product. (Restored after external review flagged its accidental
  drop; the TA-3A/TA-3B split is approved.)
- **Supported environments/devices:** hosted Supabase Postgres/PostGIS; Cloud Run
  (`us-central1`); desktop browsers for the internal console. Mobile parity is not a
  Track A goal.
- **Constraints:** single client; cost-sensitive (no infra for hypothetical scale);
  export is CPU-bound single-request work (Cloud Run sized at 2 GiB / concurrency 2,
  no-CPU-throttling for background sweeps — do not regress this).

Every `TA-*` task must trace to this North Star.

---

## 3. Current-State Record

State vocabulary: *Implemented locally · Committed · In open PR · Merged · Deployed ·
Verified in production · Deferred.* Never report an earlier state as "done."

| Area | Current state | Evidence | Remaining gap | Dependency |
|---|---|---|---|---|
| Supabase Data API / RLS lockdown | Verified in production | `db/migrations/009_lock_down_data_api.sql`; live checks recorded in §14a | PostGIS extension-object grants remain deferred under FU-3 | — |
| JWT auth + app roles | Deployed; partially verified | `backend/app/auth.py`; Cloud Run revision `hydro-backend-00059-d6x`; no-token probe returned 401 | Insufficient-role 403 requires a lower-role JWT | TA-1 |
| Drone mutation authorization | Deployed; partially verified | `backend/app/routers/drone.py` role deps; build `d500f41d-1513-4149-a301-ee72ee5f75f8` sourced from `cb6c355` | Insufficient-role 403 unverified | TA-1 |
| Run **publication** lifecycle | Not implemented | `mcda_model_runs.status` is *execution* only (`pending/running/complete/failed`), `005_drone_mcda_schema.sql:369` | No authority/publish state; hard-delete cascades (`delete_run`) | TA-2 |
| Published-run read contract | Not implemented | no endpoint returns "published only" | Needed by Track B Public Explorer | TA-2 |
| Deployment / client config | Partial deployment | Build `d500f41d-1513-4149-a301-ee72ee5f75f8` deployed the backend from `cb6c355`, then failed before frontend build because `_SUPABASE_PUBLISHABLE_KEY` was empty | Correct trigger substitution and verify a complete reproducible deploy | TA-3A, TA-7 |
| Migration baseline | Not implemented | raw SQL `db/migrations/001–009` + `scripts/run_migrations.py` | No applied-migration tracking / idempotent baseline | TA-4 |
| CI | Absent | no `.github/workflows/` | No automated test/build gate | — |
| Rate limiting | Absent | no `slowapi`/limiter in `backend/` | No abuse protection before public exposure | TA-2 (contract), release |
| Production verification | Partial | TA-1 DB checks, F1a, and F2 PASS (§14a) | F1b lower-role check; complete frontend deployment; later lifecycle/read smoke tests | TA-1, TA-3A, TA-7 |

---

## 4. Workstream Structure (Track A)

Track A spans six workstreams. Independent workstreams must not be combined inside one
implementation task.

### 4.1 Security & Deployment Verification
- **Desired outcome:** PR #20's security posture is provably live.
- **Ordered tasks:** TA-1.
- **Completion criteria:** RLS/roles observably enforced against deployed services.

### 4.2 Database — Run Lifecycle
- **Desired outcome:** every run carries an authoritative lifecycle; published runs are
  protected from silent destruction; a published-only read path exists.
- **Ordered tasks:** TA-4, then TA-2 (see §5).
- **Completion criteria:** DoD in TA-2 contract.

### 4.3 Migration Baseline
- **Desired outcome:** migrations are tracked, ordered, and idempotently re-appliable.
- **Ordered tasks:** TA-4.
- **Completion criteria:** applied-state tracking + documented apply procedure.

### 4.4 Testing & CI
- **Desired outcome:** every new route/schema ships behind an automated gate.
- **Ordered tasks:** TA-5.
- **Completion criteria:** CI runs backend tests + frontend build/lint on PRs.

### 4.5 Abuse Protection
- **Desired outcome:** public-facing read paths cannot be trivially overloaded.
- **Ordered tasks:** TA-6.
- **Completion criteria:** rate limiting on unauthenticated/read endpoints; **blocks
  public release only**, not local UI construction.

### 4.6 Deployment & Study-Area Configuration
- **Desired outcome:** deploys are reproducible and the single deployed instance receives
  its study-area assumptions from configuration rather than Region 4 constants in code.
- **Ordered tasks:** TA-3A, then TA-3B.
- **Completion criteria:** complete deploy succeeds with recorded source provenance;
  study-area identity, map defaults, and backend region key come from one deployment
  contract without introducing multi-tenancy.

---

## 5. Dependency Map

| Task | Must happen after | Must happen before | Can run independently | Blocks release? |
|---|---|---|---|---|
| **TA-1** Verify #20 deploy | (nothing) | TA-7 | — | Yes |
| **TA-4** Migration baseline | (nothing) | TA-2 apply step | Yes (design) | No (but de-risks TA-2) |
| **TA-2** Run lifecycle | TA-4 (for clean apply) | Track B Explorer/Dashboard | — | No |
| **TA-5** CI | (nothing) | adding multiple new routes | Yes | No |
| **TA-6** Rate limiting | TA-2 (published read exists) | Public launch | Partly | Yes (for public) |
| **TA-3A** Reproducible deployment config | TA-1 | TA-7 | Partly | Yes |
| **TA-3B** Study-area/client config | TA-2 | TA-7, Track B surfaces | Partly | Yes |
| **TA-7** Production verification | TA-1, TA-3A, TA-3B | Public launch | — | Yes |

Dependencies reflect technical requirements, not preference. Notable real gates:
- **TA-2 published-read** is a hard prerequisite for the Track B Public Explorer.
- **TA-6** need only precede *public exposure*; it must not block local/console work.
- **TA-5 (CI)** should precede TA-2 implementation so the new schema/routes ship protected —
  recommended ordering: **TA-1 → TA-5 → TA-4 → TA-2 → TA-3A → TA-3B → TA-6 → TA-7.**

---

## 6. Task Contracts

Only `TA-1` and `TA-2` are contract-complete below (the immediate, agreed work).
TA-3A/TA-3B and TA-4–TA-7 carry outline contracts to be expanded to full form when they become the active task
(per §12, estimates are set only when a contract is approved).

---

### TA-1 — Verify PR #20 security posture in the deployed environment

- **Task ID:** TA-1
- **Title:** Confirm RLS lockdown + JWT roles are enforced on the live services.
- **Objective:** Produce evidence that migration `009` is applied to the live database and
  that role-gated drone mutations reject unauthorized callers on the deployed backend.
- **Problem solved:** PR #20 was *merged* but its protection was *unverified* at task
  activation; "merged" is not "enforced." A silent gap here undermines every later
  public-facing decision.
- **Evidence:** `009_lock_down_data_api.sql`; `backend/app/auth.py`; role deps in
  `backend/app/routers/drone.py`; `cloudbuild.yaml`.
- **Included:** read-only live checks —
  1. query `anon`/`authenticated` privileges and `rowsecurity` on the listed public tables;
  2. call a role-gated endpoint (e.g. `PATCH /config/factors/{key}`) with **no token**
     → expect `401`, and with a **valid but insufficient-role token** → expect `403`;
  3. confirm the deployed image corresponds to source at/after `cb6c355`.
- **Revision-provenance method (check 3):** Cloud Run image tags use `$BUILD_ID`, **not**
  the git SHA, so inspecting the service alone does not prove the source commit. Use one of,
  in order of preference: (a) inspect the Cloud Build record for the deployed image digest
  and read its source commit; (b) match the running image digest to a build record; (c) if
  neither is reachable, verify runtime *behavior* (checks 1–2) and explicitly record that
  commit provenance is unavailable. Adding commit labels to deployments for future
  traceability is **TA-3A work, not TA-1 remediation**.
- **Excluded:** any code change, redeploy, new migration, or lifecycle work. If a gap is
  found, **stop and report** — remediation is a separate contract.
- **Dependencies:** live DB read access (Supabase MCP or `DATABASE_URL`); deployed backend
  URL; a test JWT (or confirmation that missing-token path 401s).
- **Assumptions:** the currently deployed revision is intended to be at/after `cb6c355`.
- **Implementation approach:** verification only — no repository changes.
- **Definition of done:** a written verification record stating, per check, PASS/FAIL with
  the observed value and the DB/deploy state it was observed against.
- **Verification:** SQL privilege/RLS introspection; 2–3 HTTP probes against the deployed
  backend.
- **Deployment requirement:** none (read-only against existing deploy).
- **Approval gates:** none to *read*; any *remediation* requires a new approved contract.
- **Stop point:** once every check is recorded. Do not fix findings in this task.
- **Expected effort:** implementation ~0.5–1.5 h; excludes any wait for credential/access
  provisioning.
- **Risk:** Low (read-only).
- **Rollback:** n/a (no changes).

---

### TA-2 — Authoritative run lifecycle + published-run read contract

- **Task ID:** TA-2
- **Title:** Give every drone model run a publication lifecycle and a protected published
  read path.
- **Objective:** Add `lifecycle_state ∈ {draft, approved, published, archived}` to model
  runs, enforce valid transitions and a one-published-run-per-region invariant
  server-side, expose admin approve/publish/archive endpoints, surface lifecycle in run
  responses, add minimal console badges/actions, and add a viewer-gated published-only
  read endpoint. Make published runs undestroyable while published (archive-first).
- **Problem solved:** experimental runs are indistinguishable from authoritative results,
  and `delete_run` hard-cascades — destroying provenance. No way to serve an authoritative
  result to a read audience.
- **Evidence:** `mcda_model_runs` (`005_drone_mcda_schema.sql:362`) has only execution
  `status`; `delete_run` in `backend/app/services/drone_service.py` cascades via
  `ON DELETE CASCADE`; sweep-aggregate views in `008_sweep_aggregates.sql` filter
  `status = 'complete'`.
- **Included:**
  - New migration `db/migrations/010_run_lifecycle.sql`:
    - `ALTER TABLE mcda_model_runs ADD COLUMN lifecycle_state TEXT NOT NULL DEFAULT 'draft'
      CHECK (lifecycle_state IN ('draft','approved','published','archived'));`
    - Partial unique index: `CREATE UNIQUE INDEX one_published_per_region ON
      mcda_model_runs (region_id) WHERE lifecycle_state = 'published';`
    - A guard so a `published` run cannot be deleted (trigger `BEFORE DELETE`, or enforce
      in `delete_run`; DB-level preferred for the cascade path).
  - Transition rules enforced server-side: `draft→approved→published`,
    `published→archived`, `approved→archived`, `archived→draft` (revive) — reject others
    with 409.
  - Admin endpoints (role `admin`): `POST /runs/{run_id}/approve`,
    `/publish`, `/archive`.
  - Lifecycle fields added to `list_runs` / `get_run_details` responses.
  - Viewer-gated read: `GET /runs/published` (and/or `/runs/published/{region_key}`)
    returning only `lifecycle_state = 'published'`, never draft/archived.
  - Minimal console: a lifecycle badge per run and approve/publish/archive buttons wired
    to the new endpoints (existing `ControlRail`/run list; no redesign).
  - Tests: migration applies cleanly; transition guard (valid + rejected); partial-unique
    invariant; published-delete guard; published endpoint excludes non-published.
- **Excluded:** Public Explorer page, landing page, console redesign, dashboard, saved
  scenarios, full audit-event ledger, Region 4 / study-area configuration (owned by TA-3B,
  not TA-2), rate limiting (TA-6), and any role-UI refinement beyond these lifecycle
  actions. **Do not modify the execution `status` column** or the `008` views.
- **Dependencies:** TA-4 complete (clean apply/tracking); the auth roles from PR #20
  (present).
- **Assumptions:** `region_id` is the authoritative "study area" key (agreed); "one
  published per region" is keyed on `region_id`, independent of Region 4 config.
- **Implementation approach:** additive column + partial index + DB guard; thin endpoint
  layer reusing existing `drone_service` patterns (mirror the `parent_run_id` convention
  for filtering). Smallest change that satisfies the invariants in the DB, not the app.
- **Definition of done:** migration committed **and applied**; transitions enforced
  server-side (invalid → 409); published read endpoint cannot return draft/archived;
  published runs cannot be silently deleted or modified into a non-published duplicate;
  minimal console controls function; tests pass; **separate PR** created; deployed behavior
  verified.
- **Verification:** backend unit/integration tests (transition matrix, invariants, read
  filter); migration validation on a scratch/branch DB; frontend build + a manual console
  pass on the badges/actions; post-deploy smoke of the published endpoint.
- **Deployment requirement:** PR + deploy; migration applied to the target DB as an
  approval-gated step.
- **Approval gates:** applying the migration to any shared/live database; deploying.
- **Stop point:** once lifecycle behavior is verified. Record adjacent findings (§13); do
  not build the Explorer/dashboard.
- **Expected effort:** implementation ~2–4 h (migration, guards, ~4 endpoints, response
  plumbing, minimal badges, focused tests); excludes deploy/wait time. Revisit only if the
  contract changes.
- **Risk:** Medium — touches a core table and the delete path; mitigated by additive-only
  schema, DB-level invariants, and not touching `status`/`008` views.
- **Rollback:** `DROP INDEX one_published_per_region; DROP TRIGGER …; ALTER TABLE
  mcda_model_runs DROP COLUMN lifecycle_state;` revert endpoints/console via PR revert. No
  data loss (column is additive; default `draft`).

---

### TA-4 — Migration baseline (outline)
- **Objective:** applied-migration tracking + documented, idempotent apply procedure over
  the existing `db/migrations/*.sql` + `scripts/run_migrations.py`.
- **Included (draft):** a `schema_migrations` tracking table (or adopt a runner that keeps
  one); make `run_migrations.py` record/skip applied files; document apply order and the
  live-vs-local procedure.
- **Excluded:** switching to Alembic/Supabase-migrations wholesale unless justified; no
  rewrite of existing SQL.
- **Blocks release:** No. **De-risks TA-2.** Full contract on activation.

### TA-3A — Reproducible deployment configuration (outline)
- **Objective:** confirm and document the reproducible deploy path post-#20 (substitutions,
  secrets `hydro-database-url` / `hydro-admin-api-key`, `_SUPABASE_URL`, publishable key,
  CORS) so a deploy is repeatable without tribal knowledge. Includes adding commit-provenance
  labels to deployments (satisfies TA-1 check-3 traceability going forward).
- **Excluded:** a generalized client-branding product; new infra. Full contract on
  activation.

### TA-3B — Study-area / client deployment configuration (outline)
- **Objective:** move Region 4 / study-area assumptions into deployment/client
  configuration so the single deployed instance is configured for its study area rather than
  relying on hard-coded assumptions. Restored after external review flagged its accidental
  drop.
- **Scope guard:** **single-client configuration only** — NOT multi-tenancy, NOT a
  branding platform, NOT per-tenant isolation. If it starts to look like any of those, stop
  and re-scope.
- **Consumes:** the `region_id`-keyed lifecycle from TA-2 (published-run-per-region).
- **Excluded:** multi-region runtime switching UI; tenant management. Full contract on
  activation.

### TA-5 — CI (outline)
- **Objective:** a `.github/workflows` pipeline running backend tests (`backend/tests`) and
  frontend build/lint on PRs to `main`.
- **Excluded:** deploy-on-merge, matrix builds, coverage gates "for completeness." Keep to
  test + build. Full contract on activation.

### TA-6 — Rate limiting (outline)
- **Objective:** rate-limit unauthenticated/read endpoints (notably the TA-2 published
  read and any heavy GeoJSON path) using the smallest viable mechanism (e.g. `slowapi`),
  no Redis unless measured demand requires it.
- **Blocks release:** Yes, for public exposure only. Full contract on activation.

### TA-7 — Production verification (outline)
- **Objective:** post-deploy smoke tests across security, lifecycle, and read paths against
  live services; record results with the deployed revision.
- **Depends:** TA-1, TA-3A, TA-3B. Full contract on activation.

---

## 7. Execution Protocol (per task)

For each `TA-*` task the executor must:
1. Restate the active objective and exclusions.
2. Inspect only the context the objective needs.
3. Confirm branch, worktree, deployed revision, and DB state before changing anything.
4. Implement the smallest solution satisfying the contract.
5. Run verification proportional to blast radius (§11).
6. Stop at the contract's stop point.
7. Record adjacent findings in §13 without implementing them.
8. Report repository / PR / deployment / production states **separately**.

Branch discipline: develop on `claude/recent-pr-repo-review-39oloc` (or the task's
designated branch); one PR per task (TA-2 DoD requires a *separate* PR).

---

## 8. Change-Control Rule

Classify newly discovered work as **Blocking / Critical / Adjacent / Optional**. Only
*blocking* work may be added automatically, using the minimum fix. *Critical* (security /
data-loss / destructive) must be surfaced immediately and, if it changes scope, pause for
approval. *Adjacent* and *optional* go to §13. Any scope amendment updates the contract,
estimate, risk, and verification plan before work continues.

---

## 9. Anti-Overengineering Rules (binding for Track A)

No multi-tenancy; no abstractions without demonstrated duplication; no infra for
hypothetical scale; no opportunistic refactors of unrelated modules; no full UI systems for
a narrow control (TA-2 console = badges + buttons, not a redesign); no new dependencies
where existing tools suffice; no "for completeness" states/roles/endpoints; verification
stays proportional (§11). Prefer reversible, incremental changes matching existing
repository patterns.

---

## 10. Operational-Drift Controls

Tooling/auth/dependency/environment work is supporting, not the objective. Before any such
work ask: is it required for the active DoD? Is a connector/tool already available? Can
verification use the established environment? Will it modify the user's machine, cloud,
DB, or repo — and does that need approval? If operational work exceeds the task's expected
effort or crosses an unapproved system boundary (e.g. applying a migration to a shared DB,
deploying), **stop and report**.

---

## 11. Verification Budget

- **TA-1:** read-only SQL introspection + 2–3 HTTP probes. No suites.
- **TA-2:** focused backend unit/integration tests (transition matrix, partial-unique
  invariant, published-delete guard, read-filter); migration validation on a scratch DB;
  frontend build + manual console pass; one post-deploy smoke.
- **TA-4/5/6/7:** defined on activation.
- Do not rerun expensive suites when no relevant code changed; reuse valid results and cite
  the commit/DB state they were observed against. **The TA-1 DB checks (§14a) may be reused
  unless migrations, grants, policies, roles, or the target project have changed since the
  recorded observation** — re-run if any of those changed.

---

## 12. Estimation Policy

Estimates cover only approved required scope, separate implementation time from external
waiting (deploy, credential provisioning), state assumptions, and exclude backlog. They are
revised only when the contract changes. Do not sum the roadmap into one range. Current
per-task estimates: **TA-1 ≈ 0.5–1.5 h**, **TA-2 ≈ 2–4 h** (implementation only).
TA-3A/TA-3B and TA-4–TA-7 are estimated on activation.

---

## 13. Follow-Up Log

| ID | Finding | Why deferred | Impact | Suggested priority | Dependency |
|---|---|---|---|---|---|
| FU-1 | `origin/main` local ref was stale; confirm CI/deploy triggers point at the right `main` | Not needed for TA-1 read checks | Low–Med | Med | — |
| FU-2 | Drone MCDA subsystem is outside the CLAUDE.md MVP spec | Product decision, not architecture | Med | Med (doc) | — |
| FU-3 | `anon`/`authenticated` retain grants (incl. INSERT/UPDATE/DELETE) on PostGIS system objects `spatial_ref_sys`, `geometry_columns`, `geography_columns`; these are not RLS-protected. Migration `009` targeted application tables only. Worst case: a browser role could write junk SRID rows. Not application data. | **Keep deferred** — these objects are PostGIS-extension-managed; revoking grants without confirming Supabase/PostGIS expectations risks compatibility breakage. Accept the provider default unless a concrete write-path exploit or explicit security requirement justifies intervention. | Low | Low (do not action absent justification) | — |
| FU-4 | Cloud Build `d500f41d-1513-4149-a301-ee72ee5f75f8` deployed the backend successfully, then failed at `build-frontend` because `_SUPABASE_PUBLISHABLE_KEY` was empty. The frontend was not redeployed from `cb6c355`. | Deployment remediation belongs to TA-3A, not TA-1 verification | High for complete auth rollout | High | TA-3A |

*(A follow-up entry is not authorization to implement it.)*

---

## 14. Session Handoff Record

_Update at every interruption/compaction/session end. Read before resuming; do not
reconstruct the objective from memory._

- **Active task contract:** TA-1 — **partially complete** (DB checks, F1a, and F2 PASS;
  F1b remains blocked on a valid lower-role JWT). See §14a.
- **Branch / commit:** `claude/recent-pr-repo-review-39oloc`; synchronized from remote tip
  `52343f7` before this correction pass. PR #21 (draft, docs-only).
- **Modified / untracked files:** expected clean after the correction commit; verify with
  `git status` when resuming.
- **Work completed:** plan authored; TA-1 DB verification done — RLS + application-table
  privilege lockdown confirmed live (§14a); F1a unauthorized probe PASS; F2 deployed-source
  provenance PASS; external-review corrections applied.
- **Work remaining:** TA-1 F1b (needs a valid lower-role JWT). Then, per §5 and the
  single-active-contract rule: **finish or formally close TA-1, expand TA-5 to a full
  contract, get approval, then activate TA-5.**
- **Tests run:** two read-only SQL introspection queries against `iyijaywownhftzjwqhzj`;
  one read-safe no-token HTTP probe; read-only Cloud Run and Cloud Build inspection.
- **Live DB / cloud changes:** none (read-only).
- **Open PR / deployment state:** PR #21 open (draft); PR #20 merged; backend deployed and
  verified at `cb6c355`; frontend deployment from that build failed before completion (FU-4).
- **Blockers:** no valid lower-role test JWT is available for F1b.
- **Exact next action:** either (a) provide an existing lower-role test JWT to complete
  F1b, or (b) formally mark that residual check blocked, then expand
  TA-5 into a full contract for approval before activating it (single-active-contract rule).
- **Explicit exclusions:** no Track B surfaces; no `status`-column changes; no migration
  applied to a shared DB without approval.

---

## 14a. TA-1 Verification Record (2026-07-22)

Observed against Supabase project `iyijaywownhftzjwqhzj` (the `_SUPABASE_URL` the
deployed backend verifies JWTs against). Repo state `2a81186`.

| Check | Result | Observed |
|---|---|---|
| RLS enabled on all 22 `009` application tables | **PASS** | `relrowsecurity = true` for every listed table |
| No `anon`/`authenticated` privileges on the 22 application tables | **PASS** | none of the 22 appear in `role_table_grants` for either role |
| No residual browser-role grants anywhere in `public` | **PARTIAL** | only PostGIS system objects retain grants (`spatial_ref_sys`, `geometry_columns`, `geography_columns`) — not application data → FU-3 |
| F1a — no-token role-gated request → `401` | **PASS** | `PATCH /config/factors/__auth_probe__` with no token returned `401` and `{"detail":"Bearer access token required."}`. The nonexistent factor key guarantees no data mutation if auth were absent. |
| F1b — insufficient-role token → `403` | **BLOCKED** | requires a valid lower-role user/JWT (none available) |
| F2 — deployed image corresponds to source ⊇ `cb6c355` | **PASS** | Cloud Run revision `hydro-backend-00059-d6x` runs image tag `d500f41d-1513-4149-a301-ee72ee5f75f8`; the matching global Cloud Build record resolves source revision exactly to `cb6c3552a0df61cc5a17f10794588ba27f43c8ba`. |

**Remaining blocker:** no valid lower-role JWT is available for F1b. The earlier Claude
environment lacked host egress and GCP access, but those environment-specific blockers were
resolved by resuming TA-1 in Codex with existing authenticated `gcloud`; no credentials were
created or changed.

**Posture conclusion:** migration `009`'s intended lockdown (RLS + zero browser-role
privileges on application tables) **is applied and verified live**. The deployed backend is
confirmed to run source `cb6c355` and rejects missing bearer tokens. Insufficient-role
behavior remains unverified pending F1b. The associated build did not complete the frontend
deployment because `_SUPABASE_PUBLISHABLE_KEY` was empty (FU-4 / TA-3A).

---

## 15. Completion Report (template — one per completed task)

- Objective achieved
- Concrete changes (files/systems)
- Verification results (with commit / DB / deploy state observed)
- Commit, branch, PR state
- Migration & deployment state
- Known limitations
- Deferred findings (→ §13)
- Rollback information
- Recommended next approved task

_Do not merge, deploy, modify live data, install system software, or broaden scope unless
the active task contract explicitly authorizes it._
