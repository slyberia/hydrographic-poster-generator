import { expect, test, type Page } from "@playwright/test";

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

async function mockPublishedMap(page: Page, options: { fail?: boolean; delayMs?: number } = {}) {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.route("**/workspace/drone/config", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        study_area: { display_name: "Region 4", center: { lat: 6.75, lng: -58.2 }, default_zoom: 10 },
        published: {
          published_at: "2026-08-16T00:00:00Z",
          artifacts: [{ type: "dissolved", url: "/workspace/drone/zoning", sha256: "phase-9", byte_size: 1 }],
        },
      }),
    });
  });
  await page.route("**/workspace/drone/zoning", async (route) => {
    if (options.delayMs) {
      await new Promise((resolve) => setTimeout(resolve, options.delayMs));
    }
    if (options.fail) {
      await route.abort("failed");
      return;
    }
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(publishedMap) });
  });
  return requests;
}

async function expectNoHorizontalOverflow(page: Page, route: string) {
  const layout = await page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const offenders = Array.from(document.body.querySelectorAll<HTMLElement>("*"))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName,
          className: element.className,
          left: rect.left,
          right: rect.right,
          width: rect.width,
          clientWidth: element.clientWidth,
          scrollWidth: element.scrollWidth,
        };
      })
      .filter(({ left, right, clientWidth, scrollWidth }) => left < -1 || right > viewportWidth + 1 || scrollWidth > clientWidth + 1)
      .slice(0, 8);
    return {
      body: document.body.scrollWidth - document.body.clientWidth,
      root: document.documentElement.scrollWidth - viewportWidth,
      offenders,
    };
  });
  expect(layout.body, `${route} body overflow: ${JSON.stringify(layout.offenders)}`).toBeLessThanOrEqual(1);
  expect(layout.root, `${route} root overflow: ${JSON.stringify(layout.offenders)}`).toBeLessThanOrEqual(1);
}

test("route ownership and the two-view entry flow remain explicit", async ({ page, request }) => {
  for (const route of ["/", "/poster", "/workspace/drone", "/workspace/drone/start", "/workspace/drone/map", "/documentation", "/docs"]) {
    const response = await request.get(route);
    expect(response.ok(), `${route} should resolve`).toBe(true);
  }

  const legacy = await request.get("/executive-overview", { maxRedirects: 0 });
  expect(legacy.status()).toBe(308);
  expect(legacy.headers().location).toBe("/drone");

  const legacyDocumentation = await request.get("/documentation/drone-platform/executive-overview", { maxRedirects: 0 });
  expect(legacyDocumentation.status()).toBe(308);
  expect(legacyDocumentation.headers().location).toBe("/drone");

  await page.goto("/workspace/drone/start");
  await expect(page.locator('.drone-start-card[href="/workspace/drone/map"]')).toContainText("Published Map");
  await expect(page.locator('.drone-start-card[href="/workspace/drone/console"]')).toContainText("Planning Console");
});

test("platform product cards are complete keyboard-focusable links", async ({ page }) => {
  await mockPublishedMap(page);
  await page.goto("/");

  const cards = page.locator(".hps-card-grid > a.hps-card");
  await expect(cards).toHaveCount(3);
  const hrefs = await cards.evaluateAll((elements) => elements.map((element) => element.getAttribute("href")));
  expect(hrefs).toEqual([
    "/workspace/drone/start",
    "/poster",
    "/documentation",
  ]);

  for (const card of await cards.all()) {
    await card.focus();
    await expect(card).toBeFocused();
    const outline = await card.evaluate((element) => getComputedStyle(element).outlineStyle);
    expect(outline).not.toBe("none");
  }
});

test("hero map announces loading, uses only the dissolved artifact, and exposes its fallback", async ({ page }) => {
  const requests = await mockPublishedMap(page, { delayMs: 750 });
  await page.goto("/");

  const map = page.getByRole("region", { name: "Interactive published Region 4 zoning map" });
  await expect(map).toHaveAttribute("aria-busy", "true");
  await expect(map).toHaveAttribute("aria-busy", "false");
  await expect(map.locator(".leaflet-container")).toBeVisible();
  expect(requests.some((url) => url.includes("/workspace/drone/zoning"))).toBe(true);
  expect(requests.some((url) => /cells|clipped_cell/.test(url))).toBe(false);

  await page.unrouteAll({ behavior: "wait" });
  await mockPublishedMap(page, { fail: true });
  await page.evaluate(() => window.sessionStorage.clear());
  await page.reload();
  await expect(page.locator('.overview-map-status[role="alert"]')).toContainText("Published map preview unavailable");
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open Published Map" })).toHaveAttribute("href", "/workspace/drone/map");
});

test("shared identity, numbered badges, and documentation current-page state stay canonical", async ({ page }) => {
  await mockPublishedMap(page);
  for (const route of ["/", "/drone", "/documentation", "/documentation/drone-platform/executive-overview"]) {
    await page.goto(route);
    const logos = page.getByRole("link", { name: "HPS Geospatial home" });
    await expect(logos).toHaveCount(1);
    await expect(logos.locator("img")).toHaveAttribute("src", /hps-lockup-horizontal\.svg/i);
  }

  await page.goto("/workspace/drone");
  const badges = page.locator(".hps-number-badge");
  await expect(badges).toHaveCount(11);
  const sizes = await badges.evaluateAll((elements) => elements.map((element) => {
    const style = getComputedStyle(element);
    return [style.width, style.height];
  }));
  expect(new Set(sizes.map(([width, height]) => `${width}x${height}`))).toEqual(new Set(["40pxx40px"]));

  for (const route of ["/documentation", "/documentation/drone-platform", "/documentation/poster-generator", "/documentation/hps-portal", "/documentation/ecosystem"]) {
    await page.goto(route);
    await expect(page.locator('nav[aria-label="Documentation sections"] [aria-current="page"]')).toHaveCount(1);
  }
});

test("public and documentation surfaces remain labelled and contained at narrow widths", async ({ page }) => {
  await mockPublishedMap(page);
  await page.setViewportSize({ width: 320, height: 740 });

  for (const route of ["/", "/poster", "/workspace/drone", "/workspace/drone/start", "/documentation", "/docs"]) {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("main")).toBeVisible();
    await expectNoHorizontalOverflow(page, route);

    const unnamedControls = await page.locator("a, button, input, select, textarea").evaluateAll((elements) =>
      elements.filter((element) => {
        const aria = element.getAttribute("aria-label")?.trim();
        const labelledBy = element.getAttribute("aria-labelledby")?.trim();
        const text = element.textContent?.trim();
        const alt = element.querySelector("img")?.getAttribute("alt")?.trim();
        const labels = "labels" in element ? (element as HTMLInputElement).labels : null;
        return !aria && !labelledBy && !text && !alt && !labels?.length;
      }).map((element) => element.outerHTML.slice(0, 300)),
    );
    expect(unnamedControls, `${route} should not expose unnamed controls`).toEqual([]);
  }
});

test("published map teardown remains stable across rapid route changes", async ({ page }) => {
  await mockPublishedMap(page);
  const teardownErrors: string[] = [];
  page.on("pageerror", (error) => {
    teardownErrors.push(error.stack ?? error.message);
  });

  for (let index = 0; index < 4; index += 1) {
    await page.goto("/");
    await expect(page.locator(".leaflet-container")).toBeVisible();
    await page.goto("/documentation");
    await expect(page.getByRole("main")).toBeVisible();
    await page.waitForTimeout(100);
  }

  expect(teardownErrors).toEqual([]);
});
