import { expect, test } from "@playwright/test";

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1024, height: 768 },
  { name: "wide", width: 1440, height: 960 },
];

test("workspace overview is available through the canonical private route in local development", async ({ page, request }) => {
  const response = await request.get("/workspace/drone");
  expect(await response.text()).toContain("Drone Zoning Decision Support");

  await page.goto("/workspace/drone");
  await expect(page.getByRole("heading", { name: "Drone Zoning Decision Support" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Explore Drone Zoning" })).toHaveAttribute("href", "/workspace/drone/start");
  await expect(page.getByRole("link", { name: "Explore published map" })).toHaveAttribute("href", "/workspace/drone/map");
  await expect(page.getByRole("link", { name: "Open planning console" })).toHaveAttribute("href", "/workspace/drone/console");
});

test("workspace view chooser presents two authenticated application paths", async ({ page }) => {
  await page.goto("/workspace/drone/start");
  await expect(page.getByRole("heading", { name: "Choose the view that matches your task." })).toBeVisible();
  await expect(page.getByRole("link", { name: /Published Map/ })).toHaveAttribute("href", "/workspace/drone/map");
  await expect(page.locator('.drone-start-card[href="/workspace/drone/console"]')).toHaveAttribute("href", "/workspace/drone/console");
  await expect(page.getByText("Viewer access required")).toBeVisible();
  await expect(page.getByText("Authorized users only")).toBeVisible();
});

test("legacy Drone routes canonicalize into the workspace", async ({ request }) => {
  const response = await request.get("/drone/explore", { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  expect(response.headers().location).toContain("/workspace/drone/map");
  expect(response.headers()["x-robots-tag"]).toBe("noindex, nofollow, noarchive");
});

test("workspace navigation stays inside the authenticated route family", async ({ page }) => {
  await page.goto("/workspace/drone");
  const navigation = page.getByRole("navigation", { name: "Drone product navigation" });
  await expect(navigation.getByRole("link", { name: "Overview" })).toHaveAttribute("href", "/workspace/drone");
  await expect(navigation.getByRole("link", { name: "Published map" })).toHaveAttribute("href", "/workspace/drone/map");
  await expect(navigation.getByRole("link", { name: "Pilot status" })).toHaveAttribute("href", "/workspace/drone/dashboard");
  await expect(navigation.getByRole("link", { name: "Open the Planning Console" })).toHaveAttribute("href", "/workspace/drone/console");
});

for (const viewport of VIEWPORTS) {
  test(`workspace routes remain contained at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    for (const route of ["/workspace/drone", "/workspace/drone/start"]) {
      await page.goto(route);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    }
  });
}

test("methodology remains inside the Planning Console", async ({ page }) => {
  await page.goto("/workspace/drone/guide");
  await expect(page).toHaveURL(/\/workspace\/drone\/console$/);
  await expect(page.getByRole("button", { name: "How this console works" })).toBeVisible();
});
