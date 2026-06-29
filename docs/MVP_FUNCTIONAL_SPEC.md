# MVP Functional Specification: Hydrographic Poster Generator

## 1. Product Summary

The MVP is a standalone hydrographic poster generator web app. It generates high-resolution cartographic poster outputs from HydroRIVERS regional datasets using preset visual protocols.

The app will be deployed as a containerized service on Google Cloud Run, with a Next.js frontend, FastAPI backend, and Supabase PostgreSQL/PostGIS database.

The MVP is not a general GIS platform, not a full cartographic design suite, and not a user-uploaded spatial-data tool. Those temptations can wait outside like everyone else.

---

## 2. Core Product Goal

Enable a user to select a supported geography, apply preset hydrographic cartographic rules, preview the result, and export either:

1. A finished poster-style map output.
2. A transparent hydrographic design asset suitable for DTG/screenprinting/design overlay use.

The MVP should prove that a protocol-driven cartographic system can convert regional hydrographic data into polished visual outputs.

---

## 3. Confirmed MVP Decisions

| Category | Decision |
|---|---|
| App type | Standalone web app |
| Repository | GitHub repo |
| Deployment target | Google Cloud Run |
| Frontend | Next.js / React |
| Backend | FastAPI / Python |
| Database | Supabase PostgreSQL with PostGIS enabled |
| Spatial processing | PostGIS-backed dynamic clipping |
| HydroRIVERS coverage | South America and North/Central America regional datasets |
| Boundary support | Country, Admin 1, Admin 2 |
| User uploads | Out of scope for MVP |
| Visual customization | Preset-driven only |
| Rendering | SVG-first recommended |
| Exports | PNG, SVG, PDF, transparent design asset PNG/SVG |

---

## 4. Infrastructure Direction

The MVP will use Supabase-hosted PostgreSQL with the PostGIS extension enabled as the primary spatial database target.

The implementation should support connection through environment variables, especially `DATABASE_URL`, so the app can connect to:

- hosted Supabase,
- local Supabase CLI/PostGIS if used,
- local Docker PostGIS,
- or a future Cloud SQL PostgreSQL/PostGIS instance.

Hosted Supabase versus Supabase CLI/local workflow remains a development decision and should be revisited during setup.

Cloud SQL is the closest Google Cloud-native managed PostgreSQL alternative to Supabase for this use case. Because Cloud SQL supports PostgreSQL with PostGIS and integrates directly with Cloud Run, the implementation should avoid unnecessary Supabase-specific database assumptions where possible.

---

## 5. Application Architecture

### 5.1 Frontend

The frontend should handle:

- geography selection,
- preset selection,
- title/subtitle/body copy inputs,
- label toggles,
- preview display,
- QA status display,
- export mode selection,
- export size and format selection,
- export request initiation.

Recommended frontend stack:

```text
Next.js / React
TypeScript recommended
```

### 5.2 Backend

The FastAPI backend should handle:

- database communication,
- boundary lookup,
- river clipping queries,
- classification and validation,
- metadata generation,
- SVG generation or rendering preparation,
- export preparation,
- QA checks.

Recommended backend stack:

```text
FastAPI
Python
PostGIS database connection
```

### 5.3 Suggested Repository Structure

```text
/
├── frontend/
├── backend/
├── docs/
│   └── MVP_FUNCTIONAL_SPEC.md
├── db/
│   ├── migrations/
│   └── schema/
├── scripts/
│   ├── import_hydrorivers.py
│   └── import_boundaries.py
├── CLAUDE.md
├── README.md
└── docker-compose.yml
```

The exact structure can be revised during implementation if Claude Code identifies a better structure and documents the recommendation before changing it.

---

## 6. Data Scope

### 6.1 HydroRIVERS Datasets

The MVP will use regional HydroRIVERS datasets:

1. South America
2. North and Central America

The app should not use global HydroRIVERS files at runtime for the MVP.

Large source datasets must not be committed to GitHub. The repo should include import scripts, schema definitions, and setup instructions, not raw heavyweight data files. Because apparently Git repos are not meant to become geological deposits.

### 6.2 Initial Import Sources

The ingestion pipeline should support both:

- shapefile sources,
- file geodatabase sources.

If file geodatabase support introduces GDAL/container dependency issues, Claude Code should document the issue and recommend the safest fallback path instead of silently dropping support.

### 6.3 Spatial Data Contract

Even though users will not upload data in the MVP, the app needs an internal spatial data contract.

#### River Data

| Property | Requirement |
|---|---|
| Geometry type | LineString / MultiLineString |
| Source | HydroRIVERS regional datasets |
| Storage | PostGIS table |
| Runtime output | GeoJSON FeatureCollection or SVG-ready geometry |
| Required attributes | HydroRIVERS ID, hierarchy/order field if available, length/area fields if available, geometry |
| Derived attributes | `display_class`, `region_code`, `source_dataset` |

#### Boundary Data

| Property | Requirement |
|---|---|
| Geometry type | Polygon / MultiPolygon |
| Supported levels | Country, Admin 1, Admin 2 |
| Storage | PostGIS table |
| Runtime output | Geometry used for clipping and metadata |
| Required attributes | id, name, country, country_code, admin_level, parent_id, region_code, source, source_version, geometry |

---

## 7. Database Schema Direction

### 7.1 River Table

Use one normalized table for HydroRIVERS features.

Recommended table name:

```text
hydro_rivers
```

Minimum fields:

```text
id
region_code
source_dataset
hydrorivers_id
stream_order
upstream_area
length_km
display_class
geom
created_at
updated_at
```

The exact HydroRIVERS source field names should be confirmed during ingestion.

Recommended indexes:

```text
geom spatial index
region_code index
display_class index
hydrorivers_id index if available
```

### 7.2 Boundary Table

Recommended table name:

```text
admin_boundaries
```

Minimum fields:

```text
id
name
country
country_code
admin_level
parent_id
region_code
source
source_version
geom
created_at
updated_at
```

Recommended indexes:

```text
geom spatial index
country_code index
admin_level index
parent_id index
region_code index
```

### 7.3 Migration Tooling

Database migration tooling is not finalized at spec time.

Claude Code should evaluate the best option during development based on the selected backend structure and Supabase workflow.

Possible options include:

- Supabase migrations,
- raw SQL migrations,
- Alembic for FastAPI/Python,
- another lightweight migration approach if justified.

Claude Code must document the recommendation before implementing the migration structure.

---

## 8. Boundary Source

Boundary source remains open.

Claude Code should evaluate geoBoundaries and GADM for the MVP boundary layer.

The selected source must support:

- country boundaries,
- Admin 1 boundaries,
- Admin 2 boundaries,
- coverage across South America and North/Central America,
- clear licensing,
- stable download/import process,
- consistent hierarchy suitable for a geography picker.

Boundary source selection should be documented before implementation.

---

## 9. Geography Selection

The MVP should support Country, Admin 1, and Admin 2 geography selection.

Recommended UI flow:

```text
Region → Country → Admin Level → Geography
```

Example hierarchy:

```text
South America → Guyana → Country
North/Central America → United States → Michigan
North/Central America → United States → Michigan → Washtenaw County
```

The backend should expose a geography lookup endpoint that allows the frontend to populate this hierarchy without hardcoding all options into the UI.

---

## 10. Clipping Service

### 10.1 Required Backend Contract

The backend should expose a clipping/render-preparation service with a contract similar to:

```text
clipRivers(geographyId, densityPreset, classificationPreset)
```

The service should:

1. Fetch the selected boundary from `admin_boundaries`.
2. Select HydroRIVERS features intersecting the boundary.
3. Clip river geometries to the boundary using PostGIS.
4. Apply runtime classification or validation.
5. Return clipped features and metadata.

### 10.2 Example Response

```json
{
  "type": "FeatureCollection",
  "features": [],
  "metadata": {
    "geography": "Michigan",
    "region_code": "north_central_america",
    "river_count": 12345,
    "classification_status": "validated"
  }
}
```

### 10.3 Implementation Note

The clipping implementation should be modular enough to migrate later if needed.

Recommended abstraction:

```text
ClippingService
```

This should prevent the frontend from knowing or caring whether clipping is powered by PostGIS, GeoPandas, or some future engine. Shocking concept: hide the plumbing from the living room.

---

## 11. Classification

### 11.1 Classification Responsibility

The MVP should use:

1. preclassified data via `display_class`,
2. runtime classification based on selected preset,
3. validation comparing runtime classification against `display_class`.

This provides a fallback if runtime classification encounters missing fields or unexpected values.

### 11.2 Internal Classes

Use five internal classes:

```text
major
primary
secondary
minor
headwater
```

### 11.3 Classification Fallback

If runtime classification fails:

1. fall back to `display_class`,
2. mark classification status as `fallback_used`,
3. show a QA warning.

If both runtime classification and `display_class` are unavailable:

1. block final export,
2. explain that classification could not be completed.

Do not silently export semantically broken maps simply because they look pretty. That is how cartographic nonsense gets framed.

---

## 12. Density and Classification Presets

The MVP should use three linked density/classification presets.

| Preset | User-Facing Name | Reference Logic | Intended Effect |
|---|---|---|---|
| `balanced` | Balanced | Similar to Veins of Edo | Elegant, readable hierarchy |
| `detailed` | Detailed | Similar to Tanzania-style reference | More network complexity |
| `dense` | Full Network | Similar to dense reference image | Maximum hydrographic texture |

### 12.1 Preset Behavior

#### Balanced

- Emphasizes major, primary, and secondary rivers.
- Minor rivers are visible but restrained.
- Headwaters are limited, faint, or filtered.
- Best for clean poster-style outputs.

#### Detailed

- Includes more minor/headwater features.
- Preserves clear major-river hierarchy.
- Best for richer regional network texture.

#### Full Network

- Includes the most detailed river network available.
- Lower classes should remain thinner and less visually dominant.
- Best for dense design-focused outputs.

Exact thresholds should be determined during development after inspecting HydroRIVERS regional attributes.

---

## 13. Palette System

### 13.1 MVP Customization Model

The MVP should not include a free color picker.

Users should select from curated palette presets only.

### 13.2 Palette List

#### Dark Palettes

```text
default_dark
midnight_cyan
glacier_blue
ink_gold
monochrome_dark
deep_teal
```

#### Light Palettes

```text
default_light
soft_blueprint
paper_river_blue
warm_editorial
minimal_gray
```

### 13.3 Required Palette Tokens

Each palette should define:

```text
background
feature_major
feature_primary
feature_secondary
feature_minor
feature_headwater
text_primary
text_secondary
accent
scale_bar
metadata
```

### 13.4 Color Guardrails

Because the MVP uses curated palettes, complex color QA is not required.

However, each palette should preserve:

- readable text contrast,
- visible river hierarchy,
- one clear accent color,
- compatibility with dark/light mode,
- overall visual restraint.

---

## 14. Typography Presets

The MVP should include three typography presets.

### 14.1 Gallery Poster

Reference: Veins of Edo style.

Characteristics:

- humanist sans-serif style,
- large uppercase title,
- wide tracking,
- restrained subtitle,
- quiet metadata.

Suggested fonts:

```text
Gill Sans MT if available
Inter fallback
Avenir / Helvetica fallback if available
```

### 14.2 Technical Atlas

Characteristics:

- clean modern UI/GIS feeling,
- structured labels,
- moderate tracking,
- more technical metadata.

Suggested fonts:

```text
IBM Plex Sans
Inter
Source Sans 3
```

### 14.3 Field Plate

Characteristics:

- archival/survey-like feel,
- more technical metadata presentation,
- pairs well with denser river networks.

Suggested fonts:

```text
IBM Plex Mono
Space Mono
Source Code Pro
```

### 14.4 Text Sizing

Users may manipulate text sizing within safe bounds.

Rules:

- title must fit within assigned title zone,
- subtitle must fit within assigned subtitle zone,
- metadata must remain inside page margins,
- text should auto-scale down if it exceeds its allowed zone,
- the app should show QA warnings when text has been auto-scaled.

---

## 15. Labeling

The MVP should follow the Veins of Edo labeling model.

Maximum label count:

```text
1
```

Labeling options:

| Option | Behavior |
|---|---|
| Capital label + marker | Default where capital data exists |
| Marker only | Show point marker without label |
| Label only | Show text label without marker |
| None | Hide all labels and markers |

If capital point data is unavailable, the app should continue without label and show a QA warning.

---

## 16. Layout

The MVP should use a portrait-oriented layout based on the Veins of Edo composition.

### 16.1 Layout Rules

| Element | Rule |
|---|---|
| Orientation | Portrait |
| Map placement | Slightly right-weighted |
| Map height | Approximately 60–70% of page height |
| Negative space | Left side / upper-left reserved for text |
| Title block | Upper-left |
| Legend | Lower-left |
| Scale bar | Lower-right, unless hidden by projection/scale issue |
| Metadata | Under scale bar or lower-right metadata zone |
| North arrow | Small, top-right |
| Labels | One label maximum |

### 16.2 User Controls

Allowed in MVP:

- title edit,
- subtitle edit,
- optional body/caption edit,
- text size adjustment within bounds,
- label toggle,
- legend toggle,
- metadata toggle where legally safe,
- preset selection.

Out of scope:

- drag-and-drop layout editing,
- manual map repositioning,
- manual legend placement,
- arbitrary text box placement.

---

## 17. Metadata

Metadata should follow the Veins of Edo model: small, quiet, and placed near the scale/export information.

### 17.1 Required Fields

| Field | Required? |
|---|---|
| Data source | Yes |
| Boundary source | Yes |
| Projection | Yes |
| Date generated | Yes |
| Protocol | Recommended |
| Density preset | Recommended |
| Created by | Optional |

### 17.2 Metadata Across Presets

Metadata content should remain consistent across typography/palette presets.

Metadata styling may vary by typography preset:

| Typography Preset | Metadata Style |
|---|---|
| Gallery Poster | Quiet and minimal |
| Technical Atlas | Slightly more structured |
| Field Plate | More archival/survey-like |

### 17.3 Clean Art Export

Poster exports should include metadata unless the user explicitly chooses a clean/art variant where metadata is excluded from visible output.

If visible metadata is omitted, the app should preserve metadata in export metadata, companion JSON, or a downloadable sidecar file where feasible.

---

## 18. Export Modes

The MVP has two export modes.

### 18.1 Poster Export

Includes:

```text
background
rivers
title
subtitle
optional body/caption
legend
scale bar if safe
north arrow
metadata
labels/marker if enabled
```

Formats:

```text
PNG
SVG
PDF
```

### 18.2 Design Asset Export

Purpose:

```text
transparent hydrographic artwork for DTG/screenprinting/design overlay use
```

Includes:

```text
river network only
optional capital marker if enabled later
```

Excludes:

```text
background
title
subtitle
body/caption
legend
scale bar
north arrow
metadata
labels
```

Formats:

```text
PNG
SVG
```

The design asset export should use transparent background.

---

## 19. Export Sizes

### 19.1 Standard Sizes

Recommended preset sizes:

| Name | Size |
|---|---|
| Instagram Portrait | 1080 × 1350 px |
| Digital Poster | 1600 × 2400 px |
| High-Res Poster | 3600 × 5400 px |
| 18 × 24 Print | 5400 × 7200 px |
| Square Design Asset | 3000 × 3000 px |
| Custom | User-defined within limits |

### 19.2 Custom Size Limits

Recommended custom size limits:

```text
Minimum: 1000 px on shortest side
Maximum: 9000 px on longest side
```

Claude Code may recommend different limits if export performance or memory constraints require revision.

---

## 20. Projection and Scale Bar Handling *

This item requires further technical investigation.

The MVP should store source geometries in EPSG:4326 unless the imported datasets require a different canonical CRS.

The rendering/export pipeline should investigate whether clipped geometries should be transformed to an appropriate projected CRS before scale bar generation and final layout rendering.

Claude Code must examine and recommend the safest MVP approach for:

- accurate scale bar generation,
- area-specific projection choice,
- cross-region consistency,
- SVG coordinate conversion,
- metadata reporting.

If accurate scale cannot be guaranteed for a selected geography/export, the app should either:

1. hide the scale bar, or
2. label it as approximate.

The app must not render a misleading scale bar.

---

## 21. QA Behavior

QA means quality assurance checks before preview/export.

The MVP should use three severity levels:

| Severity | Meaning | Behavior |
|---|---|---|
| Pass | Output is ready | Export allowed |
| Warning | Output may be imperfect | Export allowed with warning |
| Block | Output would fail or be misleading | Export disabled until fixed |

### 21.1 Data QA

Checks:

- selected boundary exists,
- river features intersect selected boundary,
- required attributes exist or fallback exists,
- capital point exists if label enabled,
- source metadata exists.

Example block:

```text
No HydroRIVERS features found for the selected boundary.
```

Example warning:

```text
Capital point not found. Export will continue without label.
```

### 21.2 Classification QA

Checks:

- runtime classification succeeded,
- `display_class` fallback exists,
- classification mismatch rate is acceptable,
- major/primary classes exist where expected.

Example warning:

```text
Runtime classification differed from preclassified fallback. Review output before export.
```

### 21.3 Visual/Layout QA

Checks:

- text fits margins,
- metadata remains inside page,
- legend does not collide with map area,
- dense preset does not overrun small export sizes,
- map extent fits layout safely.

Example warning:

```text
Title was auto-scaled to fit the layout.
```

### 21.4 Export QA

Checks:

- export size is valid,
- selected format is supported,
- transparent mode is only available for design asset PNG/SVG,
- scale bar is safe or hidden/marked approximate,
- output can be generated within performance constraints.

---

## 22. API Surface: Recommended MVP Endpoints

Suggested backend endpoints:

```text
GET /health
GET /geographies
GET /geographies/{id}
POST /preview
POST /export
GET /presets
GET /qa/{job_id} optional
```

### 22.1 Preview Request

```json
{
  "geography_id": "example_id",
  "density_preset": "balanced",
  "classification_preset": "balanced",
  "palette_id": "default_dark",
  "typography_preset": "gallery_poster",
  "title": "FLOWING GUYANA",
  "subtitle": "River Network of Guyana",
  "label_option": "capital_label_and_marker",
  "export_size": "1600x2400"
}
```

### 22.2 Export Request

```json
{
  "preview_id": "optional_preview_id",
  "geography_id": "example_id",
  "export_mode": "poster",
  "format": "svg",
  "size": "3600x5400"
}
```

---

## 23. Out of Scope for MVP

The MVP should not include:

- user-uploaded spatial data,
- free color picker,
- custom classification thresholds,
- manual drag-and-drop layout editing,
- multiple label management,
- user accounts,
- saved projects,
- full global HydroRIVERS runtime support,
- non-hydrographic design systems,
- roads/elevation/lakes/basins as separate protocols,
- marketplace/storefront functions,
- print vendor integration.

These may be future enhancements, not MVP obligations. The MVP has enough moving parts already; no need to summon a hydra and call it “phase one.”

---

## 24. Implementation Flexibility

This specification defines intended MVP behavior and product constraints. It should guide development, not prevent technical improvements.

Claude Code should:

- follow the spec where product behavior is explicit,
- flag conflicts between the spec and implementation reality,
- recommend revisions when a better technical approach is discovered,
- avoid silently changing core MVP scope,
- document any proposed changes before implementing them,
- distinguish between product decisions, technical recommendations, and deferred future enhancements.

This is especially important for:

- Supabase hosted vs local CLI workflow,
- migration tooling,
- boundary source selection,
- projection and scale bar handling,
- file geodatabase import reliability,
- export implementation details,
- performance and caching.

---

## 25. Acceptance Criteria

The MVP is considered functionally successful when it can:

1. Connect to a Supabase/PostGIS database.
2. List supported Country/Admin 1/Admin 2 geographies.
3. Clip HydroRIVERS regional data to a selected boundary.
4. Apply one of three density/classification presets.
5. Apply one of the curated palette presets.
6. Apply one of three typography presets.
7. Render a preview of the hydrographic poster.
8. Display basic QA status.
9. Export a poster as SVG, PNG, and PDF.
10. Export a transparent river-network design asset as SVG or PNG.
11. Include required metadata in poster export.
12. Avoid rendering a misleading scale bar.
13. Run locally with documented setup instructions.
14. Be deployable to Google Cloud Run.

