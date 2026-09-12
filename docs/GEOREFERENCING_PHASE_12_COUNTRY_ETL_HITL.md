# Phase 12 — Country ETL and HITL review automation

Phase 12 establishes a reusable country-evaluation control plane and executes
the approved 21-country coverage batch. The registry, deterministic review
service, CLI, rubric, staged ETL runner, and regression tests preserve the five
existing country manifests.

The acceptance gate is equivalence: Belize, Costa Rica, Guyana, Jamaica, and
Suriname must retain their existing country classifications and target-level
limitations. The pipeline performs bounded build-time source extraction; it
does not scrape sources at application runtime, modify the Recovery algorithm,
or migrate the database.

## 21-country execution

The approved profile set was executed with the staged runner. The aggregate
result is 4 `verified`, 7 `partial`, and 10 `unavailable` outcomes. Seventeen
country artifacts were promoted after review; Antigua and Barbuda, Barbados,
The Bahamas, and Paraguay were withheld because no publishable input path was
available. Paraguay's live clip service response explicitly reported that its
registered geography was unavailable.

The five previously evaluated countries were not rebuilt; they remain
regression fixtures only. The complete machine-readable result is recorded in
`.agents/state/verifications/georef-country-etl-hitl/unevaluated-21-etl.json`.

## Rollback

Revert the Phase 12 commit or remove the registry, runner, tests, and documents.
Existing country artifacts and production state are unaffected.
