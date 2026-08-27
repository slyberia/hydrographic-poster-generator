/** e2e/mockBackend.ts — network-layer mock of the drone FastAPI backend.
 *
 * Lets the QA suite (PHASE_D_FRONTEND_PLAN.md §7) exercise real client runtime
 * behavior — polling, the volatility join, toggles, drawer lookups — without a
 * live FastAPI/PostGIS stack. Backend *correctness* (children-only stats,
 * sidebar filtering, idempotency) is covered by backend/tests/; these mocks
 * encode the backend contract as already verified there.
 */

import type { Page, Route } from "@playwright/test";

const API = "http://localhost:8000";

// 2×2 grid of square "hex" cells near Region 4. Screen placement after
// fitBounds (north up): A top-left, B top-right, C bottom-left, LOCKED
// bottom-right — the click tests depend on this layout.
const CELLS = [
  { h3: "cell_a", zone: "SUITABLE", score: 2.0, lng: [-58.12, -58.11], lat: [6.61, 6.62] },
  { h3: "cell_b", zone: "CONDITIONAL", score: 3.0, lng: [-58.11, -58.1], lat: [6.61, 6.62] },
  { h3: "cell_c", zone: "CONDITIONAL", score: 3.8, lng: [-58.12, -58.11], lat: [6.6, 6.61] },
  { h3: "cell_locked", zone: "PROHIBITED", score: null, lng: [-58.11, -58.1], lat: [6.6, 6.61] },
] as const;

const FACTOR_KEYS = [
  "airspace_activity", "environmental", "infrastructure_sensitive",
  "land_use", "population", "regulatory",
];

const RUNS = [
  { run_id: "run-1", label: "baseline", status: "complete",
    lifecycle_state: "draft", approved_at: null, published_at: null,
    archived_at: null, supersedes_run_id: null, cell_count: 4,
    weights_snapshot: {}, created_at: "2026-07-17T12:00:00Z", completed_at: "2026-07-17T12:00:09Z" },
  { run_id: "run-2", label: "alt weights", status: "complete",
    lifecycle_state: "approved", approved_at: "2026-07-16T12:01:00Z", published_at: null,
    archived_at: null, supersedes_run_id: null, cell_count: 4,
    weights_snapshot: {}, created_at: "2026-07-16T12:00:00Z", completed_at: "2026-07-16T12:00:09Z" },
];

const VOLATILITY = [
  { h3_index: "cell_a", stddev: 0.05, variance: 0.0025, zone_flips: 0,
    volatility_category: "LOW", baseline_zone: "SUITABLE", baseline_score: 2.0 },
  { h3_index: "cell_b", stddev: 0.25, variance: 0.0625, zone_flips: 1,
    volatility_category: "MEDIUM", baseline_zone: "CONDITIONAL", baseline_score: 3.0 },
  { h3_index: "cell_c", stddev: 0.5, variance: 0.25, zone_flips: 3,
    volatility_category: "HIGH", baseline_zone: "CONDITIONAL", baseline_score: 3.8 },
  // cell_locked deliberately absent: constraint-locked cells are excluded
  // server-side (NULL total_score) — the UI must treat absence as "stable".
];

const SUMMARY = {
  avg_stddev: 0.2667, max_stddev: 0.5, total_zone_flips: 4, pct_cells_flipped: 66.67,
  factor_rankings: [
    { factor_key: "population", direction: "up", mean_absolute_deviation: 0.21, zone_flips: 3 },
    { factor_key: "environmental", direction: "down", mean_absolute_deviation: 0.09, zone_flips: 1 },
  ],
};

function geojson() {
  return {
    type: "FeatureCollection",
    features: CELLS.map((c) => ({
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [[
          [c.lng[0], c.lat[0]], [c.lng[1], c.lat[0]],
          [c.lng[1], c.lat[1]], [c.lng[0], c.lat[1]], [c.lng[0], c.lat[0]],
        ]],
      },
      properties: { h3_index: c.h3, zone: c.zone, score: c.score, reason: "mock", confidence: "high" },
    })),
  };
}

function dissolvedGeojson() {
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "MultiPolygon",
          coordinates: [[[
            [-58.12, 6.6], [-58.1, 6.6], [-58.1, 6.62],
            [-58.12, 6.62], [-58.12, 6.6],
          ]]],
        },
        properties: { zone: "CONDITIONAL", cell_count: 2, area_km2: 1.2, aggregate_reason: "Mock" },
      },
    ],
  };
}

function referenceGeojson(key: string) {
  const points: Record<string, [number, number]> = {
    airports: [-58.1, 6.61], schools: [-58.11, 6.615], healthcare: [-58.115, 6.605],
    government: [-58.125, 6.61], police: [-58.105, 6.6], fire: [-58.12, 6.605],
  };
  const point = points[key];
  return {
    type: "FeatureCollection",
    features: point ? [{ type: "Feature", geometry: { type: "Point", coordinates: point }, properties: { name: `Mock ${key}`, category: key } }] : [],
  };
}

function unifiedReferenceGeojson() {
  const keys = ["airports", "airport_notification", "schools", "healthcare", "government", "police", "fire"];
  return {
    type: "FeatureCollection",
    features: keys.flatMap((key) => referenceGeojson(key).features.map((feature) => ({
      ...feature,
      properties: {
        ...feature.properties,
        reference_layer_key: key,
        reference_group: key === "airports" || key === "airport_notification" ? "aviation" : "infrastructure",
      },
    }))),
  };
}

const REFERENCE_ARTIFACT = `${API}/workspace/drone/reference-artifact-v2.geojson`;
const REFERENCE_MANIFEST = `${API}/workspace/drone/reference-manifest.json`;

const REFERENCE_CONFIG = {
  version: "reference-layers-v2",
  manifest_url: REFERENCE_MANIFEST,
  layers: [
    { key: "airports", display_name: "Airports", group: "aviation", min_zoom: 8, label_min_zoom: 11, default_enabled: true, loading: "eager" },
    { key: "runways", display_name: "Runways", group: "aviation", min_zoom: 11, label_min_zoom: 13, default_enabled: false, loading: "lazy", available: false, availability_note: "Coming soon — verified runway geometry has not yet been added." },
    { key: "runway_safeguarding", display_name: "Runway Safeguarding", group: "aviation", min_zoom: 10, label_min_zoom: 13, default_enabled: false, loading: "lazy", available: false, availability_note: "Coming soon — verified safeguarding geometry has not yet been added." },
    { key: "airport_notification", display_name: "Airport Notification Area", group: "aviation", min_zoom: 9, label_min_zoom: 12, default_enabled: false, loading: "lazy" },
    { key: "schools", display_name: "Schools", group: "infrastructure", min_zoom: 13, label_min_zoom: 15, default_enabled: false, loading: "lazy" },
    { key: "healthcare", display_name: "Healthcare", group: "infrastructure", min_zoom: 12, label_min_zoom: 14, default_enabled: false, loading: "lazy" },
    { key: "government", display_name: "Government", group: "infrastructure", min_zoom: 13, label_min_zoom: 15, default_enabled: false, loading: "lazy" },
    { key: "police", display_name: "Police", group: "infrastructure", min_zoom: 14, label_min_zoom: 16, default_enabled: false, loading: "lazy" },
    { key: "fire", display_name: "Fire", group: "infrastructure", min_zoom: 14, label_min_zoom: 16, default_enabled: false, loading: "lazy" },
  ],
};

function report(h3: string) {
  const cell = CELLS.find((c) => c.h3 === h3) ?? CELLS[0];
  return {
    h3_index: cell.h3,
    zone: cell.zone,
    risk_score: cell.score,
    main_reason: "Mock reason",
    authorization_note: "Mock guidance.",
    constraint_reasons: cell.score === null ? ["Mock constraint"] : [],
    factor_breakdown: cell.score === null ? {} : { population: { score: 3, weight: 0.17, reason: "mock" } },
    data_confidence: null,
    disclaimer: "Mock disclaimer.",
  };
}

export interface MockState {
  requested: string[];
  statusPolls: number;
  triggerPosts: number;
  lastStatusPollAt: number;
  /** When true, POST /sensitivity is aborted to simulate a dead backend. */
  failTrigger: boolean;
  lifecyclePosts: string[];
}

export async function installMockBackend(page: Page): Promise<MockState> {
  const state: MockState = {
    requested: [],
    statusPolls: 0, triggerPosts: 0, lastStatusPollAt: 0, failTrigger: false,
    lifecyclePosts: [],
  };

  const json = (route: Route, body: unknown, status = 200) =>
    route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

  await page.route(`${API}/**`, async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const method = route.request().method();
    state.requested.push(path);

    if (path === "/config/factors") {
      return json(route, FACTOR_KEYS.map((k) => ({
        factor_key: k, factor_name: k.replace(/_/g, " "),
        raw_weight: 0.1667, normalised_weight: 0.1667, is_active: true,
      })));
    }
    if (path === "/runs" && method === "GET") return json(route, RUNS);
    if (path === "/workspace/drone/config") {
      return json(route, {
        study_area: { center: { lat: 6.6, lng: -58.1 }, default_zoom: 10 },
        published: null,
      });
    }
    if (path === "/workspace/drone/reference-layers/config") return json(route, REFERENCE_CONFIG);
    if (path === "/workspace/drone/reference-manifest.json") return json(route, {
      schema_version: 1,
      dataset_version: "mock-reference-v2",
      generated_at: "2026-08-21T00:00:00Z",
      reference_only: true,
      artifact: { url: REFERENCE_ARTIFACT, storage_path: "mock/reference.geojson", sha256: "mock-reference-v2", byte_size: 1, feature_count: 6 },
      layers: REFERENCE_CONFIG.layers.map((layer) => ({ key: layer.key, group: layer.group, available: layer.available !== false, feature_count: layer.available === false ? 0 : 1 })),
    });
    if (path === "/workspace/drone/reference-artifact-v2.geojson") return json(route, unifiedReferenceGeojson());
    const reference = path.match(/^\/public\/drone\/reference-layers\/([^/]+)$/);
    if (reference) return json(route, referenceGeojson(reference[1]));

    const lifecycle = path.match(/^\/runs\/([^/]+)\/(approve|publish|archive)$/);
    if (lifecycle && method === "POST") {
      state.lifecyclePosts.push(`${lifecycle[1]}:${lifecycle[2]}`);
      const run = RUNS.find((r) => r.run_id === lifecycle[1]) ?? RUNS[0];
      const nextState =
        lifecycle[2] === "approve"
          ? "approved"
          : lifecycle[2] === "publish"
            ? "published"
            : "archived";
      return json(route, { ...run, lifecycle_state: nextState });
    }

    const geo = path.match(/^\/runs\/([^/]+)\/geojson$/);
    if (geo) return json(route, geojson());
    const dissolved = path.match(/^\/runs\/([^/]+)\/geojson\/dissolved$/);
    if (dissolved) return json(route, dissolvedGeojson());

    const rep = path.match(/^\/runs\/([^/]+)\/report\/([^/]+)$/);
    if (rep) return json(route, report(rep[2]));

    const trig = path.match(/^\/runs\/([^/]+)\/sensitivity$/);
    if (trig && method === "POST") {
      if (state.failTrigger) return route.abort("connectionrefused");
      state.triggerPosts += 1;
      return json(route, {
        sweep_id: "sweep-1", status: "running", total_runs: 12,
        completed_runs: 0, failed_runs: 0, partial_results: true, summary: null,
      }, 202);
    }

    const vol = path.match(/^\/runs\/([^/]+)\/sensitivity\/([^/]+)\/volatility$/);
    if (vol) return json(route, VOLATILITY);

    const stat = path.match(/^\/runs\/([^/]+)\/sensitivity\/([^/]+)$/);
    if (stat && method === "GET") {
      state.statusPolls += 1;
      state.lastStatusPollAt = Date.now();
      // First poll: mid-sweep. Second onward: complete.
      if (state.statusPolls < 2) {
        return json(route, {
          sweep_id: "sweep-1", status: "running", total_runs: 12,
          completed_runs: 6, failed_runs: 0, partial_results: true, summary: null,
        });
      }
      return json(route, {
        sweep_id: "sweep-1", status: "complete", total_runs: 12,
        completed_runs: 12, failed_runs: 0, partial_results: false, summary: SUMMARY,
      });
    }

    const detail = path.match(/^\/runs\/([^/]+)$/);
    if (detail && method === "GET") {
      return json(route, {
        ...RUNS.find((r) => r.run_id === detail[1])!,
        stats: {
          run_id: detail[1],
          total_cells: 4,
          zones: [
            { zone: "PROHIBITED", cells: 1, area_km2: 0.6, pct: 25 },
            { zone: "RESTRICTED", cells: 0, area_km2: 0, pct: 0 },
            { zone: "CONDITIONAL", cells: 2, area_km2: 1.2, pct: 50 },
            { zone: "SUITABLE", cells: 1, area_km2: 0.6, pct: 25 },
          ],
        },
      });
    }

    return json(route, { detail: `Unmocked path: ${method} ${path}` }, 500);
  });

  // The basemap tile CDN is unreachable/nondeterministic in CI — blank it.
  await page.route("https://*.basemaps.cartocdn.com/**", (route) =>
    route.fulfill({ status: 204, body: "" })
  );

  return state;
}
