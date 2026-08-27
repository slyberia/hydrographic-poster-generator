import { expect, test, type Page } from "@playwright/test";

const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 900 },
  { width: 1440, height: 900 },
];

async function mockSchema(page: Page) {
  await page.route("http://localhost:8000/docs", async (route) => {
    await route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><html><body><h1>Hydrographic Poster Generator API</h1><p>Swagger UI</p></body></html>",
    });
  });
}

test("curated documentation is present in the server response", async ({
  request,
}) => {
  const response = await request.get("/docs");
  expect(response.ok()).toBe(true);

  const html = await response.text();
  for (const heading of [
    "Overview",
    "Architecture",
    "Quick start",
    "Render request",
    "Export request",
    "Preset registry",
    "Errors and limits",
    "Glossary",
    "Interactive API schema",
  ]) {
    expect(html).toContain(heading);
  }
  expect(html).toContain("HydroRIVERS line geometries");
  expect(html).not.toContain("river polygons");
  expect(html).not.toContain("more than 5%");
});

test("the HPS System Library keeps system and product documentation distinct", async ({ page }) => {
  await page.goto("/documentation");
  await expect(page.getByRole("heading", { name: "Documentation with a clear home." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open Hydro Poster documentation →" })).toHaveAttribute("href", "/docs");
  await expect(page.getByText("Drone Platform")).toHaveCount(0);

  await page.goto("/docs");
  await expect(page.getByRole("link", { name: "HPS System Library →" })).toHaveAttribute("href", "/documentation");
});

test("Drone system documentation is available only under the workspace route family", async ({ page, request }) => {
  const response = await request.get("/workspace/drone/docs");
  const html = await response.text();

  expect(response.ok()).toBe(true);
  for (const technology of ["Next.js 16", "FastAPI", "Supabase PostgreSQL", "PostGIS", "Supabase Storage", "Google Cloud Run"]) {
    expect(html).toContain(technology);
  }
  expect(html).toContain("Two deliberate data paths");
  expect(html).toContain("PostgreSQL/PostGIS remains authoritative");
  expect(html).not.toContain("Vinext");
  expect(html).not.toContain("Cloudflare Worker");
  expect(html).not.toContain("D1 / Drizzle");

  await page.goto("/workspace/drone/docs");
  await expect(page.getByRole("heading", { name: "Current implementation status" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open the Published Map" })).toHaveAttribute("href", "/workspace/drone/map");
  await expect(page.getByRole("link", { name: "Open the Planning Console" })).toHaveAttribute("href", "/workspace/drone/console");
});

for (const viewport of VIEWPORTS) {
  test(`Docs experience remains coherent at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await mockSchema(page);
    await page.goto("/docs");

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Build with the Hydro Poster rendering pipeline.",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: "A constrained spatial rendering API.",
      }),
    ).toBeVisible();

    const quickStartLinks = page.locator('a[href="#quick-start"]');
    await expect(quickStartLinks.first()).toBeAttached();

    const codeBlocks = page.locator("pre");
    await expect(codeBlocks).toHaveCount(4);
    await expect(codeBlocks.nth(2)).toContainText('POST "$API_BASE/preview"');

    const schemaFrame = page.frameLocator('iframe[title="Interactive API schema"]');
    await expect(
      schemaFrame.getByRole("heading", {
        name: "Hydrographic Poster Generator API",
      }),
    ).toBeVisible({ timeout: 10_000 });

    const overflow = await page.evaluate(() => ({
      body: document.body.scrollWidth - document.body.clientWidth,
      root:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    }));
    expect(overflow.body).toBeLessThanOrEqual(1);
    expect(overflow.root).toBeLessThanOrEqual(1);
  });
}
