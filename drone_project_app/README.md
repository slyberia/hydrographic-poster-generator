# Drone Airspace Zoning Platform — Region 4, Guyana (MVP)

GIS-MCDA decision-support prototype. Constraints-first zoning with a
three-level scoring hierarchy (factor → sub-type → feature), DB-backed
editable rules, H3 res-9 grid, and per-cell reason attribution.

## Components
- `drone_mcda_schema.sql` — PostGIS schema + seeded rules (apply first)
- `ingest.py` — downloads GuyNode data, cleans, maps to sub-types, builds the
  H3 grid, loads PostGIS (`python ingest.py --download --data-dir ./data`)
- `fetch_osm_health_facilities.py` — OSM hospital gap-filler (run separately)
- `backend/` — FastAPI app (`uvicorn main:app`) + MCDA engine (`scoring.py`)
- `frontend/` — Next.js zoning console (`npm install && npm run dev`)

## Setup order
1. `psql $DATABASE_URL -f drone_mcda_schema.sql`
2. `DATABASE_URL=... python ingest.py --download`
3. `DATABASE_URL=... uvicorn main:app --port 8000` (from backend/)
4. `NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev` (from frontend/)

Verified end-to-end on real GuyNode Region 4 data: 289 features, 19,471 cells,
baseline run 9.8s (was 66.3s pre-optimization), sensitivity runs ~2.3s warm.

Prototype only — outputs are not official authorizations; GCAA approval
requirements are unaffected.
