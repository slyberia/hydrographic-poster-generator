import { expect, test } from "@playwright/test";

const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 900 },
  { width: 1440, height: 900 },
];

for (const viewport of VIEWPORTS) {
  test(`homepage product proof at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Hydrographic Poster Generator",
      }),
    ).toBeVisible();

    const heroPoster = page.getByAltText(
      "Generated Guyana river network poster using the Abyss palette",
    );
    await expect(heroPoster).toBeVisible();
    const heroBounds = await heroPoster.boundingBox();
    expect(heroBounds).not.toBeNull();
    expect(heroBounds!.y).toBeLessThan(viewport.height);

    const primaryAction = page.getByRole("link", {
      name: "Create a poster",
      exact: true,
    });
    await expect(primaryAction).toBeVisible();
    await expect(primaryAction).toHaveAttribute("href", "/studio");
    await primaryAction.focus();
    const focusOutline = await primaryAction.evaluate(
      (element) => getComputedStyle(element).outlineStyle,
    );
    expect(focusOutline).not.toBe("none");

    const paletteImages = page.locator(
      'img[alt^="Guyana river network poster in the"]',
    );
    await expect(paletteImages).toHaveCount(3);
    for (const [palette, filename] of [
      ["Abyss", "guyana-abyss.webp"],
      ["Parchment", "guyana-parchment.webp"],
      ["Obsidian", "guyana-obsidian.webp"],
    ]) {
      const image = page.getByAltText(
        `Guyana river network poster in the ${palette} palette`,
      );
      await expect(image).toHaveAttribute("src", new RegExp(filename));
    }
    await expect
      .poll(() =>
        paletteImages.evaluateAll((images) =>
          images.every(
            (image) =>
              (image as HTMLImageElement).complete &&
              (image as HTMLImageElement).naturalWidth > 0,
          ),
        ),
      )
      .toBe(true);

    for (const heading of [
      "Clip a boundary",
      "Classify the network",
      "Compose the poster",
      "Render for use",
    ]) {
      await expect(
        page.getByRole("heading", { level: 3, name: heading }),
      ).toBeAttached();
    }

    const hasPageOverflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(hasPageOverflow).toBe(false);
  });
}
