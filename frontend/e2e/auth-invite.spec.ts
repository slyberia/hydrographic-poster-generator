import { expect, test } from "@playwright/test";

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
