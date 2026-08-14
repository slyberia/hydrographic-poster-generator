# Drone reference layers — Milestone C

Reference layers are contextual map information, not MCDA outputs. PostGIS/source tables remain authoritative; the public GeoJSON endpoints are read-optimized responses and the browser caches each category in `sessionStorage` for the current session.

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

Reference requests are category-level and lazy. A checked layer below its threshold is not fetched or rendered. Once fetched, it is reused from session cache when hidden and shown again.

## Aviation semantics

Runways, approach/departure safeguarding, and the 5 km airport notification area are separate spatial objects. V1 safeguarding uses `representation_type=planning_reference` and `classification_effect=none`. The former 5 km aerodrome constraint remains traceable but is disabled in `mcda_subtypes`; the 5 km geometry is explanatory notification/coordination context only.

No clustering, vector tiles, PMTiles, MapLibre migration, or full regulatory OLS geometry is introduced in Milestone C.
