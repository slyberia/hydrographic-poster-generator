# Guyana river-name pilot

This phase adds an optional, lazy-loaded river-name layer to the georeferencing
viewer. HydroRIVERS remains the source for poster rendering and registration
QC; names are display and inspection evidence only.

The Studio-to-Georeferencer handoff keeps the latest poster UUID in browser
session storage and passes it automatically. It does not introduce an account,
profile or user-history table.

## Published baseline

- Eight evaluated systems: Essequibo, Demerara, Berbice, Corentyne, Cuyuni,
  Mazaruni, Potaro and Rupununi.
- 1,588 confident HydroRIVERS reach associations.
- 97 ambiguous associations where the matcher abstains from showing a name.
- 7 reaches linked to currently unnamed OSM waterways.
- Evaluation status: passed for source availability and at least one matched
  reach in every target system.

The versioned artifact is content-addressed and served with an immutable
one-year cache policy. Its stable manifest is short-lived. The browser fetches
neither file until the user enables **Show evaluated river names**. No geometry
is added to Supabase/Postgres and no runtime request is made to Nominatim.

## Four-state contract

| State | Map color | Meaning |
| --- | --- | --- |
| `matched` | Green | The source-to-source matcher cleared its threshold. |
| `ambiguous` | Amber | A candidate exists, but the matcher abstained. |
| `unnamed_in_source` | Slate | A reviewed OSM waterway has no name tag. |
| `not_evaluated` | Blue | The reach or geography is outside the evaluated pilot. |

Color is reinforced by text in the legend and selected-reach details. The UI
always displays this disclaimer:

> River-name completeness varies by country, language, OSM coverage,
> segmentation and local mapping practice.

## Method and limitations

`scripts/build_river_name_artifact.py` performs a bounded, profile-driven
offline source build:

1. Retrieve and cache the eight target river systems from OSM/Nominatim at no
   more than one request per second.
2. Verify a small, preselected set of unnamed OSM waterway objects against the
   OSM API.
3. Fetch a HydroRIVERS country clip for transient matching only.
4. Densify both networks, associate nearby samples, calculate coverage and
   distance, and assign a confidence-scored state.
5. Publish only the OSM display layer and lightweight HydroRIVERS-ID index.

The evaluation is source-to-source agreement, not surveyed accuracy. Reported
distances reflect differences between OSM and HydroRIVERS geometry and cannot
be interpreted as positional error in either source.

Rebuild deliberately, outside runtime traffic:

```text
python scripts/build_river_name_artifact.py --country guyana
```

The checked-in `manifest.json`, `evaluation.json`, `source-record.json` and
content-addressed dataset make the released baseline inspectable and repeatable.
Country-specific targets, aliases and independent reference metadata now live in
`build-profile.json`; the matching algorithm is shared with subsequent country
evaluations.
