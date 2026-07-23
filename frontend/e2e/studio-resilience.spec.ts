/** e2e/studio-resilience.spec.ts — failure injection & recovery (plan §5).
 *
 * Each case asserts (a) a visible, non-technical error surface, (b) no
 * crash/blank screen — the control panel stays interactive — and (c)
 * recovery once the mock heals. The localStorage cases pin the V1→V2
 * migration path (studio/page.tsx settings initializer) end to end.
 */

import { test, expect, Page } from "@playwright/test";
import { installStudioMockBackend, StudioMockState } from "./mockStudioBackend";

async function openStudio(page: Page): Promise<StudioMockState> {
  const state = await installStudioMockBackend(page);
  await page.goto("/studio");
  await page.getByLabel("Region").selectOption("sa");
  await page.getByLabel("Country").selectOption("geo-guyana");
  await expect(page.locator(".preview-svg svg")).toBeVisible({ timeout: 10_000 });
  return state;
}

/** The studio shell is alive: sidebar controls exist and accept input. */
async function expectNoCrash(page: Page) {
  await expect(page.getByRole("heading", { name: "Hydro Poster" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Title", exact: true })).toBeEnabled();
}

test("resilience-1: /preview 500 — error surfaces, no crash, recovers", async ({ page }) => {
  const state = await installStudioMockBackend(page);
  state.failPreview = "http500";
  await page.goto("/studio");
  await page.getByLabel("Region").selectOption("sa");
  await page.getByLabel("Country").selectOption("geo-guyana");

  await expect(page.getByText("Preview unavailable.")).toBeVisible({ timeout: 10_000 });
  await expectNoCrash(page);
  // QA blocks export while the preview is failing.
  await expect(page.getByText(/Preview failed/)).toBeVisible();

  state.failPreview = null;
  await page.getByRole("textbox", { name: "Title", exact: true }).fill("Recovered");
  await expect(page.locator(".preview-svg svg")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("Preview unavailable.")).toHaveCount(0);
});

test("resilience-2: /preview network failure — friendly message, recovers", async ({ page }) => {
  const state = await installStudioMockBackend(page);
  state.failPreview = "network";
  await page.goto("/studio");
  await page.getByLabel("Region").selectOption("sa");
  await page.getByLabel("Country").selectOption("geo-guyana");

  // Non-technical surface: no raw fetch/TypeError text.
  await expect(page.getByText("Preview unavailable.")).toBeVisible({ timeout: 10_000 });
  await expect(
    page.getByText("Could not reach the render service", { exact: false }).first(),
  ).toBeVisible();
  await expect(page.getByText("Failed to fetch", { exact: true })).toHaveCount(0);
  await expectNoCrash(page);

  state.failPreview = null;
  await page.getByRole("textbox", { name: "Title", exact: true }).fill("Back online");
  await expect(page.locator(".preview-svg svg")).toBeVisible({ timeout: 10_000 });
});

test("resilience-3: /preview returns malformed SVG — rejected, no broken canvas", async ({ page }) => {
  const state = await installStudioMockBackend(page);
  state.failPreview = "malformed";
  await page.goto("/studio");
  await page.getByLabel("Region").selectOption("sa");
  await page.getByLabel("Country").selectOption("geo-guyana");

  // The truncated document must never be injected into the canvas.
  await expect(page.getByText("Preview unavailable.")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/invalid preview/i).first()).toBeVisible();
  await expectNoCrash(page);

  state.failPreview = null;
  await page.getByRole("textbox", { name: "Title", exact: true }).fill("Healed");
  await expect(page.locator(".preview-svg svg")).toBeVisible({ timeout: 10_000 });
});

test("resilience-4: /export fails mid-download — error shown, retry succeeds", async ({ page }) => {
  const state = await openStudio(page);
  state.failExport = true;

  await page.getByRole("button", { name: "Download" }).click();
  await expect(page.getByText(/Export failed/)).toBeVisible({ timeout: 10_000 });
  await expect(
    page.getByText("Could not reach the export service", { exact: false }),
  ).toBeVisible();
  await expect(page.getByText("Failed to fetch", { exact: true })).toHaveCount(0);
  await expectNoCrash(page);

  state.failExport = false;
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download" }).click();
  const download = await downloadPromise;
  // The backend's CORS config sets no expose_headers, so the browser cannot
  // read Content-Disposition cross-origin and the client falls back to its
  // default filename. The mock mirrors that production reality (see
  // mockStudioBackend.ts); the missing expose_headers is recorded as an
  // out-of-scope backend finding in the phase completion report.
  expect(download.suggestedFilename()).toBe("hydro_export.png");
  await expect(page.getByText(/Export failed/)).toHaveCount(0);
});

test("resilience-5: V1 localStorage state migrates on load with no data loss", async ({ page }) => {
  const V1 = {
    geography_id: "geo-guyana",
    density_preset: "balanced",
    classification_preset: "standard",
    palette: "abyss",
    typography: "gallery_poster",
    title: "My Saved Poster",
    subtitle: "Saved Subtitle",
    design_asset_mode: false,
    show_legend: true,
    show_metadata: false,
  };
  await page.addInitScript((saved) => {
    localStorage.setItem("hydrorivers_settings", saved);
  }, JSON.stringify(V1));

  const state = await installStudioMockBackend(page);
  await page.goto("/studio");

  // The saved geography drives a preview with no user interaction.
  await expect(page.locator(".preview-svg svg")).toBeVisible({ timeout: 10_000 });

  // Text survives the migration.
  await expect(page.getByRole("textbox", { name: "Title", exact: true })).toHaveValue("My Saved Poster");
  await expect(page.getByRole("textbox", { name: "Subtitle", exact: true })).toHaveValue("Saved Subtitle");

  // show_metadata:false fans out to the granular toggles; show_legend stays true.
  const granular = page.locator("section", { hasText: "Content" }).locator("div.border-l");
  await expect(granular.getByRole("checkbox", { name: "Title", exact: true })).not.toBeChecked();
  await expect(granular.getByRole("checkbox", { name: "Scale Bar", exact: true })).not.toBeChecked();
  await expect(granular.getByRole("checkbox", { name: "Legend", exact: true })).toBeChecked();

  // The payload carries the migrated granular options.
  await expect.poll(() => state.previewRequests.length).toBeGreaterThan(0);
  const payload = state.previewRequests[state.previewRequests.length - 1];
  expect(payload.metadata_options).toEqual({
    show_title: false,
    show_subtitle: false,
    show_legend: true,
    show_north_arrow: false,
    show_scale_bar: false,
    show_data_credits: false,
  });

  // Persisted state is now V2.
  const persisted = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("hydrorivers_settings")!),
  );
  expect(persisted.schema_version).toBe(2);
  expect(persisted.title).toBe("My Saved Poster");
});

test("resilience-6: garbage localStorage JSON — defaults load, no crash", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("hydrorivers_settings", "{definitely not JSON!");
  });
  await installStudioMockBackend(page);
  await page.goto("/studio");

  await expectNoCrash(page);
  await expect(page.getByRole("textbox", { name: "Title", exact: true })).toHaveValue("");
  await expect(page.getByLabel("Region")).toBeVisible();
  await expect(
    page.getByText("Select a geography to generate a preview."),
  ).toBeVisible();
});
