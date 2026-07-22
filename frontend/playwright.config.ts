import { defineConfig } from "@playwright/test";
import fs from "node:fs";

/** E2E config for the drone console QA suite (docs/PHASE_D_FRONTEND_PLAN.md §7).
 *
 * The backend is mocked at the network layer inside the tests — no FastAPI or
 * PostGIS needed. The dev server is started automatically.
 *
 * Some sandboxes pre-install Chromium at /opt/pw-browsers with a symlinked
 * launcher; prefer it when present so no browser download is required.
 */

const sandboxChromium = "/opt/pw-browsers/chromium";
const executablePath = fs.existsSync(sandboxChromium) ? sandboxChromium : undefined;
const port = Number(process.env.PLAYWRIGHT_PORT ?? 3000);
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL,
    launchOptions: executablePath ? { executablePath } : {},
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npm run dev -- --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
