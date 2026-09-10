# Phase 7 walkthrough

## Identity

- Phase: `georef-recovery-calibration`
- Branch: `codex/georef-phase-7-recovery-calibration`
- Approved baseline commit: `f933f9e5489340cd204ec84ec3aee007999f2188`
- Implementation commit: `ff64ba6` (`feat: add georeferencing recovery calibration benchmark`)
- State-roadmap commit: `00a47a8` (`chore: record georeferencing phase roadmap`)
- Deployment: none; deployment is outside this phase

## Scope

Phase 7 establishes repeatable Recovery calibration and real-world benchmark evidence. It covers supported image transformations, unsupported projective distortion, wrong-source rejection, runtime and peak-memory reporting, and explicit separation of source agreement, registration accuracy, surveyed accuracy, and physical-capture validation.

Phase 8 delivery, Phase 8A GeoParquet architecture, country expansion, database migrations, runtime scraping, and raw source dataset commits remain outside this phase.

## Evidence recorded

### Implementation and regression evidence

- The approved post-edit verification recorded zero new, changed, ambiguous, or out-of-scope failures.
- The Phase 7 Recovery benchmark test suite passed locally on 2026-09-10:
  - Command: `C:/Users/kyleg/Documents/Codex/hydrographic-poster-generator/work/georef-env/Scripts/python.exe -m pytest backend/tests/test_georef_recovery.py -q -rs`
  - Result: `14 passed in 79.98s`
- The suite covers unchanged, rotation, resize, crop, JPEG degradation, anisotropic scaling, affine shear, combined degradation, unsupported projective distortion, wrong-source rejection, blank-image fail-closed behavior, collinear-control rejection, and out-of-image control rejection.

### Existing country-level evidence

- The approved georeferencing release record reports `40/40` Recovery recipes across Jamaica and Belize, with provisional thresholds and a worst recipe p95 independent error of `6.84` uploaded-image pixels.
- The earlier MVP record reports `8/8` cases on `81` real Jamaica HydroRIVERS features, with p95 grid error ranging from `0.03` to `5.55` uploaded-image pixels.
- These records are useful historical evidence, but they do not constitute a newly generated per-country report for the current Phase 7 implementation.

## Findings

### Confirmed

- The benchmark code now reports successful-recovery rate, false accepts, false rejects, per-case runtime, peak traced Python memory, independent transform error, and failure reasons.
- Unsupported projective distortion and wrong-source cases are evaluated as negative cases and must fail closed.
- The benchmark does not claim surveyed absolute accuracy or physical capture validation.
- The repository preflight passes with the roadmap and walkthrough changes committed within the approved Phase 7 paths.

### Remaining closeout gate

- A committed, country-specific Guyana Recovery benchmark report was not found in the current repository or Phase 7 verification directory.
- Phase 7 should remain `closeout_pending` until Guyana evidence is either generated through the approved offline/live benchmark workflow or explicitly waived by human review with a documented rationale.

## Risks and rollback

- Provisional thresholds are not global calibration or surveyed accuracy.
- Country and source differences may change results; weak coverage must remain partial or unavailable rather than being promoted to complete.
- Rollback is a reviewed revert of the Phase 7 implementation and evidence records. No database, object-store, secret, or user-state rollback is required.

## Exit criteria

- Implementation and regression criteria: pass.
- Country-level evidence criteria: pending Guyana-specific report or explicit human waiver.
- Phase status: not yet closed.

## Next action

Generate and review the Guyana country-level report using the same benchmark path as the Jamaica and Belize evidence. Once that gate passes, update this walkthrough with the report identity and numeric results, mark Phase 7 closed, and prepare the Phase 7 closeout PR. Do not begin Phase 8 or Phase 8A automatically.
