# Project Roadmap: Hydrographic Poster Generator MVP

This roadmap outlines the sequence of development for the remainder of the MVP, ensuring the architecture is proven in layers—from database spatial math all the way to frontend user controls.

---

## 🟢 Phase 1: Foundation (Completed)
- **Repository & Governance**: Git setup, AI agent rulebooks (`AGENTS.md`, `CLAUDE.md`), and the strict command ledger orchestration pipeline.
- **Database Schema**: PostGIS `hydro_rivers` and `admin_boundaries` tables deployed to Supabase.
- **Data Ingestion**: Python CLI scripts (`import_hydrorivers.py`, `import_boundaries.py`) created for parsing shapefiles/GDBs. Raw source data downloaded locally.
- **Frontend Scaffold**: Next.js 15+ App Router initialized with Tailwind CSS, securely connected to the Supabase cloud instance.

---

## 🟡 Phase 2: The Data Reality Check (Next Steps for User)
Before the application can function, the raw spatial data must be ingested into the cloud database.
- [ ] Configure local GDAL/Fiona environment (via Conda, WSL, or Docker).
- [ ] Run `import_boundaries.py` for Admin 0, Admin 1, and Admin 2 datasets.
- [ ] Run `import_hydrorivers.py` for North/Central and South America.
- [ ] Validate geometries and spatial indexes via direct SQL queries.

---

## 🔵 Phase 3: FastAPI Backend (Spatial Service)
Build the core Python cartographic processing service.
- [ ] Scaffold FastAPI application in `/backend`.
- [ ] Configure `asyncpg` or `SQLAlchemy` database connection using `DATABASE_URL`.
- [ ] Implement `GET /geographies`: Return hierarchical boundary options (Region → Country → Admin Level).
- [ ] Implement `POST /clip`: The core PostGIS endpoint. Fetch boundary, perform `ST_Intersection` on rivers, and return a clipped GeoJSON FeatureCollection.
- [ ] Implement config-driven Presets engine (Balanced, Detailed, Dense) to control minimum stream order and simplification tolerance.

---

## 🔵 Phase 4: SVG Renderer (The Map Generator)
Translate clipped geometries into visual poster layouts.
- [ ] Build standalone SVG renderer module within the backend.
- [ ] Render clipped rivers and apply selected density/classification styling against a styled background.
- [ ] Implement the "Poster Protocol" layout: Title, subtitle, metadata block, legend, and scale bar.
- [ ] Add palette injection and typography presets.

---

## 🔵 Phase 5: Export Pipeline
Convert the rendered SVGs into downloadable, production-ready assets.
- [ ] Implement SVG optimization.
- [ ] Integrate a rendering library (e.g., CairoSVG or Playwright) to convert SVGs to high-resolution PNGs.
- [ ] Integrate PDF export formatting.
- [ ] Ensure support for transparent-background exports (Design Asset mode).

---

## 🔵 Phase 6: Frontend Control Panel & UI
Build the user-facing web interface.
- [ ] Build the interactive Control Panel (Geography pickers, Palette selection, Typography toggles, Title inputs).
- [ ] Wire the frontend to the FastAPI `/clip` and `/render` endpoints.
- [ ] Build the Poster Preview pane to dynamically display the returned SVGs.
- [ ] Implement the Pre-flight QA Checklist UI (verifying data, text fit, and projection safety).
- [ ] Add export buttons to trigger Phase 5 downloads.

---

## 🟣 Phase 7: Deployment & Hardening
Move the application from local development to production.
- [ ] Write `Dockerfile` for the FastAPI backend.
- [ ] Write `Dockerfile` for the Next.js frontend (or prepare for Vercel deployment).
- [ ] Deploy backend service to Google Cloud Run.
- [ ] Configure CORS, environment variables, and production API base URLs.
- [ ] Final end-to-end testing.
