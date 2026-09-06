import { test, expect } from "@playwright/test";
import path from "node:path";

// Opt-in integration suite against work/serve_georef_demo.py and the real processing code.
test.skip(!process.env.GEOREF_INTEGRATION, "Requires the local georeferencing integration server");

test("recover real-source PNG, view QC, download, and retain result after an error", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto("/georeference");
  await expect(page.getByRole("heading", { name: "Recover a poster" })).toBeVisible();
  // Loaded source options establish that hydration and initial requests have completed.
  await expect(page.getByRole("option", { name: "Jamaica", exact: true })).toBeAttached();
  await page.getByLabel("Poster image", { exact: true }).setInputFiles(path.resolve("../work/jamaica-poster.png"));
  await page.getByRole("button", { name: "Analyze alignment" }).click();
  await expect(page.getByRole("heading", { name: "Alignment: Passed" })).toBeVisible({ timeout: 60000 });
  await expect(page.getByAltText(/Alignment overlay/)).toBeVisible();
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
  await expect(page.getByRole("heading", { name: "Alignment: Passed" })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "../work/georef-mobile.png", fullPage: true });
  const overflowing = await page.evaluate(() => Array.from(document.querySelectorAll("body *"))
    .filter(el => el.getBoundingClientRect().right > window.innerWidth + 1)
    .map(el => ({ tag: el.tagName, className: el.className, width: el.getBoundingClientRect().width,
      parentStyle: el.parentElement ? getComputedStyle(el.parentElement).flexWrap : "none" })));
  expect(overflowing).toEqual([]);
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
  await expect(page.getByRole("heading", { name: "Alignment: Passed" })).toBeVisible();
  await page.screenshot({ path: "../work/georef-native-browser.png", fullPage: true });
});
