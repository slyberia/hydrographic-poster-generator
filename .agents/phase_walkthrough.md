# Phase Walkthrough

## Identity

- Phase: `reference-map-artifacts-scale-ux`
- Branch: `agent/reference-map-artifacts-scale-ux`
- Baseline commit: `7b3203b12f133f10e38313d7f48e7765bf430c16`
- Final commit: not committed in this phase execution
- Approved baseline artifact: `.agents/state/baselines/reference-map-artifacts-scale-ux/baseline_approved.json`
- Deployment revision: none; deployment was outside the approved phase

## Findings

### Confirmed findings

- The infrastructure SQL supplied untyped text parameters inside `jsonb_build_object`, reproducing PostgreSQL 42P18/42P08 failures in the deployed path.
- PostGIS contains the school and healthcare source data and remains authoritative.
- Migration 015 contains the curated Government, Police, and Fire data but has not been applied to production.
- Runway and safeguarding geometry remain unavailable and retain the Coming Soon state.
- The previous client fetched and cached one GeoJSON payload per category.

### Assumptions verified or disproven

- A unified artifact can preserve independent toggles by adding `reference_layer_key` and `reference_group` to every feature; browser verification confirmed category filtering.
- A stable manifest plus content-addressed artifact supports immutable caching without coupling reference data to a model run.
- Analyst/fresh-data behavior requires an explicit dynamic-path preference; the Planning Console now opts out of the artifact while public/published surfaces prefer it.

### Remaining risks

- Government, Police, and Fire remain empty in production until migration 015 is separately approved and applied.
- The Storage manifest/artifact does not exist until the new admin materialization endpoint is invoked after deployment.
- The managed Windows sandbox blocks Playwright Chromium startup with `spawn EPERM`; CLI E2E assertions were type-checked but browser execution used the connected in-app browser.

## Changes

### Files changed

- Backend: `backend/app/services/drone_reference_service.py`, `backend/app/routers/public_drone.py`, `backend/app/routers/admin.py`, `backend/tests/test_drone_reference_layers.py`
- Frontend runtime: `frontend/src/lib/publicDroneApi.ts`, `frontend/src/lib/referenceLayers.ts`, `frontend/src/components/drone/MapView.tsx`, `frontend/src/components/drone/ReferenceLayerControls.tsx`, `frontend/src/components/drone/PublicExplorer.tsx`, `frontend/src/app/drone/dashboard/page.tsx`, `frontend/src/app/drone/console/page.tsx`, `frontend/src/app/globals.css`
- Frontend tests: `frontend/e2e/mockBackend.ts`, `frontend/e2e/drone-explore.spec.ts`, `frontend/e2e/drone-console.spec.ts`
- Documentation/state: `docs/DRONE_REFERENCE_LAYERS.md`, `docs/DRONE_REFERENCE_DATA.md`, `.agents/state/current_phase.json`, `.agents/config/verification_commands_reference_map_artifacts_scale_ux.json`, phase baseline/verification evidence, and this walkthrough

### Out-of-scope files detected

- None. Post-edit scope verification passed.

### Contracts changed

- `GET /public/drone/reference-layers/config` additively returns optional `manifest_url` and version `reference-layers-v2`.
- `POST /admin/materialize-reference-layers` writes a stable manifest and immutable unified GeoJSON artifact.
- Unified features include `reference_layer_key` and `reference_group`.
- Dynamic `GET /public/drone/reference-layers/{key}` remains supported and now uses explicitly typed parameters plus indexed subtype predicates.
- Session cache key is `drone-reference-dataset:{dataset_version}`; legacy category cache keys include config version.

### Behavior preserved

- PostGIS is authoritative; materialization does not update analytical records.
- Reference layers remain contextual and do not affect zoning, scores, or model runs.
- Public/published maps use the fast artifact when available and fall back to category APIs when it is absent.
- Planning Console reference data stays on the dynamic API path.
- Existing +/- zoom controls remain available.

### Documentation changed

- Documented Storage paths, manifest schema, fallback behavior, caching, scale UX, deployment sequence, and rollback.
- Documented migration 015 as the production availability prerequisite for Government, Police, and Fire.

## Verification

### Tests added

- Explicit SQL parameter-cast and indexed-subtype assertions.
- Unified feature filter-property contract.
- Manifest URL contract.
- Optional-storage fallback.
- Content-addressed artifact and stable-manifest upload contract.
- E2E fixtures for unified artifact loading, cache reuse, category fallback, public-safety availability, zoom targets, and scale display.

### Commands run

- Backend targeted pytest: 29 passed, one upstream Starlette deprecation warning.
- Frontend ESLint: passed with zero warnings/errors.
- TypeScript `tsc --noEmit`: passed.
- Next.js production build: passed.
- `git diff --check`: passed.
- `.agents/scripts/post_edit_verification.py`: passed.

### Baseline results

- 24 backend tests passed.
- Lint passed with two pre-existing hook warnings.
- Production build and diff check passed.

### Post-edit results

- 29 backend tests passed.
- Lint passed with zero warnings, resolving both baseline hook warnings.
- TypeScript and production build passed.
- Verification matched the approved baseline and allowed-file scope.

### Human-reviewed differences

- Human approved the phase-state update and baseline in the current session.
- No production, database, migration, deployment, merge, secret, or dependency operation was performed.

### Browser evidence

- Connected browser loaded `/drone/explore` against a temporary in-memory API implementing config → manifest → artifact.
- Unified artifact rendered Airport and School markers independently.
- Z13 Schools target moved the map and updated the readout to `Z13 · Neighbourhood`, approximately `1 : 72,000`, with a `2 km` scale bar.
- Airport Notification Area target moved to Z9; the polygon rendered with dashed stroke and `fill-opacity=0.2` above the zoning surface. Readout updated to approximately `1 : 1,100,000` with a `20 km` bar.
- Government, Police, and Fire controls were present and enabled; Runways and Runway Safeguarding remained disabled with Coming Soon notes.
- A fresh cold-load tab contained development/HMR informational messages only and no errors or warnings. One dependency-array-size warning appeared only when Fast Refresh hot-swapped the edited hook into the already-mounted pre-edit page and did not reproduce on cold load.
- Desktop screenshot showed no horizontal overflow. Responsive CSS and the existing viewport matrix remain covered in the E2E source, but CLI Chromium execution is blocked by the sandbox.

## Deployment

- Deployment status: not performed
- Human approval reference: implementation approval only; no production-operation approval
- Production verification: pending deployment, migration 015, materialization, and live readback

## Rollback

- Roll back the application revision through the normal Git/Cloud Run rollback workflow.
- Older clients ignore `manifest_url`; current clients automatically use category APIs if manifest retrieval fails.
- Storage objects are additive and do not need deletion for rollback.
- Migration 015, when later applied, is additive reference-only data and requires its own approved rollback decision.

## Exit Criteria

- Pass: local implementation, tests, build, browser evidence, documentation, and scope verification
- Failed criteria: none inside the approved implementation phase
- Human decision required: separate authorization for commit/push/PR, production migration, deployment, materialization, and production verification

## Recommended Next Action

Review the diff, then authorize the local commit and PR workflow. Do not begin production migration or deployment automatically.
