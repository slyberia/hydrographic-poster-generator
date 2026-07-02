# Master Implementation Plan: Phases 4 through 7

This document outlines the architecture, decisions, and exact file changes required to complete the remainder of the MVP, spanning the SVG rendering engine, the export pipeline, the frontend control panel, and final deployment.

---

## User Review Required

> [!IMPORTANT]
> **API Payload Strategy (Phase 4):** Rather than the frontend fetching megabytes of GeoJSON from `/clip` and posting it back to `/preview` with styling rules, the `/preview` endpoint will accept the geography ID and style settings, run the clip internally, and return the final SVG. Does this approach align with your vision?

> [!CAUTION]
> **Projection & Scale Bar (Phase 4/5):** The PostGIS data is in EPSG:4326 (Lat/Lon). Drawing lat/lon coordinates directly onto a flat SVG viewBox results in severe horizontal stretching at high latitudes. I propose modifying the `ClippingService` to output Web Mercator (EPSG:3857) via `ST_Transform` so the SVG renderer can plot flat Cartesian coordinates without Python-side math. Do you approve of projecting to Web Mercator natively in PostGIS?

> [!NOTE]
> **Export Engine (Phase 5):** To convert SVGs to high-resolution PNGs and PDFs on the backend, I propose using `CairoSVG` (a lightweight Python library) instead of spinning up a headless browser via Playwright (which is very heavy for Cloud Run). If CairoSVG struggles with any fonts or complex SVGs, we can pivot to Playwright.

---

## Phase 4: SVG Renderer (The Map Generator)

Build the core rendering engine that translates clipped GeoJSON river networks into aesthetically styled, production-ready SVG documents within the FastAPI backend.

### Proposed Changes

#### [NEW] `backend/app/models/render_models.py`
Defines the `RenderRequest` payload for `/preview` and `/export`, accepting geography ID, density preset, palette, typography, and text inputs.

#### [NEW] `backend/app/services/svg_renderer.py`
The core `SVGRenderer` class.
- **Background & ViewBox:** Generates the root `<svg>` (3600x5400 fixed internal resolution), `<style>` block (including palette colors and Google Font `@import` rules).
- **River Rendering:** Iterates over the GeoJSON `ClipResult`, rendering `<polyline>` elements mapped to the correct `display_class` CSS classes.
- **Layout Zones:** Implements the "Poster Protocol" layout (Title/Subtitle top-left, Legend bottom-left, Metadata/Approximate Scale bottom-right).
- **Design Asset Mode:** If mode is `design_asset`, omits background, text, and metadata.

#### [MODIFY] `backend/app/services/clipping_service.py`
Update the SQL query to transform the geometry into Web Mercator (EPSG:3857) before converting to GeoJSON to prevent map distortion.

#### [MODIFY] `backend/app/routers/preview.py`
Fleshes out the `/preview` endpoint. Calls `clip_rivers`, passes the GeoJSON and configurations to `SVGRenderer`, and returns an XML string (`image/svg+xml`).

---

## Phase 5: Export Pipeline

Convert the rendered SVGs into downloadable, production-ready assets (PNG, PDF) using the backend.

### Proposed Changes

#### [MODIFY] `backend/requirements.txt`
Add `cairosvg` for SVG conversion.

#### [NEW] `backend/app/services/export_service.py`
Service that takes a raw SVG string and a requested format (`svg`, `png`, `pdf`).
- Uses `cairosvg.svg2png` and `cairosvg.svg2pdf` for conversions.
- Handles resolution scaling for the "Digital Poster", "High-Res Poster", etc., specified in the MVP spec.

#### [MODIFY] `backend/app/routers/export.py`
Fleshes out the `/export` endpoint. Accepts a `RenderRequest` plus an `export_format` and `export_size`. Returns a FastAPI `StreamingResponse` or `FileResponse` with the appropriate MIME type and `Content-Disposition` attachment headers.

---

## Phase 6: Frontend Control Panel & UI

Build the Next.js interactive web interface, wiring it to the FastAPI backend. (Tailwind CSS is already initialized per Phase 1).

### Proposed Changes

#### [NEW] `frontend/src/lib/api.ts`
Axios/Fetch wrappers to call the backend APIs: `getGeographies()`, `getPresets()`, `getPreview()`, `triggerExport()`.

#### [NEW] `frontend/src/components/ControlPanel.tsx`
The left-hand sidebar containing:
- Cascading Geography Pickers (Region → Country → Admin Level).
- Dropdowns for Density, Palette, and Typography presets.
- Text inputs for Title and Subtitle.
- Toggles for Legend and Metadata.
- Export Section with Format/Size dropdowns and "Generate Export" button.

#### [NEW] `frontend/src/components/PreviewPane.tsx`
The right-hand main stage. Displays a loading skeleton while the backend generates the SVG, and dynamically renders the raw SVG payload returned by the `/preview` endpoint. 

#### [NEW] `frontend/src/components/QAChecklist.tsx`
A small component above the export button displaying Pass/Warning/Block statuses based on text fit and classification status (returned in the `/preview` headers or as a sidecar payload).

#### [MODIFY] `frontend/src/app/page.tsx`
The main layout composing `ControlPanel` and `PreviewPane` side-by-side, maintaining state for the user's selections.

---

## Phase 7: Deployment & Hardening

Move the application from local development to production on Google Cloud Run.

### Proposed Changes

#### [MODIFY] `frontend/Dockerfile`
Create a Next.js production `Dockerfile` utilizing standalone output mode for optimized Cloud Run deployment.

#### [MODIFY] `cloudbuild.yaml`
(Optional) A sample Cloud Build config demonstrating how to build and deploy both the `backend` and `frontend` services to Google Cloud Run.

#### [MODIFY] `README.md`
Update documentation with clear instructions for running locally via Docker Compose vs. deploying to GCP, including required environment variables (`DATABASE_URL`, `NEXT_PUBLIC_API_URL`).

---

## Verification Plan

Because this spans multiple phases, verification will be iterative:
1. **Phase 4:** Render an SVG payload directly from Swagger UI and verify it visually in the browser.
2. **Phase 5:** Test the `/export` endpoint in Swagger UI and ensure the downloaded PNG/PDF renders correctly.
3. **Phase 6:** End-to-End visual test. Use the Next.js UI to select a geography, tweak presets, view the preview, and download a finished poster.
4. **Phase 7:** Confirm the application builds correctly in Docker for production.
