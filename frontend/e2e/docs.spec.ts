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
