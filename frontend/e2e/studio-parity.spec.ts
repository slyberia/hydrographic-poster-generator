/** e2e/studio-parity.spec.ts — client-transform parity (plan §4).
 *
 * Server-side render parity (preview SVG == export SVG through the one
 * SVGRenderer) is pinned by backend/tests/test_render_parity.py. What can
 * still diverge client-side is the *payload*: InteractiveCanvas's transform
 * math vs. what gets sent as layout_overrides, and the metadata/typography
 * controls vs. metadata_options / typography_overrides. These tests assert
 * payload fidelity against a mocked /preview.
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

/** Runs `action`, then waits for the debounced /preview it causes and
 * returns the last request payload once the wire is quiet. */
async function payloadAfter(
  page: Page,
  state: StudioMockState,
  action: () => Promise<unknown>,
): Promise<Record<string, unknown>> {
  const before = state.previewRequests.length;
  await action();
  await expect.poll(() => state.previewRequests.length, { timeout: 8_000 })
    .toBeGreaterThan(before);
  // Let any trailing debounced request land so we read the final state.
  await page.waitForTimeout(700);
  return state.previewRequests[state.previewRequests.length - 1];
}

test("parity-1: keyboard nudge — layout_overrides equal the canvas transform", async ({ page }) => {
  const state = await openStudio(page);

  const payload = await payloadAfter(page, state, async () => {
    const titleBlock = page.locator(".preview-svg svg #title_block");
    await titleBlock.focus();
    await page.keyboard.press("ArrowRight"); // +10 SVG units x
    await page.keyboard.press("ArrowDown");  // +10 SVG units y
    await page.keyboard.press("ArrowDown");  // +10 more
  });

  expect(payload.layout_overrides).toEqual({
    title_block: { x: 10, y: 20, scale: 1 },
  });
});

test.describe("pointer drag", () => {
  // At the default 720px-tall viewport the preview card shrinks and clips the
  // poster's top/bottom bands, where all draggable chrome lives. A taller
  // viewport keeps the full canvas on screen for real pointer interaction.
  test.use({ viewport: { width: 1280, height: 1100 } });

  test("parity-2: pointer drag — payload matches getSVGScaler math and the DOM transform", async ({ page }) => {
  const state = await openStudio(page);

  // Drag the north arrow — clear of the canvas's floating "Layout Editor"
  // pill overlay, which covers the title block's area.
  const arrow = page.locator(".preview-svg svg #north_arrow");
  const box = (await arrow.boundingBox())!;
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  const DX = 60;
  const DY = 40;

  // The scaler under test: screen px -> SVG units via the inverse CTM.
  const scaler = await page
    .locator(".preview-svg svg")
    .evaluate((el) => 1 / (el as unknown as SVGSVGElement).getScreenCTM()!.a);

  const payload = await payloadAfter(page, state, async () => {
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + DX, startY + DY, { steps: 8 });
    await page.mouse.up();
  });

  const overrides = payload.layout_overrides as {
    north_arrow: { x: number; y: number; scale: number };
  };
  expect(overrides.north_arrow.x).toBeCloseTo(DX * scaler, 1);
  expect(overrides.north_arrow.y).toBeCloseTo(DY * scaler, 1);
  expect(overrides.north_arrow.scale).toBe(1);

  // The optimistic DOM transform the canvas displayed must equal the payload.
  const transform = (await arrow.getAttribute("transform"))!;
  const m = transform.match(/translate\(([-\d.]+),\s*([-\d.]+)\)/)!;
  expect(Number(m[1])).toBeCloseTo(overrides.north_arrow.x, 6);
  expect(Number(m[2])).toBeCloseTo(overrides.north_arrow.y, 6);
  });
});

test("parity-3: metadata checkboxes — payload metadata_options mirror UI state exactly", async ({ page }) => {
  const state = await openStudio(page);
  const granular = page.locator("section", { hasText: "Layers" }).locator("div.border-l");

  const expected: Record<string, boolean> = {
    show_title: true,
    show_subtitle: true,
    show_legend: true,
    show_north_arrow: true,
    show_scale_bar: true,
    show_data_credits: true,
  };

  const toggles: [string, string][] = [
    ["Title", "show_title"],
    ["North Arrow", "show_north_arrow"],
    ["Scale Bar", "show_scale_bar"],
    ["Legend", "show_legend"],
    ["Data Credits", "show_data_credits"],
    ["Subtitle", "show_subtitle"],
  ];

  for (const [label, key] of toggles) {
    expected[key] = false;
    const payload = await payloadAfter(page, state, () =>
      granular.getByRole("checkbox", { name: label, exact: true }).uncheck(),
    );
    expect(payload.metadata_options).toEqual(expected);
    if (key === "show_legend") {
      // The top-level legacy flag stays in sync with the granular toggle.
      expect(payload.show_legend).toBe(false);
    }
  }

  // Re-check one and confirm the payload follows back up.
  expected.show_title = true;
  const payload = await payloadAfter(page, state, () =>
    granular.getByRole("checkbox", { name: "Title", exact: true }).check(),
  );
  expect(payload.metadata_options).toEqual(expected);
});

test("parity-4: typography overrides — payload fidelity and preset-change reset", async ({ page }) => {
  const state = await openStudio(page);
  await page.getByRole("button", { name: /Advanced Customization/ }).click();

  let payload = await payloadAfter(page, state, async () => {
    await page.locator("#title-font").selectOption("Roboto Mono");
    await page.locator("#title-weight").selectOption("700");
    await page.locator("#subtitle-tracking").selectOption("0.1em");
  });
  expect(payload.typography_overrides).toEqual({
    title_font: "Roboto Mono",
    title_weight: "700",
    subtitle_tracking: "0.1em",
  });

  // Clearing a field back to Default removes its key (no nulls in payload).
  payload = await payloadAfter(page, state, () =>
    page.locator("#title-weight").selectOption(""),
  );
  expect(payload.typography_overrides).toEqual({
    title_font: "Roboto Mono",
    subtitle_tracking: "0.1em",
  });

  // Changing the base preset resets all overrides (A5 behavior).
  payload = await payloadAfter(page, state, () =>
    page.getByLabel("Typography Preset").selectOption("archival"),
  );
  expect(payload.typography_overrides).toEqual({});
});
