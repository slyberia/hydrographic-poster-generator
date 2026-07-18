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
    weights_snapshot: {}, created_at: "2026-07-17T12:00:00Z", completed_at: "2026-07-17T12:00:09Z" },
  { run_id: "run-2", label: "alt weights", status: "complete",
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
    data_confidence: "high",
    disclaimer: "Mock disclaimer.",
  };
}

export interface MockState {
  statusPolls: number;
  triggerPosts: number;
  lastStatusPollAt: number;
  /** When true, POST /sensitivity is aborted to simulate a dead backend. */
  failTrigger: boolean;
}

export async function installMockBackend(page: Page): Promise<MockState> {
  const state: MockState = {
    statusPolls: 0, triggerPosts: 0, lastStatusPollAt: 0, failTrigger: false,
  };

  const json = (route: Route, body: unknown, status = 200) =>
    route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

  await page.route(`${API}/**`, async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const method = route.request().method();

    if (path === "/config/factors") {
      return json(route, FACTOR_KEYS.map((k) => ({
        factor_key: k, factor_name: k.replace(/_/g, " "),
        raw_weight: 0.1667, normalised_weight: 0.1667, is_active: true,
      })));
    }
    if (path === "/runs" && method === "GET") return json(route, RUNS);

    const geo = path.match(/^\/runs\/([^/]+)\/geojson$/);
    if (geo) return json(route, geojson());

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
