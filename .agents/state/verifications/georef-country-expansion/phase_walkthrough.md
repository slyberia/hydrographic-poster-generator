# Phase 6 walkthrough

## Identity

- Phase: `georef-country-expansion`
- Branch: `codex/georef-phase-6-country-expansion`
- Baseline commit: `343c5fc78199b90474394e8048bba720fb37d324`
- Final commit: this phase commit
- Approved baseline artifact:
  `.agents/state/baselines/georef-country-expansion/baseline_approved.json`
- Deployment revision: none; deployment is outside this phase

## Findings

### Confirmed findings

- The existing browser and API contracts were already country-neutral except
  for the service's hard-coded Guyana registry and the QC download filename.
- Belize's production geography UUID is
  `3060e4d0-361c-4095-808e-bccfffb8426f`.
- Government of Belize references support the bounded eight-system evaluation
  scope.
- Seven systems produced qualifying OSM river/stream geometry and matched
  HydroRIVERS reaches. Rio Hondo did not, so Belize is partial.
- The Sibun OSM river relation contains 1,152 display segments; this is one
  source object, now reported separately from segment count.

### Assumptions verified or disproven

- Verified: the existing immutable artifact route and lazy viewer can serve a
  second country without a schema or storage change.
- Disproven: every independently selected Belize target would clear the Guyana
  pilot criteria. Rio Hondo remains explicitly unverified.
- Verified: source filtering can be constrained to Nominatim results classified
  as OSM waterways of type river or stream.

### Remaining risks

- The thresholds remain source-to-source heuristics, not surveyed calibration.
- OSM completeness, segmentation and naming practice vary by country.
- Belize is partial and must not be represented as nationally complete.
- Remaining countries require their own bounded target selection and review.

## Changes

### Files changed

- Generalized the offline builder around versioned country profiles.
- Added Guyana and Belize build profiles.
- Added the content-addressed Belize artifact, source record, evaluation and
  manifest.
- Replaced the hard-coded runtime registry with a safe packaged-manifest
  catalog.
- Added additive coverage status and country-derived QC filenames.
- Added backend, route and browser contract regressions.
- Added country coverage and expansion documentation.

### Out-of-scope files detected

- None.

### Contracts changed

- River-name manifests may add `coverage_status` with `verified`, `partial`
  or `unavailable`.
- Evaluation schema v2 adds independent reference, target summary,
  source-object count and display-segment count.
- Existing Guyana schema v1 artifacts and URLs remain accepted unchanged.

### Behavior preserved

- Names remain opt-in and lazy-loaded.
- Unsupported geographies continue to return not evaluated.
- HydroRIVERS remains authoritative for rendering and georeferencing QC.
- No runtime OSM/Nominatim calls, database writes, geometry duplication,
  migrations, accounts, deployment, or poster basemap export were added.

## Verification

### Tests added

- Belize profile provenance and alias normalization.
- Belize checksum, partial status, target summary and waterway-only sources.
- Belize poster-scoped manifest and immutable artifact route.
- Country coverage display and country-derived QC download filename.

### Commands run

- Repository preflight and dependency inventory.
- Focused backend: 22 passed.
- Full post-edit verification.
- TypeScript and full frontend lint.
- Next.js production build: 27 routes.
- Playwright naming flow: 1 passed.
- `git diff --check`.

### Baseline results

- Backend: 228 passed, 3 expected skips.
- TypeScript: passed.
- Full frontend lint: passed.

### Post-edit results

- Backend: 231 passed, 3 expected skips.
- TypeScript: passed.
- Full frontend lint: passed.
- New, changed or ambiguous failures: zero.
- Out-of-scope files: zero.
- Production build: passed.
- Focused browser flow: passed.

### Human-reviewed differences

- The user approved the clean baseline on 2026-09-08.

### Browser evidence

- The mocked end-to-end user flow verified lazy naming, four status colors,
  partial country wording, inspected river attributes, and
  `gy-river-naming-qc.json` download naming.
- Initial browser launch was sandbox-blocked; the same test passed after the
  approved local browser launch.

## Deployment

- Deployment status: not performed.
- Human approval reference: Phase 6 scope and baseline approved in this task.
- Production verification: pending merge-triggered deployment and operator
  review.

## Rollback

- Revert the Phase 6 commit to restore the Guyana-only registry and UI wording.
- No database, object-store, secret or user-state rollback is required.
- The Belize artifact is packaged and immutable; removing its manifest from the
  application makes it unavailable without affecting Guyana.

## Exit criteria

- Pass.
- Failed criteria: none.
- Human decision required: review and merge the draft PR; deployment remains
  outside this task.

## Recommended next action

Review the draft PR, then merge when satisfied. After deployment, verify one
Belize result loads the partial naming layer and downloads the Belize QC file.
Do not begin another country expansion phase automatically.
