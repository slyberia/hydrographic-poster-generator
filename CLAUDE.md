# CLAUDE.md

## Project Overview

This repository contains the MVP for the Hydrographic Poster Generator: a standalone web app that generates high-resolution hydrographic poster outputs from HydroRIVERS regional datasets using preset cartographic protocols.

The app uses:

- Frontend: Next.js / React
- Backend: FastAPI / Python
- Database: Supabase PostgreSQL with PostGIS enabled
- Deployment target: Google Cloud Run

The MVP focuses on South America and North/Central America HydroRIVERS regional datasets, dynamic clipping to selected Country/Admin 1/Admin 2 boundaries, preset-based styling, and high-quality export outputs.

No, this is not a full GIS platform. Do not accidentally build one because the dropdown looked lonely.

---

## Product Source of Truth

Before implementing MVP behavior, read:

```text
/docs/MVP_FUNCTIONAL_SPEC.md
```

The functional spec defines intended product behavior, MVP scope, data assumptions, export modes, styling rules, QA behavior, and open investigation items.

If implementation reality conflicts with the spec, stop and document the conflict before changing behavior.

---

## Core MVP Scope

Build a standalone web app that allows users to:

1. Select a supported geography.
2. Select density/classification preset.
3. Select palette preset.
4. Select typography preset.
5. Edit title/subtitle/body text where supported.
6. Toggle the single-label model.
7. Preview a hydrographic poster output.
8. Export a poster output.
9. Export a transparent river-network design asset.

---

## Hard MVP Non-Goals

Do not add these unless explicitly requested:

- user-uploaded spatial data,
- free color picker,
- custom classification thresholds,
- drag-and-drop layout editing,
- arbitrary label placement,
- user accounts,
- saved projects,
- global HydroRIVERS runtime support,
- non-hydrographic protocols,
- marketplace/print vendor integration,
- full cartographic design suite behavior.

If tempted, write the idea under `Future Enhancements` instead of implementing it. Ambition is useful. Scope creep is ambition with a fake mustache.

---

## Architecture Expectations

### Frontend

Expected location:

```text
/frontend
```

Expected responsibilities:

- user interface,
- preset controls,
- geography picker,
- preview display,
- export controls,
- QA status display.

Recommended stack:

```text
Next.js
React
TypeScript preferred
```

### Backend

Expected location:

```text
/backend
```

Expected responsibilities:

- FastAPI service,
- Supabase/PostGIS connection,
- geography lookup,
- river clipping,
- classification validation,
- metadata assembly,
- SVG/render preparation,
- export preparation,
- QA checks.

Recommended stack:

```text
FastAPI
Python
PostgreSQL/PostGIS connection library
```

### Database

Primary target:

```text
Supabase PostgreSQL + PostGIS
```

The implementation must rely on environment-driven connection settings, especially:

```text
DATABASE_URL
```

Avoid unnecessary Supabase-specific assumptions in the core data access layer so the app can later connect to Cloud SQL PostgreSQL/PostGIS if needed.

---

## Suggested Repository Structure

Use or adapt this structure:

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

If a different structure is technically better, document the recommendation before changing it.

---

## Required Implementation Principles

### 1. Keep Spatial Logic Modular

Create clear service boundaries.

Recommended backend services:

```text
GeographyService
ClippingService
ClassificationService
RenderService
ExportService
QAService
MetadataService
```

Do not scatter PostGIS queries across unrelated route handlers like confetti at a municipal data funeral.

### 2. Keep Frontend Preset-Driven

The MVP uses preset controls, not open-ended design editing.

Frontend controls should map to defined spec values:

```text
density_preset
classification_preset
palette_id
typography_preset
label_option
export_mode
export_format
export_size
```

### 3. Avoid Silent Scope Expansion

If a feature is not in the spec, do not implement it without documenting why it is necessary.

### 4. Prefer Clear Schemas

Use explicit request/response models between frontend and backend.

Avoid vague payloads like:

```text
settings
options
data
stuff
```

Future maintainers deserve better. Barely, but still.

---

## Data and Import Requirements

### HydroRIVERS

The MVP uses regional HydroRIVERS datasets:

```text
South America
North/Central America
```

Initial import should support both:

```text
shapefile
file geodatabase
```

If file geodatabase import creates dependency issues, document the issue and recommend a fallback. Do not silently remove support.

### Boundaries

Boundary source is not finalized.

Evaluate:

```text
geoBoundaries
GADM
```

The selected boundary source must support:

- Country boundaries,
- Admin 1 boundaries,
- Admin 2 boundaries,
- South America coverage,
- North/Central America coverage,
- clear licensing,
- stable import process,
- hierarchy suitable for geography selection.

### Large Files

Do not commit large HydroRIVERS or boundary source datasets to GitHub.

The repo should contain:

- import scripts,
- schema definitions,
- setup instructions,
- sample/dev fixtures if small enough.

---

## Database Expectations

### River Table

Recommended table:

```text
hydro_rivers
```

Expected fields include:

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

Confirm actual HydroRIVERS field names during import.

### Boundary Table

Recommended table:

```text
admin_boundaries
```

Expected fields include:

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

### Indexing

PostGIS geometry columns must have spatial indexes.

Recommended indexes:

```text
hydro_rivers.geom
hydro_rivers.region_code
hydro_rivers.display_class
admin_boundaries.geom
admin_boundaries.admin_level
admin_boundaries.country_code
admin_boundaries.parent_id
```

---

## Open Investigation Items

The following items are intentionally not final. Investigate and recommend during development.

### 1. Supabase Hosted vs Local CLI Workflow

The project is Supabase-first, but local development flow is not final.

Support `DATABASE_URL` so hosted Supabase, local Supabase CLI, or local Docker PostGIS can be used.

### 2. Migration Tooling

Evaluate and recommend one of:

- Supabase migrations,
- raw SQL migrations,
- Alembic,
- another justified approach.

Document recommendation before implementing migration structure.

### 3. Boundary Source

Compare geoBoundaries and GADM.

Document recommendation before implementation.

### 4. Projection and Scale Bar Handling

This is marked with an asterisk in the functional spec.

Investigate:

- accurate scale bar generation,
- area-specific projection selection,
- cross-region consistency,
- SVG coordinate conversion,
- metadata reporting.

If accuracy cannot be guaranteed, hide the scale bar or label it approximate.

Do not render a misleading scale bar.

### 5. Export Implementation

Determine best practical method for:

- SVG generation,
- SVG → PNG,
- SVG → PDF,
- high-resolution export,
- transparent river-network design asset export.

Document any major tradeoffs.

### 6. Performance and Caching

Start simple. Recommend caching only after clipping/rendering behavior is working.

Possible cache key:

```text
geography_id + density_preset + classification_preset + palette_id + export_size
```

---

## API Expectations

Suggested endpoints:

```text
GET /health
GET /geographies
GET /geographies/{id}
GET /presets
POST /preview
POST /export
```

Use typed request/response schemas.

Preview and export requests should align with the functional spec.

---

## QA Expectations

Implement basic QA checks before export.

Severity levels:

```text
pass
warning
block
```

QA categories:

- data QA,
- classification QA,
- visual/layout QA,
- metadata QA,
- export QA.

Blocking errors should prevent export.

Warnings should be visible to the user but should not necessarily prevent export.

---

## Export Expectations

### Poster Export

Formats:

```text
PNG
SVG
PDF
```

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
label/marker if enabled
```

### Design Asset Export

Formats:

```text
PNG
SVG
```

Includes:

```text
river network only
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

Transparent background required.

---

## Development Workflow Expectations

Before making changes:

1. Read `/docs/MVP_FUNCTIONAL_SPEC.md`.
2. Identify which section of the spec the change supports.
3. Keep implementation modular.
4. Document uncertain decisions.

After making changes:

1. Summarize files changed.
2. Summarize behavior implemented.
3. Note any deviations from spec.
4. Note unresolved issues.
5. Run available tests/build checks.
6. Report commands run and results.

---

## Testing Expectations

Add tests where practical.

Priority test areas:

- API health endpoint,
- geography lookup,
- preset schema validation,
- clipping service behavior using fixtures,
- classification fallback behavior,
- QA severity behavior,
- export request validation.

If full integration tests are not practical early, create small fixture-based tests.

---

## Deployment Expectations

The app should be containerizable for Google Cloud Run.

Required deployment principles:

- do not rely on local file paths for production data,
- read secrets from environment variables,
- do not commit credentials,
- do not commit large source datasets,
- expose a health endpoint,
- keep database connection config environment-driven.

---

## Documentation Expectations

Update documentation when implementation decisions are made, especially for:

- Supabase setup,
- PostGIS extension enabling,
- database schema,
- data import workflow,
- boundary source selection,
- projection/scale handling,
- export implementation,
- deployment steps.

Minimum docs expected over time:

```text
README.md
docs/MVP_FUNCTIONAL_SPEC.md
docs/DATA_IMPORT.md
docs/DEPLOYMENT.md
docs/PROJECTION_SCALEBAR_NOTES.md optional
```

---

## Model Selection Guidance

Before beginning a task, assess its complexity against the active model tier. If a mismatch is detected, note the recommendation to the user. Do not halt work already in progress unless the mismatch is severe.

Full task-tier definitions are maintained in `AGENTS.md` under "Model Selection Guidance." The summary for Claude models:

### Tier 1: High Complexity

Tasks: architecture decisions, PostGIS pipeline design, SVG rendering/export implementation, projection investigation, spatial processing contract, cross-service debugging, translating spec sections into features, any `Requires Investigation` item.

Use: Claude Opus or Claude Sonnet (extended thinking)

### Tier 2: Moderate Complexity

Tasks: well-defined API endpoints, frontend components from established patterns, integration tests, preset config additions, migration files, documentation updates.

Use: Claude Sonnet

### Tier 3: Low Complexity

Tasks: lint/type/formatting fixes, README updates, `.gitignore` additions, CSS tweaks, variable renaming, running and reporting tests.

Use: Claude Haiku

### Behavior

- On a Tier 1 task with Haiku: recommend switching to Sonnet or Opus before beginning complex implementation. Continue with research and planning if possible.
- On a Tier 3 task with Opus: note that Haiku would be more efficient, but proceed. Do not block trivial work.
- When uncertain, default to the current model and note the ambiguity.

---

## Final Reminder

The MVP is a protocol-driven hydrographic poster generator.

It should feel focused, controlled, and visually polished.

Do not build a general GIS portal. Do not build a design suite. Do not add eleven clever features because the architecture allowed it. The architecture also allows chaos; that does not make chaos a product requirement.
