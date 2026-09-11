# Georeferencing HITL review rubric

The country pipeline performs deterministic ETL review over a packaged country
manifest. It does not fetch sources, rebuild artifacts, or silently change a
country result.

## Dispositions

- `accepted`: all automated checks pass and no limitation was recorded.
- `accepted_with_limitations`: automated checks pass, but one or more targets
  have no qualifying source object and remain explicitly `not_evaluated`.
- `review_required`: provenance, accounting, status, or another judgment rule
  requires human adjudication.
- `blocked`: an integrity check failed; publication stops.

## Review checks

1. `source_provenance`: authoritative publisher and reference title exist.
2. `artifact_integrity_metadata`: artifact path, checksum, and byte size exist.
3. `target_accounting`: every selected target is represented and summary counts
   reconcile exactly.
4. `country_status_consistency`: observed status matches the approved registry.
5. `missing_source_objects`: zero-source targets are retained as
   `not_evaluated`, never fabricated as matches.

Human review is required for `review_required` or `blocked`, for a new source
family, and for the defined sample of routine accepted results. Country status
continues to derive from target outcomes: any passing targets can yield
`partial`; all passing targets can yield `verified`.
