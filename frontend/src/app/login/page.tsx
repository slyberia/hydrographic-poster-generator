"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { createClient, isSupabaseConfigured } from "@/utils/supabase/client";


function requestedDestination(requested: string | null): string {
  return requested?.startsWith("/") && !requested.startsWith("//")
    ? requested
    : "/drone";
}


export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}


function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(() => {
    if (!isSupabaseConfigured) {
      return "Authentication is not configured for this deployment.";
    }
    return searchParams.get("error") === "role"
      ? "This account has not been assigned access to the planning console."
      : "";
  });

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isSupabaseConfigured) {
      setError("Authentication is not configured for this deployment.");
      return;
    }
    setBusy(true);
    setError("");

    const { data, error: signInError } = await createClient().auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !data.user) {
      setError(signInError?.message ?? "Sign-in failed.");
      setBusy(false);
      return;
    }

    if (!["viewer", "analyst", "admin"].includes(data.user.app_metadata.app_role)) {
      await createClient().auth.signOut();
      setError("This account has not been assigned access to the planning console.");
      setBusy(false);
      return;
    }

    router.replace(requestedDestination(searchParams.get("next")));
    router.refresh();
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#f5f5f0] px-5 py-10 text-[#24372e]">
      <section className="w-full max-w-sm border border-[#cad2cc] bg-white p-7 shadow-sm">
        <p className="mb-2 text-xs font-semibold uppercase text-[#52715f]">
          Authorized access
        </p>
        <h1 className="text-2xl font-semibold">Drone planning console</h1>
        <form className="mt-7 space-y-5" onSubmit={signIn}>
          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full border border-[#aebbb3] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#236642] focus:ring-2 focus:ring-[#236642]/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full border border-[#aebbb3] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#236642] focus:ring-2 focus:ring-[#236642]/20"
            />
          </div>
          {error && (
            <p className="text-sm text-[#a3342b]" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-[#236642] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#194d31] focus:outline-none focus:ring-2 focus:ring-[#236642] focus:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
