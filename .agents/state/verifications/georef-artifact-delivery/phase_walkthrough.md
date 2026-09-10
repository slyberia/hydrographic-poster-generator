# Phase 8 walkthrough

## Identity

- Phase: `georef-artifact-delivery`
- Branch: `codex/georef-phase-8-artifact-delivery`
- Approved baseline commit: `fe5decf1f5a3f42a3455264835ae10c1ae715573`
- Deployment: none; production publication remains separately authorized

## Scope delivered

- Added deterministic JSON canonicalization and SHA-256 content addressing.
- Added an artifact manifest contract recording object path, packaged fallback, checksum, byte size, media type, and immutable cache policy.
- Added checksum and byte-size verification before packaged artifacts are served.
- Added optional `GEOREF_ARTIFACT_CDN_BASE_URL` delivery without changing existing local fallback URLs.
- Applied the delivery boundary to georeferencing river-name manifests and datasets.
- Added a storage-neutral deterministic builder suitable for GCS/CDN publication.
- Added documentation for the delivery contract and operational boundaries.

## Verification

- Focused artifact-delivery tests: `4 passed in 0.19s`.
- Georef route and river-name compatibility tests: `26 passed in 8.90s`.
- Deterministic builder smoke test passed for the packaged Guyana manifest:
  - artifact size: `2,024` bytes
  - cache policy: `public, max-age=31536000, immutable`
  - content-addressed SHA-256 object path emitted
- Full post-edit verification passed against the approved baseline:
  - backend: `241` cases, exit `0`
  - TypeScript: exit `0`
  - frontend lint: exit `0`
  - out-of-scope files: `0`
  - new, changed, or ambiguous failures: `0`

## Behavior and fallback

- With no CDN base URL configured, existing packaged route URLs remain in use.
- With a CDN base URL configured, only the manifest-advertised artifact URL changes; the content hash and bytes remain authoritative.
- The packaged artifact remains available for offline/local operation and is verified before use.
- No database, storage, secret, deployment, or source-dataset mutation was performed.

## Explicit exclusions

- GeoParquet format selection or implementation belongs to Phase 8A.
- Country coverage expansion belongs to Phases 9–11.
- Database migrations, runtime scraping, and raw source dataset commits remain excluded.

## Rollback

Revert the Phase 8 application and documentation commits. Remove or disable
`GEOREF_ARTIFACT_CDN_BASE_URL` to return delivery to the packaged route. No
database or object-store deletion is required for application rollback.

## Exit criteria

- Deterministic content-addressed packaging: pass.
- Immutable cache metadata and integrity verification: pass.
- CDN-optional delivery with packaged fallback: pass.
- Existing route compatibility: pass.
- Verification and scope compliance: pass.
- Phase status: closeout-ready, pending human review and merge of the Phase 8 PR.

## Next action

Review and merge the Phase 8 closeout PR. Then create a separate Phase 8A
scope and baseline for the GeoParquet reusable data-product foundation.
