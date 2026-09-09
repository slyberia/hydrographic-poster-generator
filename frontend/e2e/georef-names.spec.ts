import { test, expect } from "@playwright/test";

const API = "http://localhost:8000";
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const POSTER_ID = "00000000-0000-4000-8000-000000000001";

test("lazy Guyana names expose four color-coded, explicit states", async ({ page }) => {
  const requested: string[] = [];
  await page.route(`${API}/**`, async route => {
    const url = new URL(route.request().url()); requested.push(url.pathname);
    const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (url.pathname === "/geographies") return json({ regions: [{ region_code: "sa", name: "South America", countries: [{ country_code: "GY", name: "Guyana", admin_0_id: "geo-guyana" }] }] });
    if (url.pathname === "/presets") return json({ density: [{ id: "balanced", name: "Balanced" }], palette: [], typography: [], flags: [] });
    if (url.pathname === "/georef/recover") return json({
      viewer: { width: 100, height: 100, crs: "EPSG:3857", pixel_to_world: [1000, 0, -6500000, 0, -1000, 900000], png_base64: PNG },
      manifest: { poster_id: POSTER_ID, source: { rivers: "HydroRIVERS v1.0 (WWF)" } },
      qc: { status: "passed", transformation: "similarity", warnings: [], metrics: {} },
      gcps: [], geotiff_base64: "", preview_base64: PNG, filename: "guyana.tif",
    });
    if (url.pathname.endsWith("/river-names")) return json({
      country: "Guyana", country_code: "GY", dataset_version: "v1", coverage_status: "partial",
      disclaimer: "River-name completeness varies by country and local mapping practice.",
      evaluation: { status: "passed", counts: { matched: 1, ambiguous: 1, unnamed_in_source: 1 } },
      artifact: { url: "/georef/river-names/guyana/v1", indexed_reach_count: 3, feature_count: 1 },
    });
    if (url.pathname === "/georef/river-names/guyana/v1") return json({
      type: "FeatureCollection", metadata: { source: "OpenStreetMap contributors", source_license: "ODbL 1.0", disclaimer: "varies", evaluated_systems: ["Essequibo River"] },
      name_index: {
        "1": { name_status: "matched", name: "Essequibo River", confidence: 0.94, source_refs: ["relation/1"] },
        "2": { name_status: "ambiguous", name: null, candidate_name: "Demerara River", confidence: 0.51, source_refs: ["way/2"] },
        "3": { name_status: "unnamed_in_source", name: null, confidence: 0.7, source_refs: ["way/3"] },
      },
      features: [{ type: "Feature", geometry: { type: "LineString", coordinates: [[-58.4, 6.1], [-58.2, 6.4]] }, properties: { name: "Essequibo River", name_status: "matched" } }],
    });
    if (url.pathname.endsWith("/rivers")) return json({
      type: "FeatureCollection", truncated: false, features: [1,2,3,4].map((id, i) => ({
        type: "Feature", geometry: { type: "LineString", coordinates: [[-58.5 + i * .05, 6], [-58.45 + i * .05, 6.1]] },
        properties: { hydrorivers_id: id, stream_order: 5, upstream_area: 10, length_km: 2 },
      })),
    });
    return json({ detail: `Unmocked ${url.pathname}` }, 500);
  });

  await page.goto(`/georeference?poster_id=${POSTER_ID}`);
  await expect(page.getByText("Linked automatically to your latest Studio export.")).toBeVisible();
  await page.getByText("Metadata and control points").click();
  await expect(page.getByLabel("Poster ID (optional)")).toHaveValue(POSTER_ID);
  await page.getByLabel("Poster image", { exact: true }).setInputFiles({ name: "guyana.png", mimeType: "image/png", buffer: Buffer.from(PNG, "base64") });
  await page.getByRole("button", { name: "Analyze alignment" }).click();
  await expect(page.getByRole("heading", { name: "Alignment accepted under provisional criteria" })).toBeVisible();
  await page.getByRole("button", { name: "Open geographic inspection" }).click();
  const map = page.getByRole("region", { name: "Geographic inspection" });
  expect(requested).not.toContain(`/georef/manifests/${POSTER_ID}/river-names`);
  await map.getByLabel("Show evaluated river names").check();
  const legend = map.getByLabel("River name status legend");
  await expect(legend).toContainText(/Matched.*Ambiguous.*Unnamed in source.*Not evaluated/);
  await expect(legend.locator("span[aria-hidden=true]")).toHaveCount(4);
  expect(await legend.locator("span[aria-hidden=true]").evaluateAll(items =>
    items.map(item => getComputedStyle(item).color))).toEqual([
    "rgb(21, 128, 61)", "rgb(180, 83, 9)", "rgb(100, 116, 139)", "rgb(37, 99, 235)",
  ]);
  await expect(map).toContainText("3 evaluated reach associations loaded");
  await expect(map).toContainText("completeness varies by country");
  await expect(map).toContainText("Country evaluation: partial");
  const downloadPromise = page.waitForEvent("download");
  await map.getByRole("button", { name: "Download naming QC" }).click();
  expect((await downloadPromise).suggestedFilename()).toBe("gy-river-naming-qc.json");
  await map.getByRole("button", { name: "Load rivers in view" }).click();
  const reaches = map.getByRole("combobox");
  await reaches.selectOption("1");
  await expect(map.getByLabel("Selected river attributes")).toContainText("Essequibo River");
  await expect(map.getByLabel("Selected river attributes")).toContainText("Matched");
  await expect(map.getByLabel("Selected river attributes")).toContainText("94%");
  await reaches.selectOption("2");
  await expect(map.getByLabel("Selected river attributes")).toContainText("Possible match: Demerara River");
  await expect(map.getByLabel("Selected river attributes")).toContainText("Ambiguous");
  await reaches.selectOption("3");
  await expect(map.getByLabel("Selected river attributes")).toContainText("No name in evaluated OSM source");
  await expect(map.getByLabel("Selected river attributes")).toContainText("Unnamed in source");
  await reaches.selectOption("4");
  await expect(map.getByLabel("Selected river attributes")).toContainText("Not evaluated");
});
