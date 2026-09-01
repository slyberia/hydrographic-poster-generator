import { expect, test } from "@playwright/test";

import { applicationUrl } from "../src/utils/applicationUrl";

test("server redirects prefer the configured public application origin", () => {
  expect(
    applicationUrl(
      "/workspace/drone",
      "https://0.0.0.0:3000/auth/callback",
      "https://hydro-frontend.example.run.app",
    ).toString(),
  ).toBe("https://hydro-frontend.example.run.app/workspace/drone");
});

test("invalid configured origins fall back to the request origin", () => {
  expect(
    applicationUrl(
      "/login",
      "http://localhost:3000/auth/callback",
      "javascript:alert(1)",
    ).toString(),
  ).toBe("http://localhost:3000/login");
});

test("legacy password invitations redirect to Google sign-in", async ({ page }) => {
  await page.goto("/auth/accept-invite");

  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("button", { name: "Continue with Google" }),
  ).toBeVisible();
});

test("OAuth callback rejects requests without an authorization code", async ({ request }) => {
  const response = await request.get("/auth/callback", { maxRedirects: 0 });

  expect(response.status()).toBe(307);
  expect(response.headers().location).toContain("/login?error=oauth");
});
