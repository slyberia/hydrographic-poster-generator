"use client";

import { useRouter } from "next/navigation";

import { clearDroneWorkspaceCache } from "@/lib/droneWorkspaceSession";
import { createClient, isSupabaseConfigured } from "@/utils/supabase/client";

export default function WorkspaceSignOutButton() {
  const router = useRouter();
  if (!isSupabaseConfigured) return null;

  async function signOut() {
    clearDroneWorkspaceCache();
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return <button type="button" className="drone-header-action" onClick={() => void signOut()}>Sign out</button>;
}
