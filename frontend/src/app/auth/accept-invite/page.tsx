"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { createInviteClient, isSupabaseConfigured } from "@/utils/supabase/client";

type PageState = "checking" | "ready" | "saving" | "complete" | "error";

const APP_ROLES = new Set(["viewer", "analyst", "admin"]);
const MIN_PASSWORD_LENGTH = 12;

export default function AcceptInvitePage() {
  const router = useRouter();
  const supabase = useMemo(
    () => (isSupabaseConfigured ? createInviteClient() : null),
    [],
  );
  const [pageState, setPageState] = useState<PageState>(
    isSupabaseConfigured ? "checking" : "error",
  );
  const [error, setError] = useState(
    isSupabaseConfigured
      ? ""
      : "Authentication is not configured for this deployment.",
  );
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");

  useEffect(() => {
    if (!supabase) return;

    let active = true;

    void (async () => {
      const fragment = new URLSearchParams(window.location.hash.slice(1));
      const callbackError = fragment.get("error_description") ?? fragment.get("error");
      if (callbackError) {
        if (!active) return;
        window.history.replaceState(null, "", window.location.pathname);
        setError(callbackError);
        setPageState("error");
        return;
      }

      const accessToken = fragment.get("access_token");
      const refreshToken = fragment.get("refresh_token");
      if (accessToken || refreshToken) {
        window.history.replaceState(null, "", window.location.pathname);
      }
      if (Boolean(accessToken) !== Boolean(refreshToken)) {
        if (!active) return;
        setError(
          "This invitation is incomplete or invalid. Ask an administrator to send a new invitation.",
        );
        setPageState("error");
        return;
      }

      const sessionResult =
        accessToken && refreshToken
          ? await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            })
          : await supabase.auth.getSession();

      if (!active) return;

      if (sessionResult.error || !sessionResult.data.session) {
        window.history.replaceState(null, "", window.location.pathname);
        setError(
          "This invitation is invalid or has expired. Ask an administrator to send a new invitation.",
        );
        setPageState("error");
        return;
      }

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (!active) return;

      const role = userData.user?.app_metadata.app_role;
      if (userError || !userData.user || !APP_ROLES.has(role)) {
        await supabase.auth.signOut();
        setError("This account has not been assigned access to the planning console.");
        setPageState("error");
        return;
      }

      window.history.replaceState(null, "", window.location.pathname);
      setPageState("ready");
    })();

    return () => {
      active = false;
    };
  }, [supabase]);

  async function setAccountPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || pageState !== "ready") return;

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }

    setError("");
    setPageState("saving");

    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setPageState("ready");
      return;
    }

    setPageState("complete");
    router.replace("/drone/console");
    router.refresh();
  }

  const isWorking = pageState === "checking" || pageState === "saving";

  return (
    <main className="grid min-h-screen place-items-center bg-[#f5f5f0] px-5 py-10 text-[#24372e]">
      <section className="w-full max-w-sm border border-[#cad2cc] bg-white p-7 shadow-sm">
        <p className="mb-2 text-xs font-semibold uppercase text-[#52715f]">
          Authorized access
        </p>
        <h1 className="text-2xl font-semibold">Complete your account</h1>

        {pageState === "checking" && (
          <p className="mt-5 text-sm text-[#52715f]" role="status">
            Verifying your invitation...
          </p>
        )}

        {(pageState === "ready" || pageState === "saving") && (
          <>
            <p className="mt-3 text-sm leading-6 text-[#52715f]">
              Choose a password to finish setting up your planning-console account.
            </p>
            <form className="mt-7 space-y-5" onSubmit={setAccountPassword}>
              <div>
                <label className="mb-1.5 block text-sm font-medium" htmlFor="password">
                  New password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={MIN_PASSWORD_LENGTH}
                  required
                  disabled={isWorking}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full border border-[#aebbb3] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#236642] focus:ring-2 focus:ring-[#236642]/20 disabled:opacity-60"
                />
                <p className="mt-1.5 text-xs text-[#52715f]">
                  At least {MIN_PASSWORD_LENGTH} characters.
                </p>
              </div>
              <div>
                <label
                  className="mb-1.5 block text-sm font-medium"
                  htmlFor="password-confirmation"
                >
                  Confirm password
                </label>
                <input
                  id="password-confirmation"
                  type="password"
                  autoComplete="new-password"
                  minLength={MIN_PASSWORD_LENGTH}
                  required
                  disabled={isWorking}
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  className="w-full border border-[#aebbb3] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#236642] focus:ring-2 focus:ring-[#236642]/20 disabled:opacity-60"
                />
              </div>
              {error && (
                <p className="text-sm text-[#a3342b]" role="alert">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={isWorking}
                className="w-full bg-[#236642] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#194d31] focus:outline-none focus:ring-2 focus:ring-[#236642] focus:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
              >
                {pageState === "saving" ? "Saving password..." : "Complete account"}
              </button>
            </form>
          </>
        )}

        {pageState === "complete" && (
          <p className="mt-5 text-sm text-[#52715f]" role="status">
            Account ready. Opening the Planning Console...
          </p>
        )}

        {pageState === "error" && (
          <div className="mt-5">
            <p className="text-sm leading-6 text-[#a3342b]" role="alert">
              {error}
            </p>
            <Link
              className="mt-5 inline-block text-sm font-semibold text-[#236642] underline underline-offset-4"
              href="/login"
            >
              Return to sign in
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
