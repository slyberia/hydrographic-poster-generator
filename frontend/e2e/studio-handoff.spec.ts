import { test, expect, type Page } from "@playwright/test";
import { installStudioMockBackend } from "./mockStudioBackend";

const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const ID = "00000000-0000-4000-8000-000000000001";
const RESULT = {
  viewer: { width: 100, height: 100, crs: "EPSG:3857", pixel_to_world: [1000, 0, -6500000, 0, -1000, 900000], png_base64: PNG },
  manifest: { poster_id: ID, source: { rivers: "HydroRIVERS" } },
  qc: { status: "passed", transformation: "similarity", warnings: [], metrics: {} },
  gcps: [], geotiff_base64: "", preview_base64: PNG, filename: "poster.tif",
};

async function studio(page: Page) {
  await installStudioMockBackend(page, true);
  await page.goto("/studio");
  await page.getByRole("button", { name: "Continue to Studio" }).click();
  await page.getByLabel("Region", { exact: true }).selectOption("sa");
  await page.getByLabel("Country", { exact: true }).selectOption("geo-guyana");
  await expect(page.locator(".preview-svg svg")).toBeVisible();
}

test("direct transfer without download, analyze, tabs, error recovery, refresh and manual fallback", async ({ page }) => {
  const errors: string[] = [];
  const downloads: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("download", download => downloads.push(download.suggestedFilename()));
  await studio(page);
  let fail = false;
  let requests = 0;
  await page.route("**/georef/recover", route => {
    requests++;
    expect(route.request().postData()).toContain(ID);
    return route.fulfill({ status: fail ? 422 : 200, json: fail ? { detail: "Try another image." } : RESULT });
  });
  await page.getByRole("button", { name: "Open in Georeferencer", exact: true }).click();
  await expect(page).toHaveURL(/handoff=/);
  await expect(page.getByText(/Studio poster loaded/)).toBeVisible();
  const handoffUrl = page.url();
  expect(downloads).toEqual([]);
  await expect(page.getByLabel("Poster image", { exact: true })).toHaveJSProperty("required", false);
  await page.getByRole("button", { name: "Analyze alignment" }).click();
  await expect(page.getByRole("heading", { name: "Alignment accepted under provisional criteria" })).toBeVisible();
  expect(requests).toBe(1);
  await page.getByRole("tab", { name: "Geographic Inspection" }).click();
  await expect(page.getByLabel("Georeferenced poster map")).toBeVisible();
  expect(await page.getByLabel("Georeferenced poster map").evaluate(el => el.clientHeight)).toBeGreaterThan(420);
  await expect(page.getByText(/not surveyed|not a confidence/).first()).toBeVisible();
  await page.screenshot({ path: "../work/phase14-inspection-desktop.png", fullPage: true });
  await page.getByRole("tab", { name: "Geographic Inspection" }).press("ArrowLeft");
  await expect(page.getByRole("tab", { name: "Alignment evidence" })).toBeFocused();
  fail = true;
  await page.getByRole("button", { name: "Analyze alignment" }).click();
  await expect(page.locator("form [role=alert]")).toContainText("Try another image.");
  await expect(page.getByRole("heading", { name: "Alignment accepted under provisional criteria" })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("tab", { name: "Geographic Inspection" }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "../work/phase14-inspection-mobile.png", fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto(handoffUrl);
  await expect(page.getByText(/Studio transfer consumed/)).toBeVisible();
  await page.getByLabel("Poster image", { exact: true }).setInputFiles({ name: "manual.png", mimeType: "image/png", buffer: Buffer.from(PNG, "base64") });
  await expect(page.getByText(/Studio transfer consumed/)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Analyze alignment" })).toBeEnabled();
  expect(errors).toEqual([]);
});

test("bootstrap blocks controls, guide keyboard dismissal and reopening", async ({ page }) => {
  await installStudioMockBackend(page, true);
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/presets", async route => { await pending; await route.fallback(); });
  await page.goto("/studio");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("dialog").press("Escape");
  await expect(page.getByLabel("Region", { exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Open in Georeferencer", exact: true })).toBeDisabled();
  release();
  await expect(page.getByLabel("Region", { exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Studio guide", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Geography and styles are ready.");
  await page.screenshot({ path: "../work/phase14-studio-guide.png", fullPage: true });
});

test("bootstrap failure retries and blocked browser storage preserves manual download", async ({ page }) => {
  await installStudioMockBackend(page, true);
  let fail = true;
  await page.route("**/presets", route => fail ? route.fulfill({ status: 503, json: { detail: "Unavailable" } }) : route.fallback());
  await page.goto("/studio");
  await page.getByRole("button", { name: "Continue to Studio" }).click();
  await expect(page.getByRole("button", { name: "Retry loading Studio" })).toBeVisible();
  fail = false;
  await page.getByRole("button", { name: "Retry loading Studio" }).click();
  await page.getByLabel("Region", { exact: true }).selectOption("sa");
  await page.getByLabel("Country", { exact: true }).selectOption("geo-guyana");
  await expect(page.locator(".preview-svg svg")).toBeVisible();
  await page.evaluate(() => { indexedDB.open = () => { throw new Error("Storage disabled"); }; });
  await page.getByRole("button", { name: "Open in Georeferencer", exact: true }).click();
  await expect(page.getByText(/Export failed/)).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: /download/i }).click();
  expect((await download).suggestedFilename()).toMatch(/png$/);
});

for (const status of ["expired", "missing", "malformed", "unavailable"] as const) {
  test("recoverable " + status + " transfer", async ({ page }) => {
    await installStudioMockBackend(page);
    if (status === "unavailable") await page.addInitScript(() => {
      indexedDB.open = () => { throw new Error("Storage disabled"); };
    });
    const token = status === "malformed" ? "bad" : ID;
    await page.goto("/georeference?handoff=" + token + "&expires=" + (status === "expired" ? 1 : Date.now() + 300000));
    await expect(page.getByText("Studio transfer " + status, { exact: false })).toBeVisible();
    await expect(page.getByRole("button", { name: "Choose image" })).toBeEnabled();
  });
}

test("two tabs atomically consume one handoff and delete raster bytes", async ({ page, context }) => {
  await installStudioMockBackend(page);
  await page.goto("/georeference");
  await page.evaluate(async ({ id, png }) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("hydro-studio-handoff-v1", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("handoffs", { keyPath: "id" });
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const tx = request.result.transaction("handoffs", "readwrite");
        tx.objectStore("handoffs").put({ id, blob: new Blob([Uint8Array.from(atob(png), c => c.charCodeAt(0))], { type: "image/png" }),
          filename: "poster.png", posterId: id, createdAt: Date.now(), expiresAt: Date.now() + 300000 });
        tx.oncomplete = () => { request.result.close(); resolve(); };
      };
    });
  }, { id: ID, png: PNG });
  const other = await context.newPage();
  await installStudioMockBackend(other);
  const url = "/georeference?handoff=" + ID;
  await Promise.all([page.goto(url), other.goto(url)]);
  await expect.poll(async () => (await page.locator("form").innerText()) + (await other.locator("form").innerText())).toContain("Studio transfer consumed");
  const text = (await page.locator("form").innerText()) + (await other.locator("form").innerText());
  expect(text).toContain("Studio poster loaded");
  const stored = await page.evaluate(async id => new Promise<Record<string, unknown>>(resolve => {
    const request = indexedDB.open("hydro-studio-handoff-v1", 1);
    request.onsuccess = () => {
      const read = request.result.transaction("handoffs").objectStore("handoffs").get(id);
      read.onsuccess = () => { request.result.close(); resolve(read.result); };
    };
  }), ID);
  expect(stored.consumed).toBe(true);
  expect(stored.blob).toBeUndefined();
});

for (const kind of ["expired", "malformed"] as const) {
  test("stored " + kind + " handoff discards its bytes", async ({ page }) => {
    await installStudioMockBackend(page);
    await page.goto("/georeference");
    await page.evaluate(async ({ id, kind }) => {
      await new Promise<void>(resolve => {
        const request = indexedDB.open("hydro-studio-handoff-v1", 1);
        request.onupgradeneeded = () => request.result.createObjectStore("handoffs", { keyPath: "id" });
        request.onsuccess = () => {
          const tx = request.result.transaction("handoffs", "readwrite");
          tx.objectStore("handoffs").put({ id, blob: new Blob(["bad"], { type: "image/svg+xml" }),
            filename: "bad.svg", createdAt: Date.now() - 300000, expiresAt: kind === "expired" ? Date.now() - 1 : Date.now() + 1000 });
          tx.oncomplete = () => { request.result.close(); resolve(); };
        };
      });
    }, { id: ID, kind });
    const expiryHint = kind === "expired" ? 1 : Date.now() + 300000;
    await page.goto("/georeference?handoff=" + ID + "&expires=" + expiryHint);
    await expect(page.getByText("Studio transfer " + kind, { exact: false })).toBeVisible();
    const hasBytes = await page.evaluate(async id => new Promise<boolean>(resolve => {
      const request = indexedDB.open("hydro-studio-handoff-v1", 1);
      request.onsuccess = () => {
        const read = request.result.transaction("handoffs").objectStore("handoffs").get(id);
        read.onsuccess = () => { request.result.close(); resolve(!!read.result?.blob); };
      };
    }), ID);
    expect(hasBytes).toBe(false);
  });
}
