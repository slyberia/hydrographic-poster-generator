import { expect, test } from "@playwright/test";

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
        name: "Turn spatial data into clear, defensible output.",
      }),
    ).toBeVisible();

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
      name: "Open Poster Generator",
    });
    const droneEntry = page.getByRole("link", { name: "Explore Drone Zoning" });
    await expect(posterEntry).toHaveAttribute("href", "/poster");
    await expect(droneEntry).toHaveAttribute("href", "/drone/start");
    await expect(page.getByRole("link", { name: "Browse Documentation" })).toHaveAttribute(
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
