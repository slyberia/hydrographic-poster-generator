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
  await page.goto("/workspace/drone/console");
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

test("the rail links to the dashboard and opens methodology in-console", async ({ page }) => {
  await openConsole(page);

  await expect(page.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
    "href",
    "/workspace/drone/dashboard",
  );
  await expect(page.getByRole("link", { name: "Public Explorer" })).toHaveAttribute(
    "href",
    "/workspace/drone/map",
  );
  await page.getByRole("button", { name: "Methodology" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("admins can approve and publish completed runs", async ({ page }) => {
  const state = await installMockBackend(page);
  await page.addInitScript(() => localStorage.setItem("drone.guideSeen.v1", "1"));
  await page.goto("/workspace/drone/console");

  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await expect.poll(() => state.lifecyclePosts).toContain("run-1:approve");

  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect.poll(() => state.lifecyclePosts).toContain("run-2:publish");
  await expect(page.getByText("Run published. The Public Explorer is now updated.")).toBeVisible();
});

test("Escape closes the selected-cell report", async ({ page }) => {
  await openConsole(page);

  // The report is backed by the rendered cell layer. Complete the same small
  // mocked sweep used by the stability tests so this assertion is not racing
  // the initial run-layer fetch.
  await page.getByRole("button", { name: "Run sensitivity analysis" }).click();
  await expect(page.getByText("66.67% of cells flipped zone at least once", { exact: false })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("radio", { name: "Analytical Cells" }).click();

  const map = page.locator(".mapwrap .leaflet-container");
  await expect(page.locator(".leaflet-overlay-pane canvas")).toHaveCount(1);
  const box = (await map.boundingBox())!;
  // Keep the click inside the scored cell but away from the Milestone C
  // airport marker, which is intentionally interactive and can otherwise
  // consume the map click.
  await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.3);

  const drawer = page.getByRole("dialog", { name: "Location report" });
  await expect(drawer).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(drawer).toHaveCount(0);
});
