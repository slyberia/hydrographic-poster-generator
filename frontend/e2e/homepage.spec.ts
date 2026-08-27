import { expect, test } from "@playwright/test";

const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 900 },
  { width: 1440, height: 900 },
];

test("public platform landing omits the restricted workspace", async ({ request }) => {
  const response = await request.get("/");
  const html = await response.text();

  expect(html).toContain("Hydrographic Poster Generator");
  expect(html).toContain("/poster");
  expect(html).not.toContain("Drone Zoning");
  expect(html).not.toContain("/drone");
  expect(html).not.toContain("/workspace/drone");
});

for (const viewport of VIEWPORTS) {
  test(`platform landing presents the poster product at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1, name: "Connecting Form and Function." })).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: "Hydrographic Poster Generator" })).toBeVisible();
    await expect(page.getByText("Drone Zoning")).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Open Poster Generator/ })).toHaveAttribute("href", "/poster");
    await expect(page.getByRole("link", { name: /Browse Documentation/ }).first()).toHaveAttribute("href", "/documentation");

    const posterImages = page.locator('img[src*="guyana-abyss"]');
    await expect(posterImages.first()).toBeVisible();
    await expect.poll(() => posterImages.first().evaluate((image) => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0)).toBe(true);

    const hasPageOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(hasPageOverflow).toBe(false);
  });
}
