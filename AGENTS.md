# AGENTS.md

## Purpose

This file provides repo-level operating instructions for agentic coding tools, including Google Antigravity and other AI coding agents.

The product source of truth is:

- `docs/MVP_FUNCTIONAL_SPEC.md`

Claude-specific guidance may also exist in:

- `CLAUDE.md`

When instructions conflict, follow this order:

1. Explicit user instruction in the current session
2. `docs/MVP_FUNCTIONAL_SPEC.md`
3. `AGENTS.md`
4. Tool-specific files such as `CLAUDE.md`
5. Existing code conventions

Do not silently expand scope. Document conflicts, assumptions, and recommended changes before implementing them.

---

## Project Summary

Hydrographic Poster Generator is a standalone web app MVP for generating minimalist hydrographic poster maps from HydroRIVERS regional datasets.

The app clips river networks to selected country, Admin 1, or Admin 2 boundaries, applies preset cartographic protocols, and exports high-resolution poster outputs or transparent river-network design assets.

The intended stack is:

- Frontend: Next.js / React
- Backend: FastAPI / Python
- Database: Supabase PostgreSQL with PostGIS
- Deployment: Google Cloud Run
- Rendering: SVG-first export pipeline

---

## Core MVP Scope

Build toward the MVP described in `docs/MVP_FUNCTIONAL_SPEC.md`.

The MVP includes:

- HydroRIVERS regional datasets for:
  - South America
  - North and Central America
- Country, Admin 1, and Admin 2 geography selection
- Supabase PostgreSQL/PostGIS spatial backend
- Dynamic clipping of river features to selected boundaries
- Preset-driven density/classification behavior
- Curated palette selection, including dark and light variants
- Three typography presets
- Fixed portrait-oriented poster layout based on the Veins of Edo reference
- Basic QA checks before export
- PNG, SVG, and PDF poster export
- Transparent river-network design asset export for design/DTG/screenprinting use

---

## Explicit Non-Goals for MVP

Do not add these unless the user explicitly asks:

- User-uploaded spatial datasets
- Manual color picker
- Custom classification thresholds
- Drag-and-drop layout editing
- Multi-label map annotation
- Full GIS viewer parity
- Account system or authentication
- Paid/export gating
- Public gallery
- Multi-design-system marketplace
- Runtime use of full global HydroRIVERS files

The MVP is a protocol-driven poster generator, not an open-ended cartographic design suite. Humans will survive without sixteen sliders for line opacity.

---

## Expected Repository Structure

Target structure:

```text
/
├── frontend/
├── backend/
├── docs/
│   └── MVP_FUNCTIONAL_SPEC.md
├── db/
│   └── migrations/
├── scripts/
├── data/
├── README.md
├── CLAUDE.md
├── AGENTS.md
├── .env.example
└── .gitignore
```

Large source datasets must not be committed to Git.

---

## Data Rules

Source geospatial data should remain outside the repo.

Do not commit:

- HydroRIVERS shapefiles
- HydroRIVERS file geodatabases
- GeoPackages
- large GeoJSON files
- FlatGeobuf files
- generated exports
- zipped raw spatial datasets

The repo may contain:

- import scripts
- schema definitions
- migration files
- small synthetic fixtures
- documentation
- example configuration
- tiny test geometries where needed

Initial import support should cover both:

- shapefile
- file geodatabase, where feasible

If file geodatabase support creates GDAL/runtime dependency issues, document the issue and recommend a fallback instead of silently dropping support.

---

## Database Rules

Primary database target:

- Supabase PostgreSQL with PostGIS enabled

The app should connect through environment variables, especially:

```env
DATABASE_URL=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Avoid hardcoding Supabase-only assumptions in the database access layer when ordinary PostgreSQL/PostGIS patterns are sufficient. Future migration to Cloud SQL PostgreSQL/PostGIS should remain possible.

Expected core tables:

- `hydro_rivers`
- `admin_boundaries`

Recommended `hydro_rivers` fields:

```text
id
region_code
source_dataset
source_version
hydrorivers_id
stream_order
upstream_area
length_km
display_class
geom
```

Recommended `admin_boundaries` fields:

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
```

Use spatial indexes for `geom` columns.

Migration tooling is not finalized. Recommend a migration approach during development before implementing schema work.

---

## Spatial Processing Rules

Spatial clipping should be PostGIS-backed.

Expected clipping contract:

```text
clipRivers(geographyId, densityPreset, classificationPreset)
```

Expected output shape:

```json
{
  "type": "FeatureCollection",
  "features": [],
  "metadata": {
    "geography": "",
    "region_code": "",
    "river_count": 0,
    "classification_status": ""
  }
}
```

The backend should:

1. Fetch the selected boundary geometry.
2. Select river features intersecting the boundary.
3. Clip river geometries to the boundary.
4. Apply or validate classification.
5. Return clipped GeoJSON or pass the result to the renderer.

Classification should use runtime logic with `display_class` as a fallback/validation field.

---

## Projection and Scale Bar Handling

Projection and scale bar behavior requires investigation.

Agents must examine and recommend the safest MVP approach for:

- accurate scale bar generation
- area-specific projection choice
- cross-region consistency
- SVG coordinate conversion
- metadata reporting

If accurate scale cannot be guaranteed, the app should hide the scale bar or label it as approximate instead of rendering a misleading scale bar. A wrong scale bar is a tiny liar with typography.

---

## Rendering and Export Rules

Rendering should be SVG-first unless investigation reveals a better implementation path.

Poster export mode should include:

- background
- river network
- title
- subtitle
- optional capital label/marker
- legend
- scale bar or approved scale alternative
- north arrow
- metadata

Design asset export mode should include:

- river network only by default
- transparent background
- no title
- no subtitle
- no legend
- no scale bar
- no north arrow
- no metadata
- optional capital marker only if explicitly supported

Supported export formats for MVP:

- SVG
- PNG
- PDF

Transparent design asset export should support:

- SVG
- PNG

---

## UI Rules

The frontend should expose simple, preset-driven controls:

- geography selector
- density preset
- classification preset
- palette selector
- typography preset
- title input
- subtitle input
- capital label toggle
- legend toggle if supported
- metadata toggle if supported by spec
- export mode
- export size
- export format
- QA checklist
- generate/export action

Avoid adding advanced customization controls during MVP.

---

## QA Rules

The app should surface a simple QA checklist before export.

Minimum QA categories:

- data loaded
- boundary found
- river features found
- required fields available
- clipping completed
- classification validated or fallback used
- text fits within layout zones
- metadata present for poster export
- export settings valid
- projection/scale bar status reported

Severity levels:

- Pass
- Warning
- Block

Warnings may allow export. Blocks should prevent export until resolved.

---

## Development Behavior for Agents

When implementing:

1. Read `docs/MVP_FUNCTIONAL_SPEC.md` first.
2. Inspect existing repo structure before making changes.
3. Keep changes modular and easy to review.
4. Prefer small, focused commits or change sets.
5. Do not silently expand scope.
6. Document assumptions in the response.
7. Identify conflicts between the spec and implementation reality.
8. Recommend revisions before making major architectural changes.
9. Keep generated code readable and conventional.
10. Avoid over-engineering before the MVP path is proven.

If an implementation detail is uncertain, mark it as:

```text
Requires Investigation
```

Then recommend options with tradeoffs.

---

## Local Development Expectations

The final repo should support Docker-based local development.

Expected direction:

- frontend service
- backend service
- optional local Postgres/PostGIS or local Supabase workflow
- `.env.example` for configuration

Supabase-first development is the priority, but the exact hosted-vs-local CLI workflow may be finalized during setup.

---

## Deployment Expectations

Target deployment:

- Google Cloud Run for the app
- Supabase hosted PostgreSQL/PostGIS as the primary database target

The app should be containerized and read runtime config from environment variables.

Do not require raw geospatial source files inside the Cloud Run container.

---

## Documentation Expectations

Keep documentation current when decisions change.

Update the relevant docs when implementing or revising:

- product behavior
- data ingestion
- database schema
- environment variables
- deployment setup
- export behavior
- QA checks
- known limitations

Recommended docs:

```text
docs/MVP_FUNCTIONAL_SPEC.md
docs/DATA_INGESTION.md
docs/DATABASE_SCHEMA.md
docs/EXPORT_PIPELINE.md
docs/DEPLOYMENT.md
```

Only create additional docs when they serve an actual implementation need. Documentation sprawl is just clutter wearing a blazer.

---

## Model Selection Guidance

Agents should assess the complexity of the current task against their active model tier. If a mismatch is detected, note the recommendation to the user before proceeding. Do not halt work already in progress unless the mismatch is severe (e.g., a fast model attempting to design the clipping service from scratch).

### Task Complexity Tiers for This Project

#### Tier 1: High Complexity (use reasoning/high-effort models)

- Initial architecture and scaffolding decisions
- Designing the PostGIS clipping and classification pipeline
- Implementing the SVG rendering and export service
- Projection and scale bar investigation
- Writing or reviewing the spatial processing contract
- Debugging cross-service data flow issues
- Translating `MVP_FUNCTIONAL_SPEC.md` sections into new features
- Any task marked `Requires Investigation` in `CLAUDE.md`

Recommended models: Gemini Pro (High), Claude Opus/Sonnet, GPT-4o/o1

#### Tier 2: Moderate Complexity (use standard models)

- Implementing well-defined API endpoints from existing patterns
- Building frontend components from an established design system
- Writing integration tests for existing services
- Adding new presets to palette/typography/density configs
- Database migration files for defined schemas
- Reviewing and updating documentation

Recommended models: Gemini Pro (Medium), Claude Sonnet, GPT-4o

#### Tier 3: Low Complexity (use fast/efficient models)

- Fixing lint, type, or formatting errors
- Updating README content or inline comments
- Adding entries to `.gitignore` or `.env.example`
- Simple CSS/layout adjustments
- Renaming variables or files
- Running and reporting test results

Recommended models: Gemini Flash, Gemini Pro (Low), Claude Haiku, GPT-4o-mini

### Agent Behavior

- If running a Tier 1 task on a fast/low model: note the mismatch and recommend the user switch before beginning complex implementation. Continue with research and planning if possible.
- If running a Tier 3 task on a high/reasoning model: note that a lighter model would be more efficient, but proceed. Do not block trivial work.
- When uncertain about tier, default to the current model and note the ambiguity.

---

## Final Instruction

Build the MVP in accordance with the product spec, but treat unresolved technical items as investigation checkpoints rather than opportunities to improvise wildly.

When in doubt, preserve the MVP scope, explain the tradeoff, and recommend the next safest step.

---

## Test Failure Workflow (Diagnostic Coach Protocol)

If `npm run validate` or any automated testing script returns an exit code of 1:
1. Catch the error and capture the stderr output.
2. Automatically generate a prompt that includes the error log and the last modified file.
3. Treat this prompt as a directive to yourself: act as the "Diagnostic Coach". Analyze the error log and provide a strict sequence of commands to fix the bug in the chat. Do not write the code directly; output a plan.
4. Pause for Human-in-the-loop approval before executing the fix.
