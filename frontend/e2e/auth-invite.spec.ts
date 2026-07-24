import { expect, test } from "@playwright/test";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const hasSupabaseEnv = Boolean(
  supabaseUrl && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);

const user = {
  id: "2675ba94-435c-4b6c-aafa-a7d28de71ae6",
  aud: "authenticated",
  role: "authenticated",
  email: "admin@example.com",
  email_confirmed_at: "2026-07-24T22:25:11.191Z",
  app_metadata: {
    app_role: "admin",
    provider: "email",
    providers: ["email"],
  },
  user_metadata: { email_verified: true },
  identities: [],
  created_at: "2026-07-24T22:25:11.191Z",
  updated_at: "2026-07-24T22:25:11.191Z",
};

function fakeAccessToken(): string {
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  return [
    encode({ alg: "ES256", typ: "JWT" }),
    encode({
      iss: `${supabaseUrl}/auth/v1`,
      sub: user.id,
      aud: "authenticated",
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      email: user.email,
      app_metadata: user.app_metadata,
      user_metadata: user.user_metadata,
      role: "authenticated",
      aal: "aal1",
      session_id: "test-session",
      is_anonymous: false,
    }),
    "test-signature",
  ].join(".");
}

test("shows a useful error when authentication is not configured", async ({ page }) => {
  test.skip(hasSupabaseEnv, "Covered by the configured invitation-flow test.");

  await page.goto("/auth/accept-invite");

  await expect(page.getByRole("heading", { name: "Complete your account" })).toBeVisible();
  await expect(
    page.getByText("Authentication is not configured for this deployment."),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Return to sign in" })).toHaveAttribute(
    "href",
    "/login",
  );
});

test("establishes the invitation session and sets the account password", async ({ page }) => {
  test.skip(!hasSupabaseEnv, "Requires the test Supabase URL and publishable key.");

  let submittedPassword = "";
  await page.route(`${supabaseUrl}/auth/v1/**`, async (route) => {
    const headers = {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "authorization, apikey, content-type",
      "content-type": "application/json",
    };

    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers });
      return;
    }
    if (route.request().method() === "PUT") {
      submittedPassword = (route.request().postDataJSON() as { password: string }).password;
    }

    await route.fulfill({
      status: 200,
      headers,
      body: JSON.stringify(user),
    });
  });

  const fragment = new URLSearchParams({
    access_token: fakeAccessToken(),
    expires_in: "3600",
    refresh_token: "test-refresh-token",
    token_type: "bearer",
    type: "invite",
  });
  await page.goto(`/auth/accept-invite#${fragment}`);

  await expect(page.getByLabel("New password")).toBeVisible();
  expect(page.url()).not.toContain("access_token");

  await page.getByLabel("New password").fill("correct-horse-battery");
  await page.getByLabel("Confirm password").fill("correct-horse-battery");
  await page.getByRole("button", { name: "Complete account" }).click();

  await expect.poll(() => submittedPassword).toBe("correct-horse-battery");
  await expect(page).toHaveURL(/\/drone\/console$/);
});
