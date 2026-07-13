# Hydrographic Poster Generator: The Architecture of Aesthetics

<div align="center">
  <!-- TODO: Replace the path below with a screenshot of the app or a generated poster -->
  <img src="docs/assets/hero-placeholder.png" alt="Hydrographic Poster Generator" width="100%" />
</div>

<br />

A protocol-driven cartography engine that leverages **PostgreSQL** and **PostGIS** to transform the massive, global [HydroRIVERS dataset](https://www.hydrosheds.org/products/hydrorivers) into minimalist, high-resolution poster art and transparent vector design assets.

## The Concept

Traditional Geographic Information Systems (GIS) software is built for deep analysis, often presenting a steep learning curve for users who simply want to visualize data beautifully. 

**Hydrographic Poster Generator** shifts the paradigm by utilizing heavy-duty spatial engines not for traditional analysis, but for **generative graphic design**. By placing a highly constrained, preset-driven UI over a powerful PostgreSQL/PostGIS backbone, this tool empowers anyone to dynamically clip, classify, and render millions of kilometers of river networks into stunning, gallery-ready cartographic art.

## Key Features

- **Real-Time Spatial Clipping:** The engine uses PostGIS to perform complex spatial intersections on the fly, clipping river networks to specific Countries or Administrative boundaries instantly.
- **Curated Aesthetics:** No endless sliders. A rigorous set of typography rules, ambient color palettes, and density presets ensure every output meets a premium editorial standard.
- **Interactive Canvas:** An immersive, fluid workspace allows users to drag, zoom, and frame their geographic subject perfectly before rendering.
- **Dual Export Pipeline:** 
  - **Cartographic Posters:** High-resolution PNG and PDF exports complete with dynamic scale bars, metadata, and editorial typography.
  - **Design Asset Mode:** Export transparent, raw SVG river networks for integration into Adobe Illustrator or Figma workflows.

---

## Technical Architecture

The application is built to handle intensive spatial queries and vector rendering, cleanly separating the interactive frontend from the data-heavy backend.

- **Frontend (`Next.js` / `React`):** A cinematic, glassmorphic UI utilizing CSS container queries and fluid typography for a responsive, app-like experience.
- **Backend (`FastAPI` / `Python`):** An API layer that orchestrates the complex geometry math, applies cartographic logic based on upstream area/stream order, and generates pure SVGs.
- **Database (`Supabase PostgreSQL` + `PostGIS`):** The spatial workhorse that holds the multi-gigabyte HydroRIVERS dataset and performs the heavy geometric clipping.
- **Deployment (`Google Cloud Run`):** Containerized deployment optimized for the high memory and CPU demands of rasterizing dense vector maps.

---

## Running Locally

The easiest way to run the full stack locally is via Docker Compose. 

*(Note: Large source datasets like HydroRIVERS must be ingested into your database first. See the [Data Ingestion Guide](docs/DATA_INGESTION.md) for details.)*

```bash
# Recommended: Run via Docker Compose
DATABASE_URL=postgresql://user:pass@host:5432/db docker compose up --build
```

- **Frontend:** [http://localhost:3000](http://localhost:3000)
- **Backend API Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)

For manual installation instructions or environment variable configuration (e.g., pointing `DATABASE_URL` to a hosted Supabase instance), please reference `.env.example`.

---

## Documentation

For a deeper dive into the inner workings of the engine:

- **[Product Specification](docs/MVP_FUNCTIONAL_SPEC.md):** The core rules and boundaries of the application.
- **[Data Ingestion](docs/DATA_INGESTION.md):** Scripts and commands for loading the raw geospatial shapefiles into PostGIS.
- **[Deployment](docs/DEPLOYMENT.md):** Cloud Build and Google Cloud Run setup for production environments.
- **[Math & Projection Notes](docs/PROJECTION_SCALEBAR_NOTES.md):** Documentation on coordinate conversion, SVG scaling, and dynamic scale bar calculations.

---

*Note: Source geospatial data (like the HydroRIVERS geodatabases or shapefiles) are strictly stored externally and are not committed to this repository due to their size.*
