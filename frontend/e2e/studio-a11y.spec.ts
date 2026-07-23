/** e2e/studio-a11y.spec.ts — keyboard/ARIA audit (plan §7).
 *
 * Uses only Playwright's built-in keyboard and ARIA assertions (§3b — no
 * axe-core). Judgment-call findings (contrast ratios, screen-reader nuance)
 * are listed in the phase completion report, not asserted here.
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

test("a11y-1: tab order traverses geography → presets → typography → metadata → export, with visible focus", async ({ page }) => {
  await openStudio(page);
  await page.getByLabel("Region").focus();

  // Walk the tab order, recording each focused control's accessible handle.
  const visited: string[] = [];
  for (let i = 0; i < 50; i++) {
    const desc = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return "";
      const label = (el as HTMLInputElement).labels?.[0]?.textContent?.trim();
      return (
        el.id || el.getAttribute("aria-label") || label ||
        el.textContent?.trim().slice(0, 30) || el.tagName
      );
    });
    visited.push(desc);
    await page.keyboard.press("Tab");
  }

  const orderOf = (id: string) => visited.findIndex((v) => v === id || v.includes(id));
  const region = orderOf("region");
  const density = orderOf("density");
  const typography = orderOf("typography");
  const exportFormat = orderOf("export-format");
  // First granular metadata checkbox comes after typography, before export.
  const firstCheckbox = visited.findIndex((v, i) => i > typography && v.includes("Title"));

  expect(region).toBeGreaterThanOrEqual(0);
  expect(density).toBeGreaterThan(region);
  expect(typography).toBeGreaterThan(density);
  expect(firstCheckbox).toBeGreaterThan(typography);
  expect(exportFormat).toBeGreaterThan(firstCheckbox);

  // Visible focus: a keyboard-focused control shows an outline or ring.
  await page.getByLabel("Region").focus();
  const focusStyles = await page.getByLabel("Region").evaluate((el) => {
    const s = getComputedStyle(el);
    return { outline: s.outlineStyle, boxShadow: s.boxShadow };
  });
  expect(
    focusStyles.outline !== "none" || focusStyles.boxShadow !== "none",
  ).toBe(true);
});

test("a11y-2: every sidebar form control has an accessible name", async ({ page }) => {
  await openStudio(page);
  // Include collapsed sections' controls.
  await page.getByRole("button", { name: /Advanced typography/ }).click();

  const unnamed = await page.evaluate(() => {
    const controls = Array.from(
      document.querySelectorAll<HTMLElement>("aside select, aside input, aside button"),
    );
    const nameOf = (el: HTMLElement): string => {
      const labelled = el.getAttribute("aria-labelledby");
      if (labelled) {
        const t = document.getElementById(labelled)?.textContent?.trim();
        if (t) return t;
      }
      const aria = el.getAttribute("aria-label");
      if (aria?.trim()) return aria;
      const labels = (el as HTMLInputElement).labels;
      if (labels?.length && labels[0].textContent?.trim()) {
        return labels[0].textContent!.trim();
      }
      if (el.tagName === "BUTTON" && el.textContent?.trim()) return el.textContent.trim();
      const title = el.getAttribute("title");
      if (title?.trim()) return title;
      return "";
    };
    return controls
      .filter((el) => !nameOf(el))
      .map((el) => `${el.tagName.toLowerCase()}#${el.id || "?"}.${el.className}`);
  });

  expect(unnamed).toEqual([]);
});

test("a11y-3: metadata checkboxes and export operable by keyboard; QA list is a status region", async ({ page }) => {
  const state = await openStudio(page);

  // Space toggles a granular metadata checkbox.
  const granular = page.locator("section", { hasText: "Content" }).locator("div.border-l");
  const northArrow = granular.getByRole("checkbox", { name: "North Arrow", exact: true });
  await northArrow.focus();
  await page.keyboard.press("Space");
  await expect(northArrow).not.toBeChecked();
  await page.keyboard.press("Space");
  await expect(northArrow).toBeChecked();

  // The QA checklist is exposed as a status region with its content.
  const status = page.getByRole("status");
  await expect(status.first()).toBeVisible();
  await expect(status.filter({ hasText: "Data Loaded" }).first()).toBeVisible();

  // Enter on the focused Download button triggers the export.
  const before = state.exportRequests.length;
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download" }).focus();
  await page.keyboard.press("Enter");
  await downloadPromise;
  expect(state.exportRequests.length).toBeGreaterThan(before);
});

test("a11y-4: preview loading state is announced (aria-busy)", async ({ page }) => {
  const state = await openStudio(page);
  state.previewDelayMs = 1_500;

  await page.getByRole("textbox", { name: "Title", exact: true }).fill("Slow render");

  const busyRegion = page.locator('[aria-busy="true"]');
  await expect(busyRegion.first()).toBeVisible({ timeout: 8_000 });
  // The spinner overlay itself is exposed as a status for screen readers.
  await expect(page.getByRole("status").filter({ hasText: /rendering/i })).toBeVisible();

  state.previewDelayMs = 0;
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 10_000 });
});
