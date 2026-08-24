# Phase Walkthrough

## Identity

- Phase: `supabase-security-hardening`
- Branch: `agent/supabase-security-hardening`
- Baseline commit: `1b44e709923662b1c31896210f51b00606b517e4`
- Final commit: not committed in this phase execution
- Approved baseline artifact:
  `.agents/state/baselines/supabase-security-hardening/baseline_approved.json`
- Deployment revision: none; production operations remain outside this phase

## Findings

### Confirmed findings

- Six application-owned trigger functions had no fixed `search_path`.
- All 27 RLS-without-policy notices are intentional: production grants no
  application-table DML privileges to `anon` or `authenticated`.
- The application serves database content through FastAPI's direct PostgreSQL
  connection. The Supabase Data API exposes the dedicated empty `api` schema.
- Production PostGIS 3.3.7 is installed in `public`, is non-relocatable, and
  owns 876 dependent objects.
- Planning Console login and invitation acceptance use Supabase password Auth,
  so leaked-password protection is applicable.

### Assumptions verified or disproven

- Adding RLS policies would not remediate a vulnerability; it would grant a
  browser data path that the architecture intentionally denies.
- Moving PostGIS is not a safe ordinary migration. Current Supabase guidance
  requires backup/drop/recreate/restore or provider assistance.
- The boundary trigger can remain portable by discovering the installed
  PostGIS namespace and safely quoting it in the generated function body.
- Password-protection enablement requires no frontend change because the
  invitation form already displays Supabase Auth errors.

### Remaining risks

- Migration 017 has not yet been executed by PostgreSQL; local verification is
  static plus application regression coverage because this phase prohibits a
  production migration and no disposable PostGIS database is attached.
- Leaked-password protection remains disabled until the later production
  configuration step, and requires Supabase Pro or higher.
- Intentional RLS informational notices and the accepted PostGIS warning will
  remain visible after rollout.

## Changes

### Files changed

- Migration: `db/migrations/017_supabase_security_hardening.sql`
- Migration contract: `backend/tests/test_supabase_security_hardening.py`
- Security posture: `docs/SUPABASE_SECURITY.md`
- Deployment/database documentation: `docs/DEPLOYMENT.md`, `db/README.md`
- Approved phase, baseline, verification artifacts, and this walkthrough

### Out-of-scope files detected

- None. Post-edit scope verification passed.

### Contracts changed

- No application API, frontend, persisted-state, or storage contract changed.
- Six existing trigger functions now have `search_path = ''` and
  schema-qualified runtime references.
- Function schemas, names, argument lists, return types, owners, privileges,
  and attached triggers are preserved.

### Behavior preserved

- Timestamp triggers still assign `now()`.
- Boundary ingestion still validates, repairs, and subdivides geometry.
- Published runs and cell results retain their existing immutability rules.
- Browser roles remain denied direct application-table access.
- PostGIS remains in its existing schema; no extension or data object moves.

### Documentation changed

- Added the authoritative treatment of each Supabase Security Advisor notice,
  rollout order, expected residual notices, verification queries, and rollback
  guidance.
- Extended the production checklist with migration 017, Data API, Auth, and
  accepted-warning checks.

## Verification

### Tests added

- Exact coverage for all six warned function definitions and empty search paths.
- Schema qualification for built-in, application-table, and dynamically
  discovered PostGIS references.
- Negative contracts preventing RLS weakening, browser DML grants, or PostGIS
  relocation in migration 017.

### Commands run

- Approved targeted baseline: 36 passed.
- Targeted implementation pass: 39 passed.
- Post-edit verification: all configured commands passed.
- Complete backend suite with repository Python 3.11 + GTK/Cairo runtime:
  180 passed, 3 skipped.
- `git diff --check`: passed; only expected Windows autocrlf notices were emitted.
- Read-only production catalog/advisor queries confirmed the access model,
  function metadata, extension metadata, and built-in type/function references.

### Baseline results

- 36 relevant authentication, publication, and ingestion tests passed.
- Git whitespace validation passed.
- One upstream Starlette deprecation warning was present.

### Post-edit results

- 39 targeted tests passed, including three new migration contracts.
- The full backend suite passed in the repository's validated render runtime.
- Post-edit scope and baseline comparison passed with no new or changed failures.

### Human-reviewed differences

- Human approved the phase definition and baseline in the current session.
- No production migration, Auth setting, deployment, commit, push, PR, merge,
  secret, dependency, RLS policy, or extension relocation was performed.

### Browser evidence

- Not applicable to local implementation; no UI behavior changed.
- The Supabase dashboard browser session was signed out, so Auth configuration
  remains a later authenticated production step.

## Deployment

- Deployment status: not performed
- Human approval reference: implementation and baseline approval only
- Production verification: pending migration 017, leaked-password protection,
  advisor rerun, catalog queries, trigger smoke tests, and application smoke

## Rollback

- Reverting the application revision does not require reverting migration 017;
  function signatures and behavior remain compatible.
- If database rollback is required, apply a reviewed follow-up migration using
  the previous definitions from migrations 001, 005, 007, and 010.
- Do not drop or relocate PostGIS as rollback.
- No data or persisted browser state is changed by this phase.

## Exit Criteria

- Pass: scoped implementation, approved baseline comparison, migration
  contracts, targeted tests, full backend suite, documentation, rollback, and
  changed-file scope review
- Failed criteria: none inside the approved local implementation phase
- Human decision required: separate authorization for commit/push/PR and later
  production migration/Auth configuration/verification

## Recommended Next Action

Review the local diff, then authorize the local commit and PR workflow. Apply
migration 017 and change Auth configuration only after the PR is merged.
