# Phase 8A walkthrough

## Identity

- Phase: `georef-geoparquet-foundation`
- Branch: `codex/georef-phase-8a-geoparquet-foundation`
- Approved baseline commit: `a2ec098a95a3a224d10170931030a4336e66515f`
- Deployment: none

## Scope delivered

- Added a GeoParquet 1.1 writer and reader using WKB geometry and explicit geo metadata.
- Added deterministic feature ordering, canonical properties, Zstandard compression, and round-trip validation.
- Added country/data-product manifest output with CRS, source version, provenance, feature count, byte size, and SHA-256.
- Added a format comparison harness covering GeoJSON, GeoParquet, FlatGeobuf, and a representative MVT tile.
- Kept GeoParquet as the canonical reusable artifact; browser tiling remains derived delivery rather than a competing source of truth.
- Added PyArrow as the only production dependency required by the GeoParquet implementation. GeoPandas/Pyogrio/MVT tooling was used only for analysis and is not included in production requirements.

## Evidence

Analysis-only bakeoff on the packaged 58-feature Guyana river-name artifact:

| Representation | Size | Feature count | Role |
|---|---:|---:|---|
| GeoJSON | 836,395 bytes | 58 | Debug/export baseline |
| GeoParquet | 289,924 bytes | 58 | Canonical reusable artifact |
| FlatGeobuf | 350,000 bytes | 58 | Interchange alternative |
| MVT z0-x0-y0 | 2,405 bytes | 58 | Derived display candidate |

The MVT figure is one encoded tile and does not represent a complete PMTiles
archive. It demonstrates the browser-delivery shape, not final tile partitioning.

## Verification

- GeoParquet tests: `2 passed in 1.30s`.
- Full post-edit verification passed against the approved baseline:
  - backend: `243` cases, exit `0`
  - TypeScript: exit `0`
  - frontend lint: exit `0`
  - out-of-scope files: `0`
  - new, changed, or ambiguous failures: `0`
- Real packaged Guyana artifact built and read back successfully.

## Exclusions and limitations

- No raw source geometry was committed; the packaged artifact was used as a bounded fixture.
- No database migration, country expansion, runtime scraping, or production deployment was performed.
- Browser parsing of GeoParquet is not required; a future derived PMTiles/MVT delivery slice must preserve source version and integrity metadata.
- Field/surveyed accuracy remains outside this phase.

## Rollback

Revert the Phase 8A commits and remove the GeoParquet dependency from the
environment. Existing GeoJSON/debug and packaged artifact routes remain
available; no database or object-store deletion is required.

## Exit criteria

- Canonical GeoParquet schema and metadata: pass.
- Deterministic build and round-trip read: pass.
- Provenance, hash, CRS, and country partition contract: pass.
- Measured comparison with GeoJSON, FlatGeobuf, and MVT: pass, with MVT explicitly recorded as a single-tile measurement.
- Python interoperability: pass; R interoperability is schema-level through standard GeoParquet metadata and remains a consumer validation item.
- Scope compliance and full verification: pass.
- Phase status: closeout-ready, pending human review and merge of the Phase 8A PR.

## Next action

Review and merge the Phase 8A closeout PR. Phase 9 country expansion remains a
separately gated phase and must use this artifact contract.
