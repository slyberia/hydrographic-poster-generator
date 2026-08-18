const { chromium } = require("../../../../frontend/node_modules/@playwright/test");
const path = require("node:path");

const outputDir = __dirname;
const publishedMap = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { zone: "suitable" },
      geometry: {
        type: "Polygon",
        coordinates: [[[-58.3, 6.65], [-58.1, 6.65], [-58.1, 6.85], [-58.3, 6.85], [-58.3, 6.65]]],
      },
    },
  ],
};

async function prepare(page) {
  await page.route("**/public/drone/config", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({
      study_area: { display_name: "Region 4", center: { lat: 6.75, lng: -58.2 }, default_zoom: 10 },
      published: {
        published_at: "2026-08-18T00:00:00Z",
        artifacts: [{ type: "dissolved", url: "/public/drone/zoning", sha256: "visual-check", byte_size: 1 }],
      },
    }),
  }));
  await page.route("**/public/drone/zoning", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify(publishedMap),
  }));
}

async function inspect(page, name) {
  const result = await page.evaluate(() => ({
    title: document.title,
    bodyTextLength: document.body.innerText.trim().length,
    horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    errorOverlay: Boolean(document.querySelector("[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay")),
    capabilityCards: document.querySelectorAll("a.capability-card").length,
    currentNavigation: document.querySelector('nav[aria-label="Drone product navigation"] [aria-current="page"]')?.textContent?.trim() ?? null,
    unnamedControls: Array.from(document.querySelectorAll("a, button, input, select, textarea"))
      .filter((element) => {
        const aria = element.getAttribute("aria-label")?.trim();
        const labelledBy = element.getAttribute("aria-labelledby")?.trim();
        const text = element.textContent?.trim();
        const alt = element.querySelector("img")?.getAttribute("alt")?.trim();
        const labels = "labels" in element ? element.labels : null;
        return !aria && !labelledBy && !text && !alt && !labels?.length;
      })
      .map((element) => element.outerHTML.slice(0, 300)),
  }));
  return { name, ...result };
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [];

  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await prepare(desktop);
  await desktop.goto("http://localhost:3100/drone", { waitUntil: "networkidle" });
  await desktop.locator(".capabilities-section").screenshot({ path: path.join(outputDir, "capabilities-desktop.png") });
  await desktop.screenshot({ path: path.join(outputDir, "drone-overview-desktop.png"), fullPage: true });
  results.push(await inspect(desktop, "desktop"));

  const mobile = await browser.newPage({ viewport: { width: 320, height: 740 } });
  await prepare(mobile);
  await mobile.goto("http://localhost:3100/drone", { waitUntil: "networkidle" });
  await mobile.locator(".capabilities-section").scrollIntoViewIfNeeded();
  await mobile.screenshot({ path: path.join(outputDir, "capabilities-mobile.png") });
  results.push(await inspect(mobile, "mobile"));

  const platform = await browser.newPage({ viewport: { width: 320, height: 740 } });
  await prepare(platform);
  await platform.goto("http://localhost:3100/", { waitUntil: "networkidle" });
  results.push(await inspect(platform, "platform-mobile"));

  await browser.close();
  process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
