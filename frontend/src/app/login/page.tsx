"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

import { createClient, isSupabaseConfigured } from "@/utils/supabase/client";

const WORKSPACE_ROOT = "/workspace/drone";

function requestedDestination(requested: string | null): string {
  return requested?.startsWith(WORKSPACE_ROOT) ? requested : WORKSPACE_ROOT;
}

function initialError(errorCode: string | null): string {
  if (!isSupabaseConfigured || errorCode === "config") {
    return "Authentication is not configured for this deployment.";
  }
  if (errorCode === "role") {
    return "This Google account has not been assigned access to this workspace.";
  }
  if (errorCode === "oauth") {
    return "Google sign-in could not be completed. Please try again.";
  }
  return "";
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPanel />
    </Suspense>
  );
}

function LoginPanel() {
  const searchParams = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(() => initialError(searchParams.get("error")));

  async function signInWithGoogle() {
    if (!isSupabaseConfigured) {
      setError("Authentication is not configured for this deployment.");
      return;
    }

    setBusy(true);
    setError("");

    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set(
      "next",
      requestedDestination(searchParams.get("next")),
    );

    const { error: signInError } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callback.toString(),
      },
    });

    if (signInError) {
      setError(signInError.message || "Google sign-in could not be started.");
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#f5f5f0] px-5 py-10 text-[#24372e]">
      <section className="w-full max-w-sm border border-[#cad2cc] bg-white p-7 shadow-sm">
        <p className="mb-2 text-xs font-semibold uppercase text-[#52715f]">
          Authorized access
        </p>
        <h1 className="text-2xl font-semibold">HPS workspace sign in</h1>
        <p className="mt-3 text-sm leading-6 text-[#52715f]">
          Continue with an approved Google account. Authentication confirms your
          identity; workspace access is assigned separately.
        </p>

        {error && (
          <p className="mt-5 text-sm text-[#a3342b]" role="alert">
            {error}
          </p>
        )}

        <button
          type="button"
          disabled={busy || !isSupabaseConfigured}
          onClick={signInWithGoogle}
          className="mt-7 flex w-full items-center justify-center gap-3 border border-[#aebbb3] bg-white px-4 py-2.5 text-sm font-semibold text-[#24372e] hover:border-[#236642] hover:bg-[#f7faf8] focus:outline-none focus:ring-2 focus:ring-[#236642] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
            <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.91h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.4Z" />
            <path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.37l-3.24-2.54c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z" />
            <path fill="#FBBC05" d="M6.39 13.92A6 6 0 0 1 6.07 12c0-.67.12-1.32.32-1.92V7.46H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.54l3.35-2.62Z" />
            <path fill="#EA4335" d="M12 5.95c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.96 5.46l3.35 2.62C7.18 7.71 9.39 5.95 12 5.95Z" />
          </svg>
          {busy ? "Opening Google…" : "Continue with Google"}
        </button>

        <p className="mt-5 text-xs leading-5 text-[#6a7f73]">
          Only accounts granted a viewer, analyst, or administrator role can open
          the private Drone workspace.
        </p>
      </section>
    </main>
  );
}
