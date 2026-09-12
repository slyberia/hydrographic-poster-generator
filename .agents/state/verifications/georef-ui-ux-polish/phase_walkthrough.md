# Phase 13 walkthrough

## Scope

Polished the Georeferencer page as a presentation and interaction layer while
preserving recovery behavior, API contracts, map lazy loading, evidence
semantics, country classifications, and accuracy disclaimers.

- Added a guided upload/context/review hierarchy.
- Added keyboard-accessible drag-and-drop upload presentation with file
  metadata and replacement affordance.
- Improved advanced-input disclosure, primary/secondary action hierarchy,
  loading feedback, and error presentation.
- Structured result status, metrics, evidence, preview, downloads, and map
  inspection into distinct review panels.
- Grouped map controls and retained explicit lazy-loading and visual-context
  disclaimers.

## Verification

- Approved baseline: `eb53a56d37bbafbd1dc911ac643398d534e448e2`.
- Post-edit verification: backend, TypeScript, frontend lint, and file-scope
  comparison passed.
- Focused `georef-names.spec.ts`: 1 passed.
- Existing integration-dependent `georef.spec.ts`: 2 skipped because
  `GEOREF_INTEGRATION` was not enabled.
- Headed Playwright CLI inspection was unavailable because the local daemon
  exited immediately in this Windows environment; no visual result is claimed
  from that attempt.

## Scope review

- No backend files, API contracts, recovery algorithms, geospatial artifacts,
  ETL, runtime scraping, or production data were changed.
- Existing accessible names used by the E2E suite were preserved after the
  visual redesign.

## Rollback

Revert the Phase 13 implementation commit. Phase 12 data and production state
are unaffected.

## Closeout items

Human review should confirm the visual hierarchy, responsive composition, and
the decision to keep the map and naming controls explicitly lazy-loaded.
