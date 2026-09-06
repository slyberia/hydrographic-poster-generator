import { test, expect } from "@playwright/test";
import path from "node:path";

// Opt-in integration suite against work/serve_georef_demo.py and the real processing code.
test.skip(!process.env.GEOREF_INTEGRATION, "Requires the local georeferencing integration server");

test("recover real-source PNG, view QC, download, and retain result after an error", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto("/georeference");
  await expect(page.getByRole("heading", { name: "Georeferencer" })).toBeVisible();
  // Loaded source options establish that hydration and initial requests have completed.
  await expect(page.getByRole("option", { name: "Jamaica", exact: true })).toBeAttached();
  await page.getByLabel("Poster image", { exact: true }).setInputFiles(path.resolve("../work/jamaica-poster.png"));
  await page.getByRole("button", { name: "Analyze alignment" }).click();
  await expect(page.getByRole("heading", { name: "Alignment accepted under provisional criteria" })).toBeVisible({ timeout: 60000 });
  await expect(page.getByAltText(/Alignment overlay/)).toBeVisible();
  await page.getByRole("button", { name: "Open geographic inspection" }).click();
  const map = page.getByRole("region", { name: "Geographic inspection", exact: true });
  await expect(map.getByLabel("Show OpenStreetMap basemap")).not.toBeChecked();
  await expect(map.locator("svg image")).toHaveAttribute("transform", /^matrix\(/);
  await page.getByRole("button", { name: "Load rivers in view" }).click();
  const reaches = map.getByRole("combobox");
  await expect(reaches).toBeVisible();
  await reaches.selectOption({ index: 1 });
  await expect(map.getByLabel("Selected river attributes")).toContainText("HydroRIVERS ID");
  await page.getByLabel("Poster opacity").fill("1");
  await map.screenshot({ path: "../work/georef-inspection-map.png" });
  await page.getByLabel("Poster opacity").fill("0.35");
  await expect(map).toContainText("Poster opacity: 35%");
  await page.route("**/tile.openstreetmap.org/**", route => route.fulfill({ contentType: "image/png",
    body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jx1kAAAAASUVORK5CYII=", "base64") }));
  await map.getByLabel("Show OpenStreetMap basemap").check();
  await expect(map.locator(".leaflet-tile-loaded").first()).toBeVisible();
  await map.getByLabel("Show OpenStreetMap basemap").uncheck();
  await page.getByRole("button", { name: "Clear source overlay" }).click();
  await expect(reaches).toHaveCount(0);
  await page.screenshot({ path: "../work/georef-recovery-browser.png", fullPage: true });
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download GeoTIFF" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.tif$/);
  await download.saveAs("../work/browser-recovery.tif");
  const qcPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download QC report" }).click();
  expect((await qcPromise).suggestedFilename()).toBe("alignment-qc.json");
  await page.getByLabel("Poster ID (optional)", { exact: true }).fill("not-a-uuid");
  await page.getByRole("button", { name: "Analyze alignment" }).click();
  await expect(page.locator("form [role=alert]")).toBeVisible({ timeout: 30000 });
  await expect(page.getByRole("heading", { name: "Alignment accepted under provisional criteria" })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "../work/georef-mobile.png", fullPage: true });
  const overflowing = await page.evaluate(() => Array.from(document.querySelectorAll("body *"))
    // Leaflet intentionally pans oversized SVGs inside its overflow:hidden viewport.
    .filter(el => !el.parentElement?.closest(".leaflet-container") && el.getBoundingClientRect().right > window.innerWidth + 1)
    .map(el => ({ tag: el.tagName, className: el.className, width: el.getBoundingClientRect().width,
      parentStyle: el.parentElement ? getComputedStyle(el.parentElement).flexWrap : "none" })));
  expect(overflowing).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test("native export from Studio displays measured QC and downloads TIFF", async ({ page }) => {
  await page.goto("/studio");
  await page.getByLabel("Region", { exact: true }).selectOption("north_central_america");
  await page.getByLabel("Country", { exact: true }).selectOption("3918122c-61f6-43cb-84cf-5e8213ab0b23");
  await page.getByLabel("Format", { exact: true }).selectOption("geotiff");
  await expect(page.getByTestId("poster-canvas")).toBeVisible({ timeout: 30000 });
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /download/i }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.tif$/);
  await expect(page.getByRole("heading", { name: "Alignment accepted under provisional criteria" })).toBeVisible();
  await page.screenshot({ path: "../work/georef-native-browser.png", fullPage: true });
});
