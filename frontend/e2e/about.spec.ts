import { expect, test } from "@playwright/test";

const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 900 },
  { width: 1440, height: 900 },
];

test("About content is present in the server response", async ({ request }) => {
  const response = await request.get("/about");
  expect(response.ok()).toBe(true);

  const html = await response.text();
  expect(html).toContain("River data, composed for print.");
  expect(html).toContain("Boundary selection");
  expect(html).toContain("PostGIS clipping");
  expect(html).toContain("South America and North/Central America");
});

for (const viewport of VIEWPORTS) {
  test(`About page remains coherent at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/about");

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "River data, composed for print.",
      }),
    ).toBeVisible();

    for (const heading of [
      "Boundary selection",
      "PostGIS clipping",
      "Network classification",
      "SVG composition",
      "Export",
    ]) {
      await expect(
        page.getByRole("heading", { level: 3, name: heading }),
      ).toBeAttached();
    }

    const poster = page.getByAltText(
      "Generated Guyana river network poster using the Parchment palette",
    );
    await expect(poster).toBeVisible();
    await expect
      .poll(() =>
        poster.evaluate(
          (image) =>
            (image as HTMLImageElement).complete &&
            (image as HTMLImageElement).naturalWidth > 0,
        ),
      )
      .toBe(true);

    const studioLink = page.getByRole("link", {
      name: "Open the Studio",
      exact: true,
    });
    await expect(studioLink).toHaveAttribute("href", "/studio");
    await studioLink.focus();
    expect(
      await studioLink.evaluate(
        (element) => getComputedStyle(element).outlineStyle,
      ),
    ).not.toBe("none");

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
