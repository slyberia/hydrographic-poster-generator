# Draft: clarify georeferencing QC and add geographic inspection

Target: `main` from `codex/georef-inspection`.
Status: draft PR description; user authorized commit, branch push and GitHub
publication on 2026-09-06. Merge and deployment remain excluded.

## Summary

This is the verified QC/viewer portion of the inspection phase, not completion
of the Guyana named-river pilot. The user approved preparing this portion
separately while the naming-data blocker is resolved.

- Separate tolerant source-network agreement from registration residuals and
  unmeasured surveyed accuracy. Report approximate ground tolerance, withheld
  pixel residuals and measured out-of-frame source vertices. Preserve existing
  acceptance thresholds and legacy fields.
- Add an optional shared geographic viewer for Native and Recovery results,
  using the actual TIFF thumbnail and its complete affine transform, including
  rotation and shear. Add opacity adjustment and opt-in OpenStreetMap tiles.
- Add read-only, viewport-clipped HydroRIVERS inspection (maximum 250 reaches),
  click/keyboard reach selection and existing attributes. Reject invalid bounds,
  missing manifests and changed source-ID selections. Names remain explicitly
  `Not evaluated`; missing attributes are not fabricated.
- Change the page heading to Georeferencer. The shared navigation label is
  unchanged.
- Preserve metadata-only persistence and ephemeral raster handling. No new
  packages, schema migrations, accounts, source datasets or deployment changes.

## Verification

- Backend: 224 passed, three unchanged baseline skips, two dependency warnings.
- Approved baseline: 211 passed, three skipped; per-test comparison reports no
  missing baseline tests, changed results or new failures.
- TypeScript and full frontend lint passed.
- Four Playwright tests passed: two browser workflows (Native and Recovery)
  and two affine-placement checks. Browser coverage includes downloads, QC,
  map/source selection, opacity, basemap toggle, clearing, error-result retention,
  mobile width and console checks.
- Changed-file scope and whitespace checks passed.

Evidence: `docs/GEOREFERENCING_INSPECTION.md` and
`.agents/state/verifications/georef-inspection/`.

## Evidence limits — review before merge

- Browser integration used real processing and a Jamaica source snapshot, but
  simulated local persistence/readiness and tile responses. This is not production
  persistence verification, live basemap verification or geographic calibration.
- Local Google Fonts requests were blocked; screenshots use fallback fonts.
  No production build or deployment was performed in this phase.
- QC thresholds remain provisional. Neither source overlap nor withheld matches
  establish independently surveyed accuracy.
- The source-ID hash detects changed record selection, not geometry edits under
  unchanged IDs. The response cap does not bound the initial country source clip.
- No distributed abuse limiter was added. Verify resource limits and deployed
  tile attribution/referrer behavior before release.

## Explicitly deferred

Guyana river-name matching, provenance-backed candidate labels and independent
evaluation remain unfinished. Public source retrieval failed (HTTP 406 and
alternate-server timeout); no speculative name mappings were added. The pilot
still needs a pinned reference and separately reviewed evaluation examples.
Global naming, basemap/poster-label exports and account features remain excluded.

## Compatibility and rollback

Viewer fields and inspection route are additive. Old clients retain existing
fields; new clients show a fallback message for older responses without placement.
No new schema or browser-persisted state requires migration. Rollback is a reviewed
revert of these changes to the PR61 baseline, not a reset of user work.

Keep this PR in draft until review and remaining release checks are complete.
The user performs any eventual merge; no merge or deployment is requested here.
