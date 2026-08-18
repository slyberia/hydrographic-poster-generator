import { expect, test } from "@playwright/test";

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1024, height: 768 },
  { name: "wide", width: 1440, height: 960 },
];

test("Drone homepage is server-rendered and preserves the planning overview", async ({
  page,
  request,
}) => {
  const response = await request.get("/drone");
  const html = await response.text();

  expect(html).toContain("Drone Zoning Decision Support");
  expect(html).toContain("Pilot decision framework");
  expect(html).toContain("Planning Console");
  expect(html).toContain("/drone/start");

  await page.goto("/drone");
  await expect(
    page.getByRole("heading", { name: "Drone Zoning Decision Support" }),
  ).toBeVisible();
  await expect(page.getByText("Pilot decision framework")).toBeVisible();
  await expect(page.getByRole("link", { name: "Explore Drone Zoning" })).toHaveAttribute(
    "href",
    "/drone/start",
  );
  await expect(page.getByRole("link", { name: "Explore published map" })).toHaveAttribute(
    "href",
    "/drone/explore",
  );
  await expect(page.getByRole("link", { name: "Open Planning Console" })).toHaveAttribute(
    "href",
    "/drone/console",
  );
  await expect(page.getByText("Guidance is not authorization")).toBeVisible();
});

test("Drone view chooser presents two fully clickable application paths", async ({ page }) => {
  await page.goto("/drone/start");

  await expect(
    page.getByRole("heading", { name: "Choose the view that matches your task." }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Public Explorer/ })).toHaveAttribute(
    "href",
    "/drone/explore",
  );
  await expect(page.locator('.drone-start-card[href="/drone/console"]')).toHaveAttribute(
    "href",
    "/drone/console",
  );
  await expect(page.getByText("No sign-in required")).toBeVisible();
  await expect(page.getByText("Authorized users")).toBeVisible();
});

test("legacy Executive Overview route resolves to the Drone homepage", async ({ request }) => {
  const response = await request.get("/executive-overview", { maxRedirects: 0 });
  expect(response.status()).toBe(308);
  expect(response.headers().location).toBe("/drone");
});

test("legacy documentation Executive Overview resolves to the canonical Drone homepage", async ({ request }) => {
  const response = await request.get("/documentation/drone-platform/executive-overview", { maxRedirects: 0 });
  expect(response.status()).toBe(308);
  expect(response.headers().location).toBe("/drone");
});

test("public navigation separates published information from the internal console", async ({ page }) => {
  await page.goto("/drone");
  const navigation = page.getByRole("navigation", { name: "Drone product navigation" });

  await expect(navigation.getByRole("link", { name: "Overview" })).toHaveAttribute("href", "/drone");
  await expect(navigation.getByRole("link", { name: "Public map" })).toHaveAttribute("href", "/drone/explore");
  await expect(navigation.getByRole("link", { name: "Pilot status" })).toHaveAttribute("href", "/drone/dashboard");
  await expect(navigation.getByRole("link", { name: "Open the internal Planning Console" })).toHaveAttribute("href", "/drone/console");
  await expect(navigation.getByRole("link", { name: "Choose a view" })).toHaveCount(0);
});

for (const viewport of VIEWPORTS) {
  test(`Drone public routes remain contained at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    for (const route of ["/drone", "/drone/start"]) {
      await page.goto(route);
      await expect(page.locator("body")).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);
    }
  });
}

test("Methodology is available through the Planning Console", async ({
  page,
  request,
}) => {
  const response = await request.get("/drone/methodology", { maxRedirects: 0 });
  expect(response.status()).toBeGreaterThanOrEqual(300);
  expect(response.status()).toBeLessThan(400);
  expect(response.headers().location).toBe("/drone/console");

  await page.goto("/drone/guide");
  await expect(page).toHaveURL(/\/drone\/console$/);
  await expect(page.getByRole("button", { name: "How this console works" })).toBeVisible();
});

test("Public navigation has visible keyboard focus", async ({ page }) => {
  await page.goto("/drone");
  await page.keyboard.press("Tab");
  const focused = page.locator(":focus");
  await expect(focused).toBeVisible();
  await expect(focused).toHaveCSS("outline-style", "solid");
});
