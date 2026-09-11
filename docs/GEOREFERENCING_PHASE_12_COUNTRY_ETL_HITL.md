# Phase 12 — Country ETL and HITL review automation

Phase 12 establishes a reusable country-evaluation control plane before new
country coverage is attempted. The registry, deterministic review service,
CLI, rubric, and regression tests consume the five existing country manifests.

The acceptance gate is equivalence: Belize, Costa Rica, Guyana, Jamaica, and
Suriname must retain their existing country classifications and target-level
limitations. The pipeline does not rebuild artifacts, scrape sources at
runtime, modify the Recovery algorithm, migrate the database, or publish new
country coverage.

## Rollback

Revert the Phase 12 commit or remove the registry, runner, tests, and documents.
Existing country artifacts and production state are unaffected.
