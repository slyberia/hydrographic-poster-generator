/** e2e/drone-explore.spec.ts — Public Explorer (UX-8).
 *
 * Exercises the /drone/explore surface against a network-mocked public backend
 * (/public/drone/*). Covers: no-auth load, published-zoning render, the
 * public-safe location drawer (no score/weights), shareable ?cell= URLs, and
 * the unavailable / error states. Backend correctness is covered in
 * backend/tests/test_drone_publication.py.
 */

import { test, expect, Page, Route } from "@playwright/test";

const API = "http://localhost:8000";

const CELLS = [
  { h3: "cell_a", zone: "SUITABLE", lng: [-58.12, -58.11], lat: [6.61, 6.62] },
  { h3: "cell_b", zone: "CONDITIONAL", lng: [-58.11, -58.1], lat: [6.61, 6.62] },
  { h3: "cell_c", zone: "CONDITIONAL", lng: [-58.12, -58.11], lat: [6.6, 6.61] },
  { h3: "cell_locked", zone: "PROHIBITED", lng: [-58.11, -58.1], lat: [6.6, 6.61] },
] as const;

const CONFIG = {
  study_area: {
    slug: "region-4-demerara-mahaica",
    display_name: "Region 4 · Demerara-Mahaica",
    center: { lat: 6.6, lng: -58.1 },
    default_zoom: 10,
    min_zoom: 1,
    max_zoom: 18,
    bbox: { west: -58.9, south: 6.0, east: -57.3, north: 7.3 },
    h3_resolution: 9,
    methodology_version: "region-4-mvp-v1",
  },
  published: { published_at: "2026-07-20T00:00:00Z", methodology_version: "region-4-mvp-v1" },
};

function zoning() {
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
      properties: { h3_index: c.h3, zone: c.zone, reason: "mock reason", confidence: "verified" },
    })),
  };
}

function report(h3: string) {
  const cell = CELLS.find((c) => c.h3 === h3) ?? CELLS[0];
  const label = cell.zone.charAt(0) + cell.zone.slice(1).toLowerCase();
  return {
    h3_index: cell.h3,
    zone: cell.zone,
    classification: label,
    main_reason: "Within 300 m of hospital",
    guidance: "Formal authorization is required before operating here.",
    constraint_reasons: [],
    data_confidence: "verified",
    methodology_version: "region-4-mvp-v1",
    disclaimer: "Decision-support output only — not an official authorization.",
  };
}

interface MockOpts {
  publishedNull?: boolean;
  configStatus?: number;
}

async function installPublicMock(page: Page, opts: MockOpts = {}) {
  const requested: string[] = [];
  const json = (route: Route, body: unknown, status = 200) =>
    route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

  await page.route(`${API}/**`, async (route) => {
    const path = new URL(route.request().url()).pathname;
    requested.push(path);

    if (path === "/public/drone/config") {
      if (opts.configStatus && opts.configStatus >= 400) {
        return json(route, { detail: "boom" }, opts.configStatus);
      }
      return json(route, opts.publishedNull ? { ...CONFIG, published: null } : CONFIG);
    }
    if (path === "/public/drone/zoning") return json(route, zoning());
    const rep = path.match(/^\/public\/drone\/report\/([^/]+)$/);
    if (rep) return json(route, report(decodeURIComponent(rep[1])));

    return json(route, { detail: `Unmocked ${path}` }, 500);
  });

  await page.route("https://*.basemaps.cartocdn.com/**", (route) =>
    route.fulfill({ status: 204, body: "" }));

  return requested;
}

const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 900 },
  { width: 1440, height: 900 },
];

async function clickMapCell(page: Page, xFrac: number, yFrac: number) {
  const map = page.locator(".mapwrap .leaflet-container");
  const box = (await map.boundingBox())!;
  await page.mouse.click(box.x + box.width * xFrac, box.y + box.height * yFrac);
}

test("loads published zoning with no authentication", async ({ page }) => {
  const requested = await installPublicMock(page);
  await page.goto("/drone/explore");

  await expect(page.getByRole("heading", { name: /Public Explorer/ })).toBeVisible();
  await expect(page.getByText("Planning guidance, not flight authorization.")).toBeVisible();
  await expect(page.getByText(/Published July 20, 2026|Published 20 July 2026/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Prohibited/ })).toBeVisible();
  await expect(page.locator(".leaflet-container")).toBeVisible();

  // Never touched an authenticated / run-scoped endpoint — cannot select or
  // infer an unpublished run.
  expect(requested.some((p) => p.startsWith("/runs"))).toBe(false);
  expect(requested).toContain("/public/drone/zoning");
});

test("selecting a cell shows public-safe guidance and a shareable URL", async ({ page }) => {
  await installPublicMock(page);
  await page.goto("/drone/explore");
  await expect(page.locator(".leaflet-container")).toBeVisible();

  await clickMapCell(page, 0.4, 0.3); // top-left cell

  const drawer = page.getByRole("dialog", { name: "Location guidance" });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByText("Formal authorization is required before operating here.")).toBeVisible();
  await expect(drawer.getByText(/not an official authorization/)).toBeVisible();

  // No internal score or weight breakdown leaks into the public drawer.
  await expect(drawer.getByText(/risk score/i)).toHaveCount(0);
  await expect(drawer.getByText(/weight/i)).toHaveCount(0);

  // The URL now carries a shareable ?cell= parameter.
  await expect.poll(() => new URL(page.url()).searchParams.get("cell")).not.toBeNull();
});

test("a shared ?cell= URL opens that location's guidance on load", async ({ page }) => {
  await installPublicMock(page);
  await page.goto("/drone/explore?cell=cell_a");

  await expect(page.getByRole("dialog", { name: "Location guidance" })).toBeVisible();
  await expect(page.getByText("Within 300 m of hospital")).toBeVisible();
});

test("shows an explicit unavailable state when nothing is published", async ({ page }) => {
  await installPublicMock(page, { publishedNull: true });
  await page.goto("/drone/explore");

  await expect(page.getByText("No published zoning yet")).toBeVisible();
  // Search is disabled with nothing published.
  await expect(page.getByRole("combobox")).toBeDisabled();
});

test("shows an error state with retry when the service fails", async ({ page }) => {
  await installPublicMock(page, { configStatus: 500 });
  await page.goto("/drone/explore");

  await expect(page.getByText("Couldn’t load the map")).toBeVisible();
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
});

test("navigation focus is visible and the page never overflows", async ({ page }) => {
  await installPublicMock(page);

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize(viewport);
    await page.goto("/drone/explore");
    await expect(page.locator(".leaflet-container")).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  }

  await page.keyboard.press("Tab");
  const focused = page.locator(":focus");
  await expect(focused).toBeVisible();
});
