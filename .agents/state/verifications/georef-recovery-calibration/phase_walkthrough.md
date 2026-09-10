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
- The authorized live Guyana benchmark completed on 2026-09-10:
  - Report: `.agents/state/verifications/georef-recovery-calibration/guyana-benchmark.json`
  - Source: HydroRIVERS `hydro_rivers`, stream order `>= 3`, `6,635` features.
  - Supported cases: `9/9` passed; successful-recovery rate `1.0`.
  - Negative cases: `0` false accepts, `0` false rejects; unsupported perspective was rejected.
  - Accepted-case p95 independent error: `0.74181004127336` uploaded-image pixels.
  - Per-case runtime: approximately `12.98–18.99` seconds; peak traced Python memory: approximately `236.7–329.5 MB`.
  - Report SHA-256: `46CC9B5B09D9406D97A70E9734DC84B0401A42EB09B168BDA536DFEF618559EF`.

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

### Closeout determination

- The Guyana-specific evidence gate is satisfied by the authorized live run and retained numeric report.
- Results meet the Phase 7 initial targets: zero false accepts for the unsupported-projective case, at least 95% supported-case success, and accepted-case p95 error no greater than eight uploaded-image pixels.
- The result is still provisional calibration evidence; it is not surveyed absolute accuracy or physical-capture validation.

## Risks and rollback

- Provisional thresholds are not global calibration or surveyed accuracy.
- Country and source differences may change results; weak coverage must remain partial or unavailable rather than being promoted to complete.
- Rollback is a reviewed revert of the Phase 7 implementation and evidence records. No database, object-store, secret, or user-state rollback is required.

## Exit criteria

- Implementation and regression criteria: pass.
- Country-level evidence criteria: pass; Guyana report retained at the path above.
- Phase status: closeout-ready, pending human review and merge of the closeout PR.

## Next action

Review and merge the Phase 7 closeout PR containing this walkthrough and the retained Guyana numeric report. Do not begin Phase 8 or Phase 8A automatically; they remain separately gated planned phases.
