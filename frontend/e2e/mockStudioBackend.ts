/** e2e/mockStudioBackend.ts — network-layer mock of the poster FastAPI backend.
 *
 * Mirrors the drone-console pattern (mockBackend.ts, §3e of
 * PHASE_5_6_COMPLETION_PLAN.md): the studio suites exercise real client
 * runtime behavior — debounced preview fetches, payload assembly, export
 * download, failure recovery — without a live FastAPI/PostGIS stack. Backend
 * correctness is covered by backend/tests/ (test_render_parity.py pins the
 * render contract); these mocks encode that contract, not re-verify it.
 */

import type { Page, Route } from "@playwright/test";

const API = "http://localhost:8000";

// Token set mirrors backend PaletteTokens (8 keys).
const TOKENS = {
  background: "#0b1020",
  feature_major: "#7dd3fc",
  feature_primary: "#38bdf8",
  feature_secondary: "#0ea5e9",
  feature_minor: "#0284c7",
  feature_headwater: "#075985",
  text_primary: "#e2e8f0",
  text_secondary: "#94a3b8",
};

const GEOGRAPHIES = {
  regions: [
    {
      region_code: "sa",
      name: "South America",
      countries: [
        { country_code: "GY", name: "Guyana", admin_0_id: "geo-guyana" },
      ],
    },
  ],
};

const PRESETS = {
  density: [
    { id: "balanced", name: "Balanced", min_stream_order: 3,
      description: "mock", classification_map: {} },
  ],
  palette: [
    { id: "abyss", name: "Abyss", type: "dark", tokens: TOKENS },
  ],
  typography: [
    { id: "gallery_poster", name: "Gallery Poster",
      title_font: "Inter", title_weight: "600", title_tracking: "0.05em",
      subtitle_font: "Inter", subtitle_weight: "400", subtitle_tracking: "0.02em" },
    { id: "archival", name: "Archival",
      title_font: "Roboto Mono", title_weight: "500", title_tracking: "0.1em",
      subtitle_font: "Roboto Mono", subtitle_weight: "400", subtitle_tracking: "0.05em" },
  ],
  flags: [
    { id: "guyana", name: "Guyana", variants: { light: TOKENS, dark: TOKENS } },
  ],
};

/** Fixture SVG mimicking SVGRenderer's structure: preview canvas 2400x3600,
 * draggable chrome groups by id (InteractiveCanvas's DRAGGABLE_GROUPS). */
export const FIXTURE_SVG = [
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2400 3600" width="2400" height="3600">',
  `<rect width="2400" height="3600" fill="${TOKENS.background}"/>`,
  '<g id="rivers"><path class="river major" d="M 200 400 L 1200 1800 L 2200 3200" ' +
    `stroke="${TOKENS.feature_major}" stroke-width="6" fill="none"/></g>`,
  '<g id="title_block"><text x="1200" y="300" font-size="140" text-anchor="middle" ' +
    `fill="${TOKENS.text_primary}">MOCK TITLE</text></g>`,
  '<g id="legend"><rect x="200" y="3000" width="300" height="200" fill="none" ' +
    `stroke="${TOKENS.text_secondary}"/></g>`,
  '<g id="north_arrow"><path d="M 2200 200 l 40 120 l -80 0 z" ' +
    `fill="${TOKENS.text_secondary}"/></g>`,
  '<g id="metadata"><text x="200" y="3400" font-size="40" ' +
    `fill="${TOKENS.text_secondary}">Data source: mock</text></g>`,
  "</svg>",
].join("\n");

// Minimal valid 1x1 PNG for the export download path.
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

export type PreviewFailure = "http500" | "network" | "malformed" | null;

export interface StudioMockState {
  /** JSON bodies of every POST /preview, in order. */
  previewRequests: Record<string, unknown>[];
  /** JSON bodies of every POST /export, in order. */
  exportRequests: Record<string, unknown>[];
  /** Non-null: POST /preview fails in the given mode until cleared. */
  failPreview: PreviewFailure;
  /** Delay before /preview responds, to observe the loading state. */
  previewDelayMs: number;
  /** When true, POST /export is aborted to simulate a dead backend. */
  failExport: boolean;
}

export async function installStudioMockBackend(page: Page): Promise<StudioMockState> {
  const state: StudioMockState = {
    previewRequests: [],
    exportRequests: [],
    failPreview: null,
    previewDelayMs: 0,
    failExport: false,
  };

  const json = (route: Route, body: unknown, status = 200) =>
    route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

  await page.route(`${API}/**`, async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const method = route.request().method();

    if (path === "/geographies" && method === "GET") return json(route, GEOGRAPHIES);

    if (/^\/geographies\/[^/]+\/children$/.test(path)) return json(route, []);

    if (path === "/presets" && method === "GET") return json(route, PRESETS);

    if (path === "/preview" && method === "POST") {
      state.previewRequests.push(route.request().postDataJSON());
      if (state.previewDelayMs > 0) {
        await new Promise((r) => setTimeout(r, state.previewDelayMs));
      }
      if (state.failPreview === "http500") {
        return json(route, { detail: "Internal renderer error" }, 500);
      }
      if (state.failPreview === "network") {
        return route.abort("timedout");
      }
      const body =
        state.failPreview === "malformed"
          ? FIXTURE_SVG.slice(0, Math.floor(FIXTURE_SVG.length / 2)) // truncated document
          : FIXTURE_SVG;
      // NOTE: the real backend sends X-River-Count / X-Geography-Name and
      // Content-Disposition, but its CORSMiddleware sets no expose_headers,
      // so a cross-origin browser client cannot read them (fetch header
      // filtering). The headers are included here for fidelity; assertions
      // must expect the client's fallback behavior (null river count,
      // default export filename) until the backend exposes them.
      return route.fulfill({
        status: 200,
        contentType: "image/svg+xml",
        headers: { "X-River-Count": "42", "X-Geography-Name": "Guyana" },
        body,
      });
    }

    if (path === "/export" && method === "POST") {
      state.exportRequests.push(route.request().postDataJSON());
      if (state.failExport) return route.abort("failed");
      return route.fulfill({
        status: 200,
        contentType: "image/png",
        headers: { "Content-Disposition": 'attachment; filename="hydro_poster_digital_poster.png"' },
        body: PNG_1X1,
      });
    }

    return json(route, { detail: `Unmocked path: ${method} ${path}` }, 500);
  });

  return state;
}
