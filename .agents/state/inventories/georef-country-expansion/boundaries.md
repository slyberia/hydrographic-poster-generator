# Phase 6 dependency classification

## Producers

- `scripts/build_river_name_artifact.py` creates the source record, evaluation,
  content-addressed display artifact, and stable country manifest.
- `backend/app/services/river_name_service.py` resolves geography IDs and
  validates content-addressed artifacts before returning them.

## API consumers

- `backend/app/routers/georef.py` exposes the poster-scoped manifest and
  immutable artifact routes.
- `frontend/src/lib/georefApi.ts` fetches the stable manifest and then its
  versioned artifact.

## UI consumers and cache

- `frontend/src/components/GeorefMap.tsx` lazy-loads names only after the user
  enables them and joins records to inspected HydroRIVERS IDs.
- Browser session state is limited to the existing poster handoff; the naming
  artifact itself relies on HTTP immutable caching.

## Tests and fixtures

- `backend/tests/test_river_names.py` verifies checksum, evaluation, states,
  normalization, and unsupported-country behavior.
- `backend/tests/test_georef_routes.py` covers poster-scoped route behavior.
- `frontend/e2e/georef-names.spec.ts` is the mocked user-flow contract.

## Persisted and deployment copies

- `backend/app/data/river_names/<country>/` contains only bounded published
  artifacts and lightweight evidence; no HydroRIVERS geometry is retained.
- The backend container packages these files. There is no Supabase geometry,
  migration, secret, or runtime OSM/Nominatim dependency.

## Documentation and unrelated matches

- `docs/GUYANA_RIVER_NAMES.md` documents the pilot; Phase 6 will add the
  cross-country workflow and measured country status.
- Broad matches for “dataset” elsewhere in the repository are unrelated to the
  river-name contract and remain out of scope.

## Risks to verify

- Country-specific aliases must not leak into the generic matcher.
- A country can publish warning or partial evidence without being mislabeled as
  verified.
- Existing Guyana URLs and checksums must remain valid.
- Unsupported geographies must continue to abstain with a clear 404.
- Generated display artifacts must stay bounded and must not contain
  HydroRIVERS geometry.
