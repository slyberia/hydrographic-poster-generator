/** e2e/drone-dashboard.spec.ts — internal dashboard (UX-9).
 *
 * Exercises /drone/dashboard against a mocked GET /dashboard aggregate: loaded
 * metrics, stale-data banner, empty and error states, and the guarantee that no
 * cell geometry is ever fetched. Auth is bypassed in the test env (no Supabase
 * config), matching the console specs.
 */

import { test, expect, Page, Route } from "@playwright/test";

const API = "http://localhost:8000";

const BASE_DASHBOARD = {
  study_area: {
    slug: "region-4-demerara-mahaica",
    display_name: "Region 4 · Demerara-Mahaica",
    methodology_version: "region-4-mvp-v1",
  },
  published: {
    run_id: "pub-abcdef1234567890",
    label: "baseline",
    lifecycle_state: "published",
    published_at: "2026-07-20T00:00:00Z",
    published_by: "admin-1",
    total_cells: 150,
    analyzed_area_km2: 90.0,
    zone_distribution: [
      { zone: "SUITABLE", cells: 100, area_km2: 60, pct: 66.7 },
      { zone: "PROHIBITED", cells: 50, area_km2: 30, pct: 33.3 },
    ],
  },
  latest_run: {
    run_id: "pub-abcdef1234567890",
    label: "baseline",
    status: "complete",
    created_at: "2026-07-19T00:00:00Z",
    completed_at: "2026-07-19T00:01:00Z",
  },
  run_history: [
    {
      run_id: "pub-abcdef1234567890",
      label: "baseline",
      lifecycle_state: "published",
      created_at: "2026-07-19T00:00:00Z",
      total_cells: 150,
      zone_distribution: [
        { zone: "SUITABLE", cells: 100, pct: 66.7 },
        { zone: "PROHIBITED", cells: 50, pct: 33.3 },
      ],
    },
  ],
  sensitivity: {
    sweep_id: "sw-1",
    base_run_id: "pub-abcdef1234567890",
    base_label: "baseline",
    created_at: "2026-07-19T00:02:00Z",
    avg_stddev: 0.2,
    max_stddev: 0.5,
    total_zone_flips: 4,
    pct_cells_flipped: 12.5,
    factor_rankings: [
      { factor_key: "population", direction: "up", mean_absolute_deviation: 0.21, zone_flips: 3 },
    ],
  },
  freshness: {
    published_at: "2026-07-20T00:00:00Z",
    days_since_published: 4,
    is_stale: false,
    stale_threshold_days: 90,
    methodology_version: "region-4-mvp-v1",
  },
};

type Dashboard = typeof BASE_DASHBOARD;

async function installDashboardMock(
  page: Page,
  opts: { body?: unknown; status?: number } = {},
) {
  const requested: string[] = [];
  await page.route(`${API}/**`, async (route: Route) => {
    const path = new URL(route.request().url()).pathname;
    requested.push(path);
    if (path === "/dashboard") {
      return route.fulfill({
        status: opts.status ?? 200,
        contentType: "application/json",
        body: JSON.stringify(opts.body ?? BASE_DASHBOARD),
      });
    }
    return route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
  });
  return requested;
}

test("renders published metrics and never fetches geometry", async ({ page }) => {
  const requested = await installDashboardMock(page);
  await page.goto("/drone/dashboard");

  await expect(page.getByRole("heading", { name: "Zoning Dashboard" })).toBeVisible();

  // Published run + distribution.
  await expect(page.getByText("Published run")).toBeVisible();
  await expect(page.getByText("66.7%")).toBeVisible();
  await expect(page.getByText("region-4-mvp-v1").first()).toBeVisible();

  // Least-stable factors + run history.
  await expect(page.getByText("Least stable factors")).toBeVisible();
  await expect(page.getByText("population")).toBeVisible();
  await expect(page.getByRole("cell", { name: "baseline" }).first()).toBeVisible();

  // Bounded aggregate only — no cell geometry endpoints touched.
  expect(requested.some((p) => p.includes("/geojson"))).toBe(false);
  expect(requested).toContain("/dashboard");
});

test("shows a stale-data banner when the publication is old", async ({ page }) => {
  const stale: Dashboard = {
    ...BASE_DASHBOARD,
    freshness: { ...BASE_DASHBOARD.freshness, is_stale: true, days_since_published: 120 },
  };
  await installDashboardMock(page, { body: stale });
  await page.goto("/drone/dashboard");

  await expect(page.getByText("Published data is 120 days old")).toBeVisible();
});

test("shows empty states when nothing is published", async ({ page }) => {
  const empty = {
    study_area: BASE_DASHBOARD.study_area,
    published: null,
    latest_run: null,
    run_history: [],
    sensitivity: null,
    freshness: {
      published_at: null, days_since_published: null, is_stale: false,
      stale_threshold_days: 90, methodology_version: "region-4-mvp-v1",
    },
  };
  await installDashboardMock(page, { body: empty });
  await page.goto("/drone/dashboard");

  await expect(page.getByText("No run is published yet.")).toBeVisible();
  await expect(page.getByText("No completed runs yet.")).toBeVisible();
});

test("shows an error state with retry", async ({ page }) => {
  await installDashboardMock(page, { status: 500, body: { detail: "boom" } });
  await page.goto("/drone/dashboard");

  await expect(page.getByText("Couldn’t load the dashboard")).toBeVisible();
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
});

test("stays within the viewport across widths", async ({ page }) => {
  await installDashboardMock(page);
  for (const width of [390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/drone/dashboard");
    await expect(page.getByRole("heading", { name: "Zoning Dashboard" })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  }
});
