# Drone Publication & Study-Area API (ARC-1)

This document describes the authoritative-data contract added in ARC-1: the
publication lifecycle for drone zoning runs, the deployment-neutral study-area
configuration, the administrator-only lifecycle transitions, and the public,
unauthenticated endpoints the Public Explorer (UX-8) consumes.

Migration: `db/migrations/010_drone_publication_and_study_area.sql`
(reverse: `..._down.sql`).

---

## Two independent axes: execution `status` vs `lifecycle_state`

A run has **two** orthogonal state columns on `mcda_model_runs`:

| Column | Values | Meaning |
| --- | --- | --- |
| `status` (pre-existing, unchanged) | `pending` → `running` → `complete` / `failed` | Has the model finished computing this run? |
| `lifecycle_state` (new) | `draft` → `approved` → `published`, and `published`/`approved`/`draft` → `archived` | Is this run a draft, cleared for publication, the single public run, or retired? |

A run is `status='complete'` long before an administrator decides to publish it.
New runs default to `lifecycle_state='draft'`, so **nothing is public until an
administrator publishes it.**

### Guarantees enforced in the database

- **One published run per study area** — partial unique index
  `uq_one_published_run_per_region`.
- **Published runs are immutable** — a trigger blocks any content change; the
  only permitted change is `published → archived`.
- **Published runs cannot be deleted** — must be archived first (this also
  blocks the cascade delete of their cell results).
- **Published cell results are immutable** — `UPDATE`/`DELETE` blocked.

---

## Study-area configuration model

`mcda_study_area_config` (one row per region) holds the presentation contract
that used to be hardcoded in the frontend (map center/zoom, coverage bbox):

`slug`, `display_name`, `center_lat`, `center_lng`, `default_zoom`, `min_zoom`,
`max_zoom`, `bbox_{west,south,east,north}`, `h3_resolution`,
`methodology_version`.

Nothing here is an editable model weight or an internal note. The Region 4 pilot
row is seeded from the previous frontend constants. The frontend now sources
these values from `frontend/src/lib/studyArea.ts`, which mirrors this contract;
the Public Explorer hydrates the same shape from `GET /public/drone/config`.

---

## Public endpoints (no authentication)

These expose **only** the single published run. They never accept a run
identifier, so a caller cannot select or infer a draft/approved/archived run.
Payloads carry no editable weights, internal notes, numeric scores, or run ids.

### `GET /public/drone/config`

```jsonc
{
  "study_area": {
    "slug": "region-4-demerara-mahaica",
    "display_name": "Region 4 · Demerara-Mahaica",
    "center": { "lat": 6.6, "lng": -58.1 },
    "default_zoom": 10, "min_zoom": 1, "max_zoom": 18,
    "bbox": { "west": -58.9, "south": 6.0, "east": -57.3, "north": 7.3 },
    "h3_resolution": 9,
    "methodology_version": "region-4-mvp-v1"
  },
  "published": {                     // null when nothing is published yet
    "published_at": "2026-07-23T00:00:00Z",
    "methodology_version": "region-4-mvp-v1"
  }
}
```

`404` when no study area is configured.

### `GET /public/drone/zoning`

The published run as a GeoJSON `FeatureCollection`. Per-feature properties:
`h3_index`, `zone`, `reason` (plain-language), `confidence`. The internal numeric
score and any run id are omitted. `404` when nothing is published.

### `GET /public/drone/report/{h3_index}`

Plain-language guidance for one published cell:
`h3_index`, `zone`, `classification`, `main_reason`, `guidance`,
`constraint_reasons[]`, `data_confidence`, `methodology_version`, `disclaimer`.

The raw score and the weight-bearing `factor_breakdown` are **excluded**. `404`
when nothing is published or the cell is outside the published grid.

---

## Internal endpoints (role-protected)

The following internal reads now require the **`viewer`** role (previously
unauthenticated):

- `GET /runs`
- `GET /runs/{run_id}`
- `GET /runs/{run_id}/geojson`
- `GET /runs/{run_id}/report/{h3_index}`

`GET /runs` and `GET /runs/{run_id}` now also return the publication fields
(`lifecycle_state`, `published_at`, `approved_at`, `archived_at`,
`supersedes_run_id`).

### `GET /dashboard` (viewer role) — internal reporting aggregate (UX-9)

Bounded aggregate metrics for the internal dashboard, computed in SQL — **no
cell geometry is returned**, so the browser never downloads the ~19.5k-cell
grid. Well-formed even when nothing is published (nulls + empty lists drive the
UI's empty state). Shape:

- `study_area`: `{ slug, display_name, methodology_version }` (or null)
- `published`: `{ run_id, label, lifecycle_state, published_at, published_by, total_cells, analyzed_area_km2, zone_distribution[] }` (or null)
- `latest_run`: most recent completed run `{ run_id, label, status, created_at, completed_at }` (or null)
- `run_history[]`: recent completed runs (bounded), each with its `zone_distribution` — the classification-change view
- `sensitivity`: latest sweep summary `{ base_run_id, avg_stddev, max_stddev, total_zone_flips, pct_cells_flipped, factor_rankings[] }` (or null)
- `freshness`: `{ published_at, days_since_published, is_stale, stale_threshold_days, methodology_version }`

Every metric is traceable to a run id and the study area's methodology version.

### Administrator-only lifecycle transitions

All require the **`admin`** role. The acting user id (`published_by` etc.) is
taken from the authenticated principal, never from request input.

| Endpoint | Transition | Preconditions |
| --- | --- | --- |
| `POST /runs/{run_id}/approve` | `draft → approved` | run `status='complete'` |
| `POST /runs/{run_id}/publish` | `approved → published` | atomically archives the incumbent published run and sets `supersedes_run_id` |
| `POST /runs/{run_id}/archive` | `draft`/`approved`/`published` → `archived` | not already archived |

Responses return the run summary (`run_id`, `lifecycle_state`, `status`,
`approved_at`, `published_at`, `archived_at`, `supersedes_run_id`).

Errors: `404` unknown run; `409` invalid transition from the current state.

---

## Deferred findings (not addressed in ARC-1; see plan §2)

- `GET /config/factors` (exposes raw model weights) and the sensitivity read
  endpoints (`GET /runs/{run_id}/sensitivity...`, `.../volatility`) remain
  unauthenticated. ARC-1 scoped viewer protection to the four run endpoints the
  plan enumerated; protecting these is recommended as a follow-up.
