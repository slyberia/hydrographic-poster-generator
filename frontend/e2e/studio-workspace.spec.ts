import { expect, test } from "@playwright/test";

import { installStudioMockBackend } from "./mockStudioBackend";

async function openRenderedStudio(page: import("@playwright/test").Page) {
  await installStudioMockBackend(page);
  await page.goto("/studio");
  await page.getByLabel("Region").selectOption("sa");
  await page.getByLabel("Country").selectOption("geo-guyana");
  await expect(page.locator(".preview-svg svg")).toBeVisible({ timeout: 10_000 });
}

test("workspace controls zoom the canvas without changing poster settings", async ({ page }) => {
  await openRenderedStudio(page);

  const viewControls = page.getByRole("group", { name: "Preview view controls" });
  await expect(viewControls.getByRole("button", { name: "Auto" })).toBeVisible();
  await expect(viewControls.getByRole("button", { name: "Fit", exact: true })).toBeVisible();
  await expect(viewControls.getByRole("button", { name: "Reset" })).toBeVisible();
  await expect(viewControls.getByRole("button", { name: "Enter fullscreen" })).toBeVisible();

  await viewControls.getByRole("button", { name: "Zoom in" }).click();
  await expect(viewControls.getByRole("button", { name: "125%" })).toBeVisible();

  await viewControls.getByRole("button", { name: "Fit", exact: true }).click();
  await expect(viewControls.getByRole("button", { name: "Auto" })).toBeVisible();
});

test("control hierarchy exposes one legend state and keeps advanced controls collapsed", async ({ page }) => {
  await openRenderedStudio(page);

  await expect(page.getByRole("heading", { name: "Poster workflow" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "01 · Geography" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "02–03 · Network and visual style" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "04 · Typography and metadata" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "04 · Layout refinements" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "06 · Export" })).toBeVisible();

  await expect(page.getByRole("checkbox", { name: "Legend", exact: true })).toHaveCount(1);
  await expect(page.getByRole("radio", { name: /Abyss/ })).toBeChecked();
  await expect(page.getByLabel("title block X offset")).toHaveCount(0);

  await page.getByRole("button", { name: "Advanced coordinates" }).click();
  await expect(page.getByLabel("title block X offset")).toBeVisible();
});

test("compact workspace uses a control drawer and keeps the canvas within the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await installStudioMockBackend(page);
  await page.goto("/studio");

  const controlsButton = page.getByRole("button", { name: "Controls", exact: true });
  await expect(controlsButton).toBeVisible();
  await controlsButton.click();
  await expect(page.getByLabel("Region")).toBeVisible();

  await page.getByRole("button", { name: "Close poster controls" }).last().click();
  await expect(controlsButton).toBeVisible();
  await expect(controlsButton).toHaveAttribute("aria-expanded", "false");

  const overflow = await page.evaluate(() => ({
    body: document.body.scrollWidth - document.body.clientWidth,
    root: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  expect(overflow.body).toBeLessThanOrEqual(1);
  expect(overflow.root).toBeLessThanOrEqual(1);
});
