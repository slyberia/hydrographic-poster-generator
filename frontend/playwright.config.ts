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

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    launchOptions: executablePath ? { executablePath } : {},
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
