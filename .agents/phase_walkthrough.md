# Region 4 Public-Safety and Government Reference Data

## Outcome

- Adds a curated, provenance-bearing Region 4 seed set: four fire facilities,
  five police facilities, and two government facilities.
- Makes the corresponding public Explorer layers selectable at their existing
  zoom thresholds.
- Preserves the zoning model: every new subtype is inactive and each feature
  declares `classification_effect=none`.

## Data boundary

- Sources are OpenStreetMap feature identifiers and coordinates.
- Fire locations are cross-checked against the Guyana Fire Service public
  location listing.
- Region 4C police names are cross-checked against the Guyana Police Force
  public station listing where applicable.
- Government is restricted to OSM `office=government` and `amenity=townhall`.

## Verification

- `17 passed` — feature ingestion, ingestion taxonomy, and public reference
  layer tests.
- `git diff --check` passed.

## Deployment and rollback

- The migration has not been applied to Supabase; it requires separate explicit
  approval after code review and merge.
- Rollback before deployment is a normal Git revert. If it is applied later,
  rollback must delete only the eleven records identified by their `source_key`
  values and deactivate/remove the two reference layers and three inactive
  subtypes only after confirming no later curated records depend on them.
