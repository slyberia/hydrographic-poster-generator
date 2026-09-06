# Geographic inspection phase — partial implementation walkthrough

## Identity

- Phase: georef-inspection; branch: codex/georef-inspection.
- Baseline: 5395e3a43a73829c0332f9946d7015dcb27bc6c3 (merged PR61).
- Approved baseline: .agents/state/baselines/georef-inspection/baseline_approved.json.
- User approved the baseline with “I approve, proceed”. Baseline evidence is preserved.
- User authorized commit, branch push and draft PR publication on 2026-09-06.
  No merge, deployment, production writes or migrations are included.

## Changes and boundaries

QC reports distinguish source agreement from positioning accuracy; include sampled
ground tolerance and withheld pixel errors without changing provisional thresholds.
Ephemeral viewer PNGs retain full affine placement. A lazily loaded map is shared
by Studio and Georeferencer result panels, with optional OSM tiles and bounded,
read-only reach inspection. No new packages or persistent source/raster datasets.
API additions are optional to old clients; old results still render and download.
The navigation label remains Georeference because its shared header is outside
this phase's allowed paths; the page heading is Georeferencer.

## Verification and observed failures

Approved baseline: 211 backend passed, three skipped, TypeScript and lint passed.
Current command/test-identity and scope evidence is recorded under
.agents/state/verifications/georef-inspection, separately from the baseline.
Final local run: 224 backend passed, the same three baseline skips, TypeScript
and full lint passed; no missing baseline tests, changed results, new failures
or out-of-scope files. Four Playwright tests passed (two browser workflows and
two pure affine-placement checks). Git diff whitespace check passed.

Added checks cover thumbnail affine corners (including shear/rotation), missing
ink evidence, viewport clipping/crossing, bounded results, invalid bounds,
read-only route behavior, viewer placement and old Native/Recovery contracts.
Playwright covers Native and Recovery processing/downloads, clear QC language,
map placement, source-ID selection, opacity, opt-in tiles, overlay clearing,
error-result retention, mobile document width and browser console errors.
Tile responses are simulated; no live OSM availability claim. Processing uses
real code and a Jamaica source snapshot; persistence/readiness are simulated
locally. Production is not verified by this evidence.
The local dev server could not fetch Google Fonts under restricted network access
and used fallback fonts; screenshots do not verify production typography. No
production build or deployment was performed. Local test servers were stopped.

Two direct phase-related failures were classified and corrected:

1. Inspection initially imported Shapely, which is not an installed application
   dependency. Replaced it with tested viewport segment clipping; no dependency
   or deployment change required.
2. The legacy mobile test counted Leaflet's intentionally oversized, clipped SVG
   and animation proxy as page overflow. Confirmed Leaflet overflow:hidden and
   screenshots; now tests page/document width and excludes only map descendants.

Local screenshots: work/georef-inspection-map.png, work/georef-mobile.png,
work/georef-native-browser.png and work/georef-recovery-browser.png. Scratch
evidence is not a committed source dataset.

## Naming pilot: unfinished

Main Overpass retrieval attempts returned HTTP 406. A bounded alternate-instance
check also failed with an Overpass dispatcher timeout (server busy). Natural Earth
provides named river geometry, but its documented small-scale generalization is
not sufficient evidence of reach-level identity. No speculative name associations
were added. Official references:

- https://wiki.openstreetmap.org/wiki/Overpass_API
- https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-rivers-lake-centerlines/
- https://operations.osmfoundation.org/policies/tiles/ (browser-default caching,
  visible attribution, valid referrer, interactive-only viewing; production
  headers and live tile availability still require rollout verification).

Remaining criteria: pin a usable reference/version/license; implement conservative
major-river candidate matching with unknown/ambiguous outcomes and provenance;
evaluate on separately reviewed Guyana examples, reporting precision/coverage
and errors without using matching input as its own truth. Broader calibration
and surveyed absolute accuracy remain outside the evidence available here.

## Risks and rollback

The existing 250-feature cap limits returned reaches, not the size of a country's
initial source clip. No distributed abuse limiter was introduced. Source-ID hashes
detect selection changes, not edits to geometry under unchanged IDs. OSM tile
availability is external; failure must not block raster downloads. Older clients
and missing-viewer responses remain compatible. There is no new stored state or
schema to migrate. Roll back these additive code changes to the PR61 baseline
through a reviewed revert; never reset user work. Any future production rollout
and rollback require their own authorization.

## Exit criteria

Partial, not phase complete: QC, affine viewer and reach inspection have local
evidence; the integrated named-river pilot and independent evaluation do not.
No release-readiness or global/surveyed accuracy claim. The user subsequently
approved preparing the verified QC/viewer portion separately for a draft PR.
See GEOREFERENCING_DRAFT_PR.md for the description; commit, branch push and draft
publication were subsequently authorized. Naming remains unfinished and is not
included in a completion claim.
