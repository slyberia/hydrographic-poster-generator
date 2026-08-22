# Drone reference layers — Milestone C

Reference layers are contextual map information, not MCDA outputs. PostGIS/source tables remain authoritative. Public maps prefer one content-addressed GeoJSON artifact and filter its `reference_layer_key` properties in the browser; category endpoints remain the compatibility path for fresh data and mixed deployments.

## Initial scale policy

| Layer | Minimum zoom | Label zoom | Default |
|---|---:|---:|---|
| Airports | 8 | 11 | On |
| Runways | 11 | 13 | On in Console; available elsewhere |
| Runway safeguarding | 10 | 13 | On in Console/Explorer |
| Airport notification area | 9 | 12 | Off |
| Healthcare | 12 | 14 | Off |
| Schools | 13 | 15 | Off |
| Government | 13 | 15 | Off |
| Police | 14 | 16 | Off |
| Fire | 14 | 16 | Off |

These are initial Region 4 thresholds selected from the supplied Milestone C V2 design's regional/intermediate/local scale guidance. They are configuration values, not hidden behavior, and can be tuned after observing feature density.

## API

- `GET /public/drone/reference-layers/config`
- `GET /public/drone/reference-layers/{key}`
- `POST /admin/materialize-reference-layers` (admin key required)

The config may advertise `manifest_url`. The stable manifest points to an immutable artifact at:

`drone/reference/region-4/{sha256}/references.geojson`

The stable pointer is stored at:

`drone/reference/region-4/manifest.json`

The artifact contains aviation and infrastructure features together. Every feature carries `reference_layer_key` and `reference_group`; independent toggles filter those properties without another request. The browser cache key includes the manifest's `dataset_version`, so a newly materialized dataset cannot reuse stale session data.

If the manifest or artifact is absent, clients fall back to `GET /public/drone/reference-layers/{key}`. Category data is still loaded only after an enabled layer reaches its minimum zoom. PostGIS therefore remains available immediately for analyst/fresh-data workflows while the artifact is the fast public read path.

The map displays current `Z`, a human scale band, an approximate representative fraction, and a metric segmented scale bar. A layer's `Zx+` control moves the map to its visibility threshold; once data is available it also frames that layer's geometry. The scale readout updates after zooming and panning because representative scale varies with latitude.

## Aviation semantics

Runways, approach/departure safeguarding, and the 5 km airport notification area are separate spatial objects. V1 safeguarding uses `representation_type=planning_reference` and `classification_effect=none`. The former 5 km aerodrome constraint remains traceable but is disabled in `mcda_subtypes`; the 5 km geometry is explanatory notification/coordination context only.

No clustering, vector tiles, PMTiles, MapLibre migration, or full regulatory OLS geometry is introduced here.

## Deployment and rollback

After the application revision is deployed and migration 015 has separately been approved/applied, call `POST /admin/materialize-reference-layers` once with `X-Admin-Key`. Confirm the response is `materialized`, the manifest is publicly readable, and its Government/Police/Fire counts are non-zero. Re-run the endpoint after any curated reference-data refresh.

Materialization does not alter analytical tables or model runs. Rollback is to deploy the previous application revision; older clients ignore `manifest_url`, and current clients automatically fall back to category endpoints if the manifest cannot be read. Storage objects are additive and need not be deleted during rollback.
