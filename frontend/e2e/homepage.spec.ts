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
  expect(html).toContain("Drone Zoning Decision Support");
  expect(html).toContain("/poster");
  expect(html).toContain("/drone");
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

    // Both products are represented as headings.
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: "Hydrographic Poster Generator",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: "Drone Zoning Decision Support",
      }),
    ).toBeVisible();

    // Real output imagery for both products, actually decoded.
    const posterImage = page.getByAltText(
      "Generated Guyana river network poster using the Abyss palette",
    );
    const droneImage = page.getByAltText(
      "Region 4 drone zoning output showing classified cells around Georgetown",
    );
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
      name: "Explore the Poster Generator",
    });
    const droneEntry = page.getByRole("link", { name: "Explore Drone Zoning" });
    await expect(posterEntry).toHaveAttribute("href", "/poster");
    await expect(droneEntry).toHaveAttribute("href", "/drone");
    await expect(
      page.getByRole("link", { name: "Open the Studio" }),
    ).toHaveAttribute("href", "/studio");
    await expect(
      page.getByRole("link", { name: "Read the methodology" }),
    ).toHaveAttribute("href", "/drone/methodology");

    // Both products are first-viewport signals: on desktop the cards sit
    // side by side within the first screen; on mobile they stack, so at least
    // the first product's output is above the fold.
    const posterImageBounds = await posterImage.boundingBox();
    expect(posterImageBounds).not.toBeNull();
    expect(posterImageBounds!.y).toBeLessThan(viewport.height);
    if (viewport.width >= 768) {
      const droneImageBounds = await droneImage.boundingBox();
      expect(droneImageBounds).not.toBeNull();
      expect(droneImageBounds!.y).toBeLessThan(viewport.height);
    }

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
