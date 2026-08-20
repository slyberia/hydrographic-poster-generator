# GitHub Repository Profile

## Outcome

- Repositions the repository README around the HPS Geospatial platform rather than only the original poster generator.
- Presents Guyana Drone Zoning and the Hydrographic Poster Generator as the platform's two working applications.
- Adds direct links to the live platform, Drone overview, Drone Public Explorer, Poster Generator, and System Library.
- Documents the public/internal Drone workflow, dissolved-first publishing architecture, Poster Studio capabilities, shared stack, application routes, local setup, data ingestion, and current project boundaries.
- Reuses repository-owned HPS, Drone map, and poster imagery; no new binary assets were introduced.

## GitHub profile metadata

- Description: `HPS Geospatial combines Guyana Drone Zoning decision support with a PostGIS-powered Hydrographic Poster Generator. Built with Next.js, FastAPI, Supabase/PostGIS, Leaflet, and Google Cloud Run.`
- Homepage: `https://hydro-frontend-54n4ik523a-uc.a.run.app/`
- Topics: `aviation`, `cartography`, `data-visualization`, `decision-support`, `drone`, `drone-zoning`, `fastapi`, `geojson`, `geospatial`, `gis`, `google-cloud-run`, `guyana`, `hydrology`, `leaflet`, `nextjs`, `postgis`, `postgresql`, `spatial-analysis`, `spatial-data`, and `supabase`.
- Repository name, visibility, license, social-preview image, branch settings, and collaboration settings were not changed.

## Verification

- README profile contract: verifies both products are named and every repository-local image reference resolves.
- Markdown diff check: verifies no whitespace errors.
- Live route checks: `/`, `/drone`, `/drone/start`, `/drone/explore`, `/poster`, and `/documentation` return HTTP 200 from the deployed Cloud Run frontend.
- GitHub metadata readback: description, homepage, and the exact 20-topic set match the approved profile.
- Mandatory post-edit verification records are stored in `.agents/state/verifications/github-repository-profile/`.

## Deployment and rollback

- GitHub About metadata is already live; it does not require an application build or Cloud Run deployment.
- The README is published through the separately approved feature-branch commit, push, and draft-PR workflow.
- This phase does not change application code, APIs, database schema/data, runtime dependencies, Supabase configuration, or deployment configuration.
- README rollback is a normal Git revert after publication.
- Metadata rollback values are the previous poster-only description, a blank homepage, and the former topics: `cartography`, `data-visualization-project`, `fast-api`, `gis`, `nextjs`, `postgis`, `postgresql`, `spatial-analysis`, and `supabase-db`.

## Exit criteria

- Documentation scope: complete.
- GitHub metadata: applied and verified.
- Link and asset validation: complete.
- Commit, push, and draft PR: authorized for this phase.
- Merge and deployment: intentionally not performed.
