"use client";

import { useRouter } from "next/navigation";

import { clearDroneWorkspaceCache } from "@/lib/droneWorkspaceSession";
import { createClient, isSupabaseConfigured } from "@/utils/supabase/client";

type WorkspaceSignOutButtonProps = {
  className?: string;
};

export default function WorkspaceSignOutButton({
  className = "workspace-signout",
}: WorkspaceSignOutButtonProps) {
  const router = useRouter();
  if (!isSupabaseConfigured) return null;

  async function signOut() {
    clearDroneWorkspaceCache();
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button type="button" className={className} onClick={() => void signOut()}>
      Sign out
    </button>
  );
}
