import { expect, test } from "@playwright/test";

const API = "http://localhost:8000";

const DASHBOARD = {
  study_area: {
    slug: "region-4-demerara-mahaica",
    display_name: "Region 4",
    methodology_version: "region-4-mvp-v1",
  },
  published: {
    run_id: "published-1",
    label: "Current baseline",
    lifecycle_state: "published",
    published_at: "2026-08-22T12:00:00Z",
    published_by: "admin-1",
    total_cells: 100,
    analyzed_area_km2: 42,
    zone_distribution: [],
  },
  latest_run: {
    run_id: "run-2",
    label: "September review",
    status: "complete",
    created_at: "2026-09-01T10:00:00Z",
    completed_at: "2026-09-01T10:01:00Z",
  },
  run_history: [],
  sensitivity: null,
  freshness: {
    published_at: "2026-08-22T12:00:00Z",
    days_since_published: 10,
    is_stale: false,
    stale_threshold_days: 30,
    methodology_version: "region-4-mvp-v1",
  },
};

async function mockWorkspaceStatus(page: import("@playwright/test").Page) {
  await page.route(`${API}/dashboard`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(DASHBOARD) }),
  );
  await page.route(`${API}/workspace/drone/reference-layers/config`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        layers: [],
        version: "2",
        manifest_url: "/workspace/drone/reference-layers/manifest",
      }),
    }),
  );
  await page.route(`${API}/workspace/drone/reference-layers/manifest`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        schema_version: 1,
        dataset_version: "reference-v2",
        generated_at: "2026-08-22T14:00:00Z",
        reference_only: true,
        artifact: {
          url: "/workspace/drone/reference-layers/dataset",
          storage_path: "drone/reference/region-4/reference-v2/references.geojson",
          sha256: "abc",
          byte_size: 1024,
          feature_count: 48,
        },
        layers: [
          { key: "airports", group: "aviation", available: true, feature_count: 2 },
          { key: "schools", group: "infrastructure", available: true, feature_count: 46 },
        ],
      }),
    }),
  );
}

test("workspace hub server shell exposes no private data on the public homepage", async ({ request }) => {
  const workspaceResponse = await request.get("/workspace");
  const workspaceHtml = await workspaceResponse.text();
  const homeHtml = await (await request.get("/")).text();

  expect(workspaceResponse.status()).toBe(200);
  expect(workspaceHtml).toContain("Authorized HPS portal");
  expect(workspaceHtml).toContain("Recent platform updates");
  expect(homeHtml).not.toContain("Drone Zoning");
  expect(homeHtml).toContain("Login");
  expect(homeHtml).not.toContain("Workspace sign in");
});

test("workspace hub presents applications, live data status, and updates", async ({ page }) => {
  await mockWorkspaceStatus(page);
  await page.goto("/workspace");

  await expect(page.getByRole("heading", { level: 1, name: "Workspace" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Drone Zoning" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Hydrographic Poster Generator" })).toBeVisible();
  await expect(page.getByText("Current baseline · complete")).toHaveCount(0);
  await expect(page.getByText("September review · complete")).toBeVisible();
  await expect(page.getByText("48 features")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Recent platform updates" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open application" }).first()).toHaveAttribute("href", "/workspace/drone");
});

test("workspace status panels degrade independently", async ({ page }) => {
  await page.route(`${API}/dashboard`, (route) => route.fulfill({ status: 503, body: "offline" }));
  await page.route(`${API}/workspace/drone/reference-layers/config`, (route) =>
    route.fulfill({ status: 503, body: "offline" }),
  );

  await page.goto("/workspace");

  await expect(page.getByText("Unavailable").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Drone Zoning" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Recent platform updates" })).toBeVisible();
});
