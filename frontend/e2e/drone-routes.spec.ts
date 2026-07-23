import { expect, test } from "@playwright/test";

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1024, height: 768 },
  { name: "wide", width: 1440, height: 960 },
];

test("Drone landing is server-rendered and exposes truthful product entry points", async ({
  page,
  request,
}) => {
  const response = await request.get("/drone");
  const html = await response.text();

  expect(html).toContain("Drone Zoning Decision Support");
  expect(html).toContain("Region 4");
  expect(html).toContain("Planning Console");
  expect(html).toContain("Public Explorer");

  await page.goto("/drone");
  await expect(
    page.getByRole("heading", { name: "Drone Zoning Decision Support" }),
  ).toBeVisible();
  await expect(page.getByText("Public Explorer").first()).toBeVisible();
  await expect(page.getByText("Not yet available")).toBeVisible();
  await expect(page.getByRole("link", { name: "Open Planning Console" })).toHaveAttribute(
    "href",
    "/drone/console",
  );
  await expect(page.getByText("Guidance is not authorization")).toBeVisible();

  const heroImage = page.locator('img[src*="region-4-zoning"]');
  await expect(heroImage).toBeVisible();
  await expect(heroImage).toHaveJSProperty("complete", true);
  expect(await heroImage.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(
    0,
  );
});

for (const viewport of VIEWPORTS) {
  test(`Drone public routes remain contained at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    for (const route of ["/drone", "/drone/methodology"]) {
      await page.goto(route);
      await expect(page.locator("body")).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);
    }
  });
}

test("Methodology is server-rendered and legacy guide URL redirects", async ({
  page,
  request,
}) => {
  const response = await request.get("/drone/methodology");
  const html = await response.text();

  expect(html).toContain("How the zoning model works");
  expect(html).toContain("Decision support, not flight authorization");

  await page.goto("/drone/guide");
  await expect(page).toHaveURL(/\/drone\/methodology$/);
  await expect(page.getByRole("heading", { name: "How the zoning model works" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open the Planning Console" })).toHaveAttribute(
    "href",
    "/drone/console",
  );
});

test("Public navigation has visible keyboard focus", async ({ page }) => {
  await page.goto("/drone");
  await page.keyboard.press("Tab");
  const focused = page.locator(":focus");
  await expect(focused).toBeVisible();
  await expect(focused).toHaveCSS("outline-style", "solid");
});
