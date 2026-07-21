/** e2e/drone-console.spec.ts — automated Phase D QA suite.
 *
 * Automates steps 1–9 of the manual QA script in PHASE_D_FRONTEND_PLAN.md §7
 * against a network-mocked backend (see mockBackend.ts). Step 10 (`npm run
 * build` warning check) stays in the verification commands, not here.
 *
 * Canvas pixel colors are not asserted (Leaflet canvas renderer); map-state
 * coverage comes from clicking cells (hit-testing through the real canvas)
 * and from the DOM the map state drives (legend, toggles, drawer).
 */

import { test, expect, Page } from "@playwright/test";
import { installMockBackend, MockState } from "./mockBackend";

async function openConsole(page: Page): Promise<MockState> {
  const state = await installMockBackend(page);
  // Mark the first-visit guide as already seen so its modal doesn't overlay the
  // console during the functional tests (first-visit behaviour has its own test).
  await page.addInitScript(() => localStorage.setItem("drone.guideSeen.v1", "1"));
  await page.goto("/drone");
  // Loaded = zone strip rendered from run stats.
  await expect(page.locator(".zonestrip-row")).toHaveCount(4);
  return state;
}

async function triggerSweep(page: Page) {
  await page.getByRole("button", { name: "Run sensitivity analysis" }).click();
}

const completeLine = (page: Page) =>
  page.getByText("66.67% of cells flipped zone at least once", { exact: false });

// Map-relative click points (fitBounds, north up; see mockBackend cell layout).
const CELL_A = { xFrac: 0.4, yFrac: 0.3 }; // top-left: SUITABLE, LOW volatility
const CELL_LOCKED = { xFrac: 0.65, yFrac: 0.7 }; // bottom-right: PROHIBITED, absent from volatility

async function clickMapCell(page: Page, pt: { xFrac: number; yFrac: number }) {
  const map = page.locator(".mapwrap .leaflet-container");
  const box = (await map.boundingBox())!;
  await page.mouse.click(box.x + box.width * pt.xFrac, box.y + box.height * pt.yFrac);
}

test("QA-1: console loads — rail, zone strip, weights, runs", async ({ page }) => {
  await openConsole(page);
  await expect(page.getByRole("heading", { name: /Drone Airspace Zoning/ })).toBeVisible();
  await expect(page.locator(".weightrow")).toHaveCount(6);
  await expect(page.locator(".runitem")).toHaveCount(2);
  await expect(page.locator(".runitem").first()).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Run sensitivity analysis" })).toBeEnabled();
});

test("QA-2: trigger sweep — progress advances, sidebar unchanged", async ({ page }) => {
  await openConsole(page);
  await triggerSweep(page);

  // Immediately after trigger: running with the 202 payload's counts.
  await expect(page.getByText("Running 0/12 perturbation runs")).toBeVisible();
  // First 5s poll advances progress.
  await expect(page.getByText("Running 6/12 perturbation runs")).toBeVisible({ timeout: 8_000 });
  // Second poll completes.
  await expect(completeLine(page)).toBeVisible({ timeout: 8_000 });

  // Sidebar never fills with sweep children (client renders /runs verbatim;
  // server-side filtering is covered by backend test_list_runs_excludes_children).
  await expect(page.locator(".runitem")).toHaveCount(2);
});

test("QA-1b: first-visit guide dialog auto-opens once, dismiss persists", async ({ page }) => {
  await installMockBackend(page);
  // No guideSeen flag set → the dialog should auto-open on first load.
  await page.goto("/drone");
  const dialog = page.getByRole("dialog", { name: /How this console works/i });
  await expect(dialog).toBeVisible();
  // Layered content: both core topics and a "more detail" disclosure present.
  await expect(dialog.getByRole("heading", { name: /What is a Zoning Model\?/i })).toBeVisible();
  await expect(dialog.getByRole("heading", { name: /What is a Sensitivity Analysis\?/i })).toBeVisible();
  await expect(dialog.getByText("More detail").first()).toBeVisible();

  await dialog.getByRole("button", { name: "Got it" }).click();
  await expect(dialog).toHaveCount(0);

  // Reload: the flag persists, so it does not auto-open again.
  await page.reload();
  await expect(page.locator(".zonestrip-row")).toHaveCount(4);
  await expect(page.getByRole("dialog", { name: /How this console works/i })).toHaveCount(0);

  // …but the rail button re-opens it on demand.
  await page.getByRole("button", { name: /How this console works/i }).click();
  await expect(page.getByRole("dialog", { name: /How this console works/i })).toBeVisible();
});

test("QA-3: no duplicate trigger while running", async ({ page }) => {
  const state = await openConsole(page);
  await triggerSweep(page);
  await expect(page.getByText(/Running .* perturbation runs/)).toBeVisible();
  // The trigger control is gone while running — duplicates are impossible client-side.
  await expect(page.getByRole("button", { name: /sensitivity analysis/ })).toHaveCount(0);
  expect(state.triggerPosts).toBe(1);
});

test("QA-4: completion — ranking table sorted, summary present", async ({ page }) => {
  await openConsole(page);
  await triggerSweep(page);
  await expect(completeLine(page)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("4 flips total")).toBeVisible();

  const rows = page.locator(".ranktable tbody tr");
  await expect(rows).toHaveCount(2);
  // Delivered order preserved: flips desc, MAD desc.
  await expect(rows.nth(0)).toContainText("population");
  await expect(rows.nth(0)).toContainText("3");
  await expect(rows.nth(0)).toContainText("0.210");
  await expect(rows.nth(1)).toContainText("environmental");
});

test("QA-5: volatility mode — toggle, legend, constraint-locked label", async ({ page }) => {
  await openConsole(page);
  await triggerSweep(page);
  await expect(completeLine(page)).toBeVisible({ timeout: 15_000 });

  const volRadio = page.getByRole("radio", { name: "Volatility" });
  await volRadio.click();
  await expect(volRadio).toHaveAttribute("aria-checked", "true");

  const legend = page.locator(".vol-legend");
  await expect(legend).toBeVisible();
  await expect(legend).toContainText("Low · stable");
  await expect(legend).toContainText("High · may cross zone boundary");
  await expect(legend).toContainText("Constraint-locked (stable by definition)");
});

test("QA-6: drawer stability — scored cell and constraint-locked cell", async ({ page }) => {
  await openConsole(page);
  await triggerSweep(page);
  await expect(completeLine(page)).toBeVisible({ timeout: 15_000 });
  await page.getByRole("radio", { name: "Volatility" }).click();

  // Scored cell (LOW): category chip + flips out of total.
  await clickMapCell(page, CELL_A);
  const drawer = page.getByRole("dialog", { name: "Location report" });
  await expect(drawer).toBeVisible();
  await expect(drawer).toContainText("Stability");
  await expect(drawer).toContainText("LOW");
  await expect(drawer).toContainText("σ 0.050");
  await expect(drawer).toContainText("0 / 12 zone flips");
  await drawer.getByRole("button", { name: "Close report" }).click();

  // Constraint-locked cell: absent from volatility → explicit locked message.
  await clickMapCell(page, CELL_LOCKED);
  await expect(drawer).toBeVisible();
  await expect(drawer).toContainText("Constraint-locked — not affected by weight changes.");
});

test("QA-7: zone visibility toggles — checkbox state and strip dimming", async ({ page }) => {
  await openConsole(page);
  const suitable = page.locator("#zv-SUITABLE");
  await expect(suitable).toBeChecked();

  await suitable.uncheck();
  await expect(suitable).not.toBeChecked();
  // The strip segment for SUITABLE dims (opacity 0.25). Segments render in
  // stats order: PROHIBITED, RESTRICTED, CONDITIONAL, SUITABLE.
  await expect(page.locator(".zonestrip-seg").nth(3)).toHaveCSS("opacity", "0.25");

  await suitable.check();
  await expect(page.locator(".zonestrip-seg").nth(3)).toHaveCSS("opacity", "1");
});

test("QA-8: run switch mid-poll — panel resets, polling stops", async ({ page }) => {
  const state = await openConsole(page);
  await triggerSweep(page);
  await expect(page.getByText(/Running .* perturbation runs/)).toBeVisible();

  await page.locator(".runitem", { hasText: "alt weights" }).click();

  // Panel back to idle for the new run.
  await expect(page.getByRole("button", { name: "Run sensitivity analysis" })).toBeVisible();
  // Polling for the abandoned sweep stops: no status calls in the next 6s
  // (poll cadence is 5s, so a leaked interval would have fired).
  const pollsAtSwitch = state.statusPolls;
  await page.waitForTimeout(6_000);
  expect(state.statusPolls).toBe(pollsAtSwitch);
});

test("QA-9: backend down — error surfaces, console stays usable", async ({ page }) => {
  const state = await openConsole(page);
  state.failTrigger = true;
  await triggerSweep(page);

  await expect(page.getByText(/Sweep failed/)).toBeVisible();
  // Recoverable: re-trigger offered, rest of the console still interactive.
  state.failTrigger = false;
  await expect(page.getByRole("button", { name: "Re-run sensitivity analysis" })).toBeVisible();
  // exact: the run-action ⓘ tooltip ("What Run zoning model does") also
  // substring-matches "Run zoning model"; we mean the run button itself.
  await expect(page.getByRole("button", { name: "Run zoning model", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Re-run sensitivity analysis" }).click();
  await expect(completeLine(page)).toBeVisible({ timeout: 15_000 });
});
