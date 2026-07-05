# Codex Execution Prompts: Phases 4 - 7

This document contains isolated context prompts designed to be copy-pasted into an AI coding assistant (like OpenAI Codex or Claude) to execute the implementation plan phase by phase.

---

## Phase 4: SVG Renderer (The Map Generator)

```markdown
# Task: Implement Phase 4 - SVG Renderer (The Map Generator)

## Context & Goal
You are building Phase 4 of the Hydrographic Poster Generator MVP. 
The MVP is a standalone Python/FastAPI backend and Next.js frontend application that generates cartographic posters of river networks clipped to administrative boundaries using PostGIS.
In this phase, you will build the core rendering engine that translates clipped GeoJSON river networks into aesthetically styled, production-ready SVG documents directly within the FastAPI backend.

## Architecture & Implementation Plan
Please implement the following changes in the `backend/` directory:

### 1. `app/models/render_models.py` [NEW]
Define the `RenderRequest` Pydantic payload for the `/preview` and `/export` endpoints.
It should accept:
- `geography_id` (string)
- `density_preset` (string: balanced, detailed, dense)
- `palette` (string)
- `typography` (string)
- `title` (string)
- `subtitle` (string)
- `design_asset_mode` (boolean, default False)

### 2. `app/services/clipping_service.py` [MODIFY]
Update the PostGIS SQL query to transform the clipped geometry into Web Mercator (EPSG:3857) using `ST_Transform(geom, 3857)` before converting to GeoJSON. This is critical to prevent horizontal stretching of the map at higher latitudes when drawn on a flat SVG Cartesian coordinate system.

### 3. `app/services/svg_renderer.py` [NEW]
Create the core `SVGRenderer` class.
- **Base Canvas:** The SVG should have a fixed internal viewBox/resolution of `3600x5400` (Portrait orientation).
- **Background & Styling:** Include a `<style>` block embedding the selected palette colors and Google Fonts `@import` rules.
- **River Rendering:** Iterate over the GeoJSON `ClipResult`. Render each river as a `<polyline>` or `<path>`. The CSS class of the line should map to its `display_class` (e.g., `major`, `primary`, `secondary`, `minor`, `headwater`) so styles apply dynamically.
- **Layout Zones (Poster Protocol):** 
  - **Title Block:** Upper-left.
  - **Map Placement:** Approximately 60–70% of page height, slightly right-weighted to leave negative space on the left.
  - **Legend:** Lower-left.
  - **Metadata & Approximate Scale:** Lower-right.
  - **North Arrow:** Small, top-right.
- **Design Asset Mode:** If `design_asset_mode` is True, omit the background rectangle, text, legend, north arrow, and metadata. Render ONLY the river network on a transparent background.

### 4. `app/routers/preview.py` [NEW or MODIFY]
Create the `/preview` POST endpoint.
- Accept the `RenderRequest`.
- Call `clip_rivers` to get the GeoJSON.
- Pass the GeoJSON and configurations to `SVGRenderer.generate_svg()`.
- Return the raw XML string using FastAPI's `Response` with `media_type="image/svg+xml"`.

## Styling & Spec Constraints
- **Palettes:** The system is preset-driven. For now, implement one dark palette (e.g., `default_dark`) and one light palette (e.g., `default_light`) with the following tokens: `background`, `feature_major`, `feature_primary`, `feature_secondary`, `feature_minor`, `feature_headwater`, `text_primary`, `text_secondary`, `accent`, `scale_bar`, `metadata`.
- **Typography:** The app uses 3 presets (e.g., Gallery Poster [Inter/Avenir], Technical Atlas [IBM Plex Sans], Field Plate [Space Mono]). Implement CSS logic for at least the Gallery Poster preset.
- **Metadata Fields:** Must include Data source, Boundary source, Projection, Date generated.

Please provide the implementation for the files above. Keep the code clean, modular, and adhering to FastAPI best practices.
```

---

## Phase 5: Export Pipeline

```markdown
# Task: Implement Phase 5 - Export Pipeline

## Context & Goal
You are building Phase 5 of the Hydrographic Poster Generator MVP. The application generates SVGs of clipped river networks (implemented in Phase 4). Your goal is to build the backend export pipeline that takes these SVGs and converts them into high-resolution, production-ready PNGs and PDFs for the user to download.

## Architecture & Implementation Plan
Please implement the following changes in the `backend/` directory:

### 1. `requirements.txt` [MODIFY]
Add `cairosvg` to the dependencies. We will use this lightweight library to perform the SVG-to-PNG and SVG-to-PDF conversion without needing a heavy headless browser.

### 2. `app/services/export_service.py` [NEW]
Create the `ExportService` class.
- It should expose a method `convert_svg(svg_string: str, export_format: str, export_size: str) -> bytes`.
- **Scaling/Resolution:** Use CairoSVG's DPI or `scale` parameters to scale the base 3600x5400 SVG to the requested `export_size`:
  - `digital_poster`: 1600x2400
  - `high_res_poster`: 3600x5400
  - `instagram_portrait`: 1080x1350 (requires dynamic cropping/adjustment or scaling to fit)
- **Formats Supported:** `svg` (returns raw string), `png` (returns bytes), `pdf` (returns bytes).
- Ensure fonts are properly loaded/embedded during conversion if possible with CairoSVG.

### 3. `app/models/export_models.py` [NEW]
Define an `ExportRequest` payload extending the `RenderRequest` (from Phase 4) by adding:
- `export_format`: (string: 'svg', 'png', 'pdf')
- `export_size`: (string: 'digital_poster', 'high_res_poster', 'instagram_portrait')

### 4. `app/routers/export.py` [NEW]
Create the `/export` POST endpoint.
- Accept the `ExportRequest`.
- Call the Phase 4 `SVGRenderer` to generate the base SVG.
- Pass the SVG to the `ExportService` for conversion.
- Return a FastAPI `Response` (or `StreamingResponse`) with the appropriate MIME type (`image/png`, `application/pdf`, `image/svg+xml`) and include a `Content-Disposition: attachment; filename="export.ext"` header so the browser downloads it.

Please implement these files, ensuring error handling is in place if CairoSVG encounters invalid XML.
```

---

## Phase 6: Frontend Control Panel & UI

```markdown
# Task: Implement Phase 6 - Frontend Control Panel & UI

## Context & Goal
You are building Phase 6 of the Hydrographic Poster Generator MVP. The backend FastAPI service is ready with `/geographies`, `/preview`, and `/export` endpoints. Your goal is to build the Next.js (App Router) user interface. It should feature a left-hand control panel for parameters and a right-hand preview pane to display the generated SVG poster. Tailwind CSS is already configured.

## Architecture & Implementation Plan
Please implement the following changes in the `frontend/` directory using React and Tailwind CSS:

### 1. `src/lib/api.ts` [NEW]
Create API wrapper functions to communicate with the backend. Ensure the backend URL is driven by `process.env.NEXT_PUBLIC_API_URL`.
- `getGeographies(parentId?)`: Fetches the boundary hierarchy.
- `getPreview(RenderRequest payload)`: Posts to `/preview` and returns the raw SVG string.
- `triggerExport(ExportRequest payload)`: Posts to `/export` and triggers a browser file download from the returned blob.

### 2. `src/components/ControlPanel.tsx` [NEW]
Build a left-sidebar component for user inputs. It must contain:
- **Geography Picker:** Cascading dropdowns (Region -> Country -> Admin Level).
- **Style Presets:** Dropdowns for Density (Balanced, Detailed, Dense), Palette, and Typography.
- **Poster Text:** Text inputs for Title and Subtitle.
- **Toggles:** Checkboxes for Legend visibility, Metadata visibility, and Design Asset Mode (transparent artwork only).
- **Export Action:** Dropdowns for format (PNG/SVG/PDF) and size, with a prominent "Generate Export" button.

### 3. `src/components/QAChecklist.tsx` [NEW]
Build a small component to display above the Export button. It should evaluate the current state and show Pass (green), Warning (yellow), or Block (red) statuses for:
- Data Loaded (Pass if geography selected).
- Text Fit (Warning if title/subtitle are too long).

### 4. `src/components/PreviewPane.tsx` [NEW]
Build the main right-hand canvas.
- Display a loading skeleton or spinner while fetching from `/preview`.
- Render the returned SVG string safely using `dangerouslySetInnerHTML`.
- Ensure it scales responsively while maintaining the portrait aspect ratio.

### 5. `src/app/page.tsx` [MODIFY]
Create the main layout combining the `ControlPanel`, `QAChecklist`, and `PreviewPane`. Manage the shared state (the current settings) here so that changing a setting in the control panel triggers a debounce and fetches a new SVG preview in the pane.

Ensure the UI feels modern, clean, and maps to the Next.js 15+ App Router patterns.
```

---

## Phase 7: Deployment & Hardening

```markdown
# Task: Implement Phase 7 - Deployment & Hardening

## Context & Goal
You are completing the final phase (Phase 7) of the Hydrographic Poster Generator MVP. The application is functionally complete. Your task is to prepare the Next.js frontend and FastAPI backend for production deployment on Google Cloud Run. 

## Architecture & Implementation Plan
Please implement the following configuration and deployment files:

### 1. `frontend/Dockerfile` [NEW]
Create a production-ready `Dockerfile` for the Next.js frontend.
- Use a multi-stage build (deps, builder, runner).
- Optimize for Next.js `output: 'standalone'` mode.
- Ensure the container exposes port 3000.
- Allow `NEXT_PUBLIC_API_URL` to be passed in at runtime or build time.

### 2. `backend/Dockerfile` [NEW]
Create a production-ready `Dockerfile` for the Python FastAPI backend.
- Use a slim Python 3.11+ base image.
- Install system dependencies required by PostGIS adapters and CairoSVG (e.g., `libcairo2`, `libpango-1.0-0`, `libpangocairo-1.0-0`, `libgdk-pixbuf2.0-0`, `libffi-dev`, `shared-mime-info`).
- Install Python requirements.
- Run using `uvicorn` (or `gunicorn` with `uvicorn` workers) on port 8080.
- Expose the port and ensure `DATABASE_URL` is read from the environment.

### 3. `cloudbuild.yaml` [NEW] (Optional but recommended)
Provide a basic Google Cloud Build configuration file demonstrating how to build both Docker images and deploy them to two separate Cloud Run services (`hydro-frontend` and `hydro-backend`).

### 4. `README.md` [MODIFY]
Update the root repository README to include clear instructions for:
1. Running the stack locally using Docker Compose (if a `docker-compose.yml` exists).
2. The environment variables required (`DATABASE_URL`, `NEXT_PUBLIC_API_URL`).
3. Deploying to Google Cloud Run.

Make sure the Dockerfiles prioritize cold-start speed and minimal image size where possible.
```
