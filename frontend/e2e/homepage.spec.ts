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

const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 900 },
  { width: 1440, height: 900 },
];

test("shared platform landing is server-rendered with both products", async ({
  request,
}) => {
  const response = await request.get("/");
  const html = await response.text();

  expect(html).toContain("Hydrographic Poster Generator");
  expect(html).toContain("Drone Zoning");
  expect(html).toContain("/poster");
  expect(html).toContain("/drone/start");
});

for (const viewport of VIEWPORTS) {
  test(`platform landing connects both products at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Connecting Form and Function.",
      }),
    ).toBeVisible();
    await expect(page.locator(".hps-hero__map .leaflet-container")).toBeVisible();
    await expect(page.getByText("Designed for informed planning")).toHaveCount(0);

    // Both products and the shared library are represented as cards.
    await expect(
      page.getByRole("heading", {
        level: 3,
        name: "Hydrographic Poster Generator",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        level: 3,
        name: "Drone Zoning",
      }),
    ).toBeVisible();

    // All card imagery decodes successfully.
    const posterImage = page.locator('img[src*="guyana-abyss"]');
    const droneImage = page.locator('img[src*="region-4-zoning"]');
    await expect(posterImage).toBeVisible();
    await expect(droneImage).toBeVisible();
    await expect
      .poll(() =>
        page
          .locator("img")
          .evaluateAll((images) =>
            images.every(
              (image) =>
                (image as HTMLImageElement).complete &&
                (image as HTMLImageElement).naturalWidth > 0,
            ),
          ),
      )
      .toBe(true);

    // Clear entry points to both products.
    const posterEntry = page.getByRole("link", {
      name: /Open Poster Generator/,
    });
    const droneEntry = page.locator(".hps-card--drone");
    await expect(posterEntry).toHaveAttribute("href", "/poster");
    await expect(droneEntry).toHaveAttribute("href", "/drone/start");
    await expect(page.getByRole("link", { name: /Browse Documentation/ })).toHaveAttribute(
      "href",
      "/docs",
    );

    // Keyboard focus is visible.
    await posterEntry.focus();
    const focusOutline = await posterEntry.evaluate(
      (element) => getComputedStyle(element).outlineStyle,
    );
    expect(focusOutline).not.toBe("none");

    const hasPageOverflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(hasPageOverflow).toBe(false);
  });
}
