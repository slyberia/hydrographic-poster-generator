# Phase Walkthrough

## Identity

- Phase: `poster-flag-preset-catalog`
- Branch: `agent/poster-flag-preset-catalog`
- Baseline commit: `e8c5dee3b7d552b4ada95e2abc72fe2b72ebcf79`
- Final commit: not committed in this phase execution
- Approved baseline artifact:
  `.agents/state/baselines/poster-flag-preset-catalog/baseline_approved.json`
- Deployment revision: none; deployment was outside the approved phase

## Findings

### Confirmed findings

- Production exposes 26 Admin-0 poster geographies and has zero active
  `platform_rules` rows with `rule_type = 'flag'`.
- The repository and all reachable Git history contained only Guyana and USA
  flag definitions.
- `RulesService` previously treated any successful database load as complete,
  so density/palette/typography rows suppressed the entire hardcoded flag
  category.
- Studio bootstrap validated every saved style ID against `pre.palette`,
  including saved `mode: "flag"` selections.
- Reading localStorage during the initial Client Component render caused a
  hydration mismatch whenever saved state differed from server defaults.

### Assumptions verified or disproven

- The required union is 45 presets: 26 poster-generatable geographies plus 19
  G20 countries, with no overlap between those current sets.
- The EU and AU are regional G20 members and are excluded from the country
  palette catalog.
- French Guiana must remain independently selectable because it is a production
  poster geography; it uses the French tricolour.
- Puerto Rico remains excluded because it is only present in an ingestion plan,
  not the production poster geography registry.

### Remaining risks

- Representative flag colors are curated design inputs, not a regulatory flag
  reproduction standard.
- Migration 016 has not been applied or executed against production Postgres.
- Production will continue using hardcoded category fallback until migration
  016 is applied and the rule registry is reloaded.
- The managed Windows sandbox blocks Playwright Chromium startup with
  `spawn EPERM`; the equivalent interaction was verified in the connected
  in-app browser.

## Changes

### Files changed

- Catalog and resolver:
  `backend/app/config/flag_presets.py`,
  `backend/app/services/rules_service.py`
- Backend tests:
  `backend/tests/test_flag_presets.py`,
  `backend/tests/test_rules_service.py`
- Migration:
  `db/migrations/016_seed_flag_presets.sql`,
  `scripts/generate_flag_preset_migration.py`
- Frontend:
  `frontend/src/app/studio/page.tsx`,
  `frontend/e2e/mockStudioBackend.ts`,
  `frontend/e2e/studio-parity.spec.ts`
- Documentation/state:
  `docs/FLAG_PRESETS.md`, approved phase/baseline/verification artifacts, and
  this walkthrough

### Out-of-scope files detected

- None. Post-edit scope verification passed.

### Contracts changed

- The `GET /presets` response shape is unchanged; its `flags` collection now
  contains the canonical 45 presets when hardcoded rules are active.
- A reachable database remains authoritative for any represented rule category.
  Only an entirely absent category is filled from hardcoded configuration.
- Rules loaded from a mixed source report `database+hardcoded`.
- Migration 016 adds or updates `flag:<preset-id>` rows using guarded,
  idempotent upserts.
- Saved `mode: "flag"` state is validated against `pre.flags`, while standard
  mode continues to use `pre.palette`.

### Behavior preserved

- Existing `guyana` and `usa` IDs and exact token values are unchanged.
- Existing standard palette IDs and persisted standard-mode behavior remain
  unchanged.
- Database rows remain authoritative whenever their category is present.
- Custom database flag rows are not deactivated or removed.
- No new runtime dependency was added.

### Documentation changed

- Added catalog coverage, canonical-source rules, compatibility behavior,
  migration generation/check commands, extension workflow, deployment order,
  and rollback considerations in `docs/FLAG_PRESETS.md`.

## Verification

### Tests added

- Exact 26 + 19 = 45 coverage contract and alphabetical display order.
- Complete light/dark eight-token schema and valid hexadecimal colors.
- Exact Guyana/USA compatibility anchors.
- Migration snapshot equality with the canonical Python catalog.
- Typed `PresetsResponse` serialization of all 45 flags.
- Empty-category fallback, database category authority, and reload stale-state
  removal.
- Frontend persisted USA/Dark flag-mode reload scenario.

### Commands run

- Targeted backend contracts: 12 passed.
- Migration generator `--check`: 45 presets matched.
- Frontend ESLint: passed.
- TypeScript `tsc --noEmit`: passed.
- Next.js production build: passed.
- `git diff --check`: passed.
- `.agents/scripts/post_edit_verification.py`: passed.

### Baseline results

- Four backend router tests passed with one upstream Starlette deprecation
  warning.
- Frontend lint, production build, and diff check passed.

### Post-edit results

- Every enabled verification command exited zero.
- No new, changed, or ambiguous failures were detected.
- No out-of-scope path was detected.
- A clean Python 3.11 environment matching the production Dockerfile was
  created from `backend/requirements-dev.txt`. CairoSVG 2.7.1 was exercised
  against an isolated GTK/Cairo runtime, and direct PNG/PDF conversion passed.
- The complete `backend/tests` suite then passed with 177 tests passed, three
  skipped, and zero failures. The two warnings are an upstream Starlette
  pending deprecation and an optional pytest-cache write warning.

### Human-reviewed differences

- Human approved the phase definition and the baseline in the current session.
- No production, migration-application, deployment, commit, push, PR, merge,
  secret, or dependency operation was performed.

### Browser evidence

- A local Studio instance was connected to a temporary in-memory poster API.
- Country flags was selected, then United States and Dark.
- A fresh load restored Country flags, United States, and Dark.
- The final cold-load tab reported zero console errors.
- The original synchronous localStorage initializer reproduced a React hydration
  mismatch; the post-mount hydration gate removed it.
- Standalone Playwright reached `browserType.launch: spawn EPERM` before any
  page assertion. The connected in-app browser completed the equivalent flow.

## Deployment

- Deployment status: not performed
- Human approval reference: implementation and baseline approval only
- Production verification: pending migration 016, deployment, registry reload,
  `GET /presets` count/readback, and live Studio interaction

## Rollback

- Before production migration, revert the application revision normally.
- After migration 016, reverting the application remains safe because the
  existing FlagPreset model already accepts these rows.
- If the 45 database rows must be disabled, use a separately reviewed migration
  targeting only the exact canonical `flag:<preset-id>` IDs. Do not delete or
  deactivate unrelated custom flag rows.
- Browser state needs no schema rollback; existing IDs remain compatible.

## Exit Criteria

- Pass: local implementation, migration snapshot, targeted tests, lint,
  type-check, production build, browser verification, documentation, and scope
  verification
- Failed criteria: none inside the approved implementation phase
- Human decision required: separate authorization for commit/push/PR,
  production migration, deployment, registry reload, and production verification

## Recommended Next Action

Review the local diff, then authorize the local commit and PR workflow. Do not
apply migration 016 or deploy automatically.
