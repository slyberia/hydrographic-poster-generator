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

## Documentation

- Product spec: `docs/MVP_FUNCTIONAL_SPEC.md`
- Coding-agent instructions: `AGENTS.md` and `CLAUDE.md`

## Data Handling Note

Large HydroRIVERS source datasets should not be committed to this repository.

The repo should contain import scripts, schema definitions, documentation, and configuration examples. Source geospatial data should be stored externally and imported into the PostGIS database through the documented ingestion pipeline.

## Status

Early MVP setup.
