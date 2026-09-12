# Phase 12 walkthrough

## Scope

Implemented a machine-readable registry, deterministic manifest review service,
CLI, reproducible HITL rubric, staged ETL runner, and regression tests. The
five existing countries remain regression fixtures only.

## Evidence

- Approved baseline: `0e78a1217ff15713bfdd0930e96a319439398e56`.
- Baseline: 249 backend tests passed; TypeScript and frontend lint passed.
- Post-edit verification: backend, TypeScript, frontend lint, and file-scope
  comparison passed.
- Regression runner reproduced existing country statuses and surfaced Guyana's
  legacy missing provenance/summary fields as `review_required`.
- Missing qualifying source objects remain target-level `not_evaluated`.
- The 21-country ETL completed with 4 verified, 7 partial, and 10 unavailable
  outcomes; 17 artifacts were promoted and 4 were withheld.
- Paraguay was withheld because the live clip service reports its registered
  geography as unavailable. Antigua and Barbuda, Barbados, and The Bahamas
  were withheld because their authoritative profiles document no named
  perennial river systems.

## Rollback

Revert the Phase 12 commit or remove the registry, runner, tests, and docs.
Existing country artifacts and production state are unaffected.

## Human review items

Review the rubric thresholds and the intentional Guyana legacy-schema flag
before merging. Review the broad portal references in the newly seeded profiles
before treating their source provenance as final. Follow-up corrections remain
separately reviewable.
