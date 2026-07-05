# Hydrographic Poster Generator

## Overview

Hydrographic Poster Generator is a standalone MVP web app for generating minimalist hydrographic poster maps from HydroRIVERS regional datasets.

The MVP clips river networks to selected administrative boundaries, applies preset cartographic protocols, and exports high-resolution poster outputs or transparent design assets.

## MVP Scope

The MVP focuses on:

- HydroRIVERS regional datasets for South America and North/Central America
- Country, Admin 1, and Admin 2 boundary selection
- PostGIS-backed dynamic clipping
- Preset-driven density, classification, palette, typography, and layout rules
- SVG-first rendering
- PNG, SVG, and PDF export
- Transparent river-network design asset export
- Basic QA checks before export

## Tech Stack

- Frontend: Next.js / React
- Backend: FastAPI / Python
- Database: Supabase PostgreSQL with PostGIS
- Spatial Processing: PostGIS
- Rendering: SVG-first export pipeline
- Deployment Target: Google Cloud Run
- Local Development: Docker-supported

## Running Locally

### Docker Compose (recommended)

```bash
DATABASE_URL=postgresql://user:pass@host:5432/db docker compose up --build
```

- Frontend: <http://localhost:3000>
- Backend API docs: <http://localhost:8000/docs>

`DATABASE_URL` can point at hosted Supabase, a local Supabase CLI stack, or
a local Docker PostGIS instance — see `docs/DATA_INGESTION.md` for loading
HydroRIVERS and boundary data.

### Without Docker

```bash
# Backend (Python 3.11+)
cd backend && pip install -r requirements.txt
DATABASE_URL=... uvicorn app.main:app --reload --port 8000

# Frontend (Node 20+)
cd frontend && npm install
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
```

### Environment Variables

| Variable | Service | Purpose |
| :--- | :--- | :--- |
| `DATABASE_URL` | backend | PostGIS connection string (required) |
| `CORS_ORIGINS` | backend | Allowed browser origins (default `http://localhost:3000`) |
| `NEXT_PUBLIC_API_URL` | frontend | Backend base URL — inlined at **build** time |

See `.env.example` for the full list.

## Deploying to Google Cloud Run

`cloudbuild.yaml` builds both images and deploys two Cloud Run services
(`hydro-backend`, `hydro-frontend`). The backend is sized at 2 GiB /
concurrency 2 because high-resolution raster export is memory- and
CPU-intensive. Full instructions, one-time setup, and the production
checklist live in `docs/DEPLOYMENT.md`.

```bash
gcloud builds submit --config cloudbuild.yaml
```

## Documentation

- Product spec: `docs/MVP_FUNCTIONAL_SPEC.md`
- Math/display contract (projection, scale bar, export, text fit): `docs/PROJECTION_SCALEBAR_NOTES.md`
- Deployment: `docs/DEPLOYMENT.md`
- Data ingestion: `docs/DATA_INGESTION.md`
- Coding-agent instructions: `AGENTS.md` and `CLAUDE.md`

## Data Handling Note

Large HydroRIVERS source datasets should not be committed to this repository.

The repo should contain import scripts, schema definitions, documentation, and configuration examples. Source geospatial data should be stored externally and imported into the PostGIS database through the documented ingestion pipeline.

## Status

MVP feature-complete: backend render/export pipeline (Phases 1–5),
frontend control panel and preview (Phase 6), and Cloud Run deployment
configuration (Phase 7). Admin 1/Admin 2 boundary data is not yet imported
(country level only); the UI reveals deeper pickers automatically once
child boundaries exist in the database.
