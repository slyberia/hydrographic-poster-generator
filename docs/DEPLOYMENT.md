# Deployment Guide

The app ships as two containers — a FastAPI backend and a Next.js frontend —
targeting Google Cloud Run, with a Docker Compose file for local runs.
The database is Supabase PostgreSQL with PostGIS (any PostGIS-enabled
PostgreSQL reachable via `DATABASE_URL` works, e.g. Cloud SQL later).

---

## 1. Environment Variables

| Variable | Service | When | Purpose |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | backend | runtime | PostGIS connection string (`postgresql://user:pass@host:5432/db`) |
| `CORS_ORIGINS` | backend | runtime | Comma-separated allowed origins (set to the frontend URL) |
| `PORT` | both | runtime | Injected by Cloud Run (backend 8080, frontend 3000 by default) |
| `NEXT_PUBLIC_API_URL` | frontend | **build time** | Backend base URL, inlined into the client bundle |

`NEXT_PUBLIC_API_URL` cannot be changed at container runtime — Next.js
inlines `NEXT_PUBLIC_*` values into the compiled JavaScript during
`next build`. Rebuild the frontend image to point at a different backend.

Secrets are never committed; the backend reads `DATABASE_URL` from the
environment (locally also from `backend/.env` via pydantic-settings).

---

## 2. Local Development (Docker Compose)

```bash
DATABASE_URL=postgresql://user:pass@host:5432/db docker compose up --build
```

- Frontend: <http://localhost:3000>
- Backend API + docs: <http://localhost:8000/docs>
- Health check: `curl http://localhost:8000/health`

The compose file maps host port 8000 to the backend's container port 8080
and bakes `NEXT_PUBLIC_API_URL=http://localhost:8000` into the frontend
build. Point `DATABASE_URL` at hosted Supabase (use the connection pooler
URI for IPv4 networks), a local Supabase CLI stack, or a local
`postgis/postgis` container.

Without Docker, run the services directly:

```bash
# backend
cd backend && pip install -r requirements.txt
DATABASE_URL=... uvicorn app.main:app --reload --port 8000

# frontend
cd frontend && npm install
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
```

---

## 3. Backend Image Notes

`backend/Dockerfile` (python:3.11-slim):

- Installs the CairoSVG system libraries (`libcairo2`, `libpango-1.0-0`,
  `libpangocairo-1.0-0`, `libgdk-pixbuf2.0-0`, `libffi-dev`,
  `shared-mime-info`).
- Installs **Inter, Roboto Mono, and Outfit as system fonts** from
  `backend/fonts/` and runs `fc-cache`. This is a correctness dependency,
  not styling polish: CairoSVG resolves text via fontconfig and ignores the
  SVG's Google-Fonts `@import`, so without installed fonts exported text
  silently falls back to a default face
  (docs/PROJECTION_SCALEBAR_NOTES.md §11.3). Verify inside the image with
  `fc-list | grep -i inter`.
- Startup is database-tolerant: if `DATABASE_URL` is unreachable the app
  still binds and serves `/health` (Cloud Run needs this to consider the
  revision healthy); data endpoints return 503 and reconnect lazily.

`frontend/Dockerfile` is a three-stage build (deps → builder → runner)
using Next.js `output: 'standalone'`; the runner stage contains only the
traced server bundle and static assets and runs as a non-root user.

---

## 4. Google Cloud Run via Cloud Build

One-time setup:

```bash
gcloud artifacts repositories create hydro \
  --repository-format=docker --location=us-central1

printf '%s' "$DATABASE_URL" | gcloud secrets create hydro-database-url --data-file=-
```

Grant the Cloud Build service account: `roles/run.admin`,
`roles/artifactregistry.writer`, `roles/secretmanager.secretAccessor`,
`roles/iam.serviceAccountUser`.

Deploy (two passes on first setup — the frontend needs the backend URL at
build time):

```bash
# Pass 1: deploy, then read the backend URL
gcloud builds submit --config cloudbuild.yaml
gcloud run services describe hydro-backend --region us-central1 --format='value(status.url)'

# Pass 2: rebuild the frontend against the real backend URL and lock CORS
gcloud builds submit --config cloudbuild.yaml \
  --substitutions=_NEXT_PUBLIC_API_URL=https://hydro-backend-....run.app,_CORS_ORIGINS=https://hydro-frontend-....run.app
```

### Backend sizing (normative: contract §13)

The worst legal export raster (9000 px long side at 2:3) is ~206 MiB for
the RGBA surface alone, with 2–3× peak during Cairo compositing and PNG
encoding, and export is CPU-bound single-request work. `cloudbuild.yaml`
therefore deploys the backend with **2 GiB memory, 2 vCPU,
concurrency 2**. Keep memory ≥ 1 GiB in all cases, and do not raise
concurrency without raising memory proportionally.

The frontend serves a static-ish UI and runs fine at 512 MiB with default
concurrency.

---

## 5. Production Checklist

- [ ] `DATABASE_URL` comes from Secret Manager, not env-var plaintext
- [ ] `CORS_ORIGINS` restricted to the deployed frontend origin
- [ ] `/health` returns 200 on a fresh revision
- [ ] `fc-list | grep -iE 'inter|roboto mono|outfit'` shows all three families in the backend image
- [ ] A `print_18x24` PDF export and a `square_design_asset` PNG export succeed against production data
- [ ] No source datasets baked into images (data lives in PostGIS only)
