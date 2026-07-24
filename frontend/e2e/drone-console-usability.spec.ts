/** e2e/drone-console-usability.spec.ts — UX-7 console usability.
 *
 * Verifies the layout changes (grouped controls with progressive disclosure,
 * rail collapse for a map-dominant workspace, section navigation, and
 * Escape-to-close on the report) on top of the unchanged analytical behaviour
 * covered by drone-console.spec.ts.
 */

import { test, expect, Page } from "@playwright/test";
import { installMockBackend } from "./mockBackend";

async function openConsole(page: Page) {
  await installMockBackend(page);
  await page.addInitScript(() => localStorage.setItem("drone.guideSeen.v1", "1"));
  await page.goto("/drone/console");
  await expect(page.locator(".zonestrip-row")).toHaveCount(4);
}

test("advanced controls are collapsed by default, primary controls are not", async ({ page }) => {
  await openConsole(page);

  // Primary workflow controls are visible without any disclosure.
  await expect(page.getByRole("button", { name: "Run zoning model", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Run sensitivity analysis" })).toBeVisible();

  // Factors (weights) and Export are collapsed → their controls are hidden,
  // reducing simultaneously-visible controls.
  await expect(page.locator("#w-population")).toBeHidden();
  await expect(page.getByRole("button", { name: "Export current view" })).toBeHidden();

  // Expanding Factors reveals the weight inputs.
  await page.locator("summary", { hasText: "Factors" }).click();
  await expect(page.locator("#w-population")).toBeVisible();
});

test("collapsing the rail hands the workspace to the map, and it reopens", async ({ page }) => {
  await openConsole(page);

  await expect(page.getByRole("button", { name: "Run zoning model", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Hide controls and expand the map" }).click();
  await expect(page.getByRole("button", { name: "Run zoning model", exact: true })).toBeHidden();

  const reopen = page.getByRole("button", { name: "Show controls" });
  await expect(reopen).toBeVisible();
  await reopen.click();
  await expect(page.getByRole("button", { name: "Run zoning model", exact: true })).toBeVisible();
});

test("the rail links to the dashboard and methodology", async ({ page }) => {
  await openConsole(page);

  await expect(page.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
    "href",
    "/drone/dashboard",
  );
  await expect(page.getByRole("link", { name: "Methodology" })).toHaveAttribute(
    "href",
    "/drone/methodology",
  );
});

test("Escape closes the selected-cell report", async ({ page }) => {
  await openConsole(page);

  const map = page.locator(".mapwrap .leaflet-container");
  const box = (await map.boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.4, box.y + box.height * 0.3);

  const drawer = page.getByRole("dialog", { name: "Location report" });
  await expect(drawer).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(drawer).toHaveCount(0);
});
