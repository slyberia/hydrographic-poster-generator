import { expect, test } from "@playwright/test";

const publishedMap = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { zone: "suitable" },
      geometry: {
        type: "Polygon",
        coordinates: [[[-58.3, 6.65], [-58.1, 6.65], [-58.1, 6.85], [-58.3, 6.85], [-58.3, 6.65]]],
      },
    },
  ],
};

test.beforeEach(async ({ page }) => {
  await page.route("**/public/drone/config", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        study_area: { display_name: "Region 4", center: { lat: 6.75, lng: -58.2 }, default_zoom: 10 },
        published: {
          published_at: "2026-08-13T00:00:00Z",
          artifacts: [{ type: "dissolved", url: "/public/drone/zoning", sha256: "test", byte_size: 1 }],
        },
      }),
    });
  });
  await page.route("**/public/drone/zoning", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(publishedMap) });
  });
});

test("executive overview presents an interactive map and consistent content blocks", async ({ page }) => {
  await page.goto("/executive-overview");

  await expect(page.getByRole("heading", { name: "Drone Zoning Decision Support" })).toBeVisible();
  await expect(page.locator(".overview-map .leaflet-container")).toBeVisible();
  await expect(page.locator(".capability-label")).toHaveCount(4);
  await expect(page.locator(".audience-card img")).toHaveCount(7);
  await expect(page.getByText("HPS Geospatial platform", { exact: false })).toHaveCount(0);
});

test("executive overview stays contained on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/executive-overview");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});
