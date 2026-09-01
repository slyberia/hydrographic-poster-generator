"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

import PlatformHeader from "@/components/PlatformHeader";
import { requestedWorkspaceDestination } from "@/lib/workspaceAccess";
import { createClient, isSupabaseConfigured } from "@/utils/supabase/client";
import "@/styles/hps-workspace.css";

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
    <div className="hps-theme hps-theme--platform">
      <PlatformHeader current="workspace" />
      <Suspense>
        <LoginPanel />
      </Suspense>
    </div>
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
      requestedWorkspaceDestination(searchParams.get("next")),
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
    <main className="workspace-login">
      <section className="workspace-login__card">
        <p className="workspace-eyebrow">Authorized access</p>
        <h1>HPS workspace sign in</h1>
        <p className="workspace-login__copy">
          Continue with an approved Google account to access private applications,
          operational status, documentation, and platform updates.
        </p>

        {error && (
          <p className="workspace-login__error" role="alert">
            {error}
          </p>
        )}

        <button
          type="button"
          disabled={busy || !isSupabaseConfigured}
          onClick={signInWithGoogle}
          className="workspace-login__button"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
            <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.91h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.4Z" />
            <path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.37l-3.24-2.54c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z" />
            <path fill="#FBBC05" d="M6.39 13.92A6 6 0 0 1 6.07 12c0-.67.12-1.32.32-1.92V7.46H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.54l3.35-2.62Z" />
            <path fill="#EA4335" d="M12 5.95c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.96 5.46l3.35 2.62C7.18 7.71 9.39 5.95 12 5.95Z" />
          </svg>
          {busy ? "Opening Google…" : "Continue with Google"}
        </button>

        <p className="workspace-login__note">
          Authentication confirms identity; application access is assigned separately
          as viewer, analyst, or administrator.
        </p>
      </section>
    </main>
  );
}
