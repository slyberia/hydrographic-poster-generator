# Drone Reference Data

## Region 4 public-safety and government facilities

The Police, Fire, and Government map layers are reference layers. They describe
visible facility context and do not change a model run, zoning class, score,
buffer, or restriction.

The initial Region 4 curation contains eleven point locations:

- Four fire-service facilities: Guyana Fire Service Headquarters, Alberttown,
  West Ruimveldt, and Mahaica.
- Five police facilities: City Police, Police Mounted Branch, Enmore, Mahaica,
  and Cane Grove.
- Two government facilities: Ministry of Local Government and Georgetown City
  Hall.

Every record is stored as an OpenStreetMap-derived point with the OSM element
identifier, source link, a `proxy_osm` confidence label, and a curation note.
The fire names and locations are cross-checked against the [Guyana Fire Service
locations page](https://gfire.moha.gov.gy/locations/). Relevant Region 4C police
station names are cross-checked against the [Guyana Police Force's public Region
4C listing](https://guyanapoliceforce.gy/?page_id=1614).

Government is deliberately narrow: only `office=government` and
`amenity=townhall` are ingested. Public buildings, security sites, and unknown
government-related places are excluded.

## Analytical safeguard

The `police`, `fire_station`, and `government_facility` subtype records are
created with `is_active = false`. The model service joins only active subtypes,
so these facilities cannot contribute to the MCDA evaluation. The public
reference service intentionally queries the active layer and the explicit
`reference_category` attribute instead, which makes them displayable without
making them analytical inputs.

## Refresh process

The ingestion registry retrieves the same conservative OSM tags and attaches
`reference_category` plus `classification_effect=none`. A refresh remains a
staged, human-reviewed operation; it must not use the full-region promotion
command for an isolated reference-data update because that command replaces the
canonical Region 4 feature set.

OpenStreetMap attribution: © OpenStreetMap contributors, available under the
[Open Database License](https://www.openstreetmap.org/copyright).

## Publication availability

The curated records are introduced by migration 015. Until that migration is applied to an environment, the dynamic and materialized Government, Police, and Fire categories are valid but empty. After applying the migration, refresh the public artifact through `POST /admin/materialize-reference-layers`; the stable manifest records feature counts so deployment verification can distinguish an empty source from a rendering problem.
