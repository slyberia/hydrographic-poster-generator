# Phase 12 walkthrough

## Scope

Implemented a machine-readable registry, deterministic manifest review service,
CLI, reproducible HITL rubric, and regression tests. The runner consumes the
five existing country manifests only; it does not fetch sources, rebuild
artifacts, write to production, or expand country coverage.

## Evidence

- Approved baseline: `05f772b7b03d898e101072aa619631ac415b1ba8`.
- Baseline: 246 backend tests passed; TypeScript and frontend lint passed.
- Post-edit verification: backend, TypeScript, frontend lint, and file-scope
  comparison passed.
- Regression runner reproduced existing country statuses and surfaced Guyana's
  legacy missing provenance/summary fields as `review_required`.
- Missing qualifying source objects remain target-level `not_evaluated`.

## Rollback

Revert the Phase 12 commit or remove the registry, runner, tests, and docs.
Existing country artifacts and production state are unaffected.

## Human review items

Review the rubric thresholds and the intentional Guyana legacy-schema flag
before merging. New country coverage remains a later, separately reviewable
operation.
