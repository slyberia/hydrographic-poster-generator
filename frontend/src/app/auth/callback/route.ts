import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";
import { applicationUrl } from "@/utils/applicationUrl";
import {
  isAppRole,
  requestedWorkspaceDestination,
} from "@/lib/workspaceAccess";

function loginRedirect(request: NextRequest, error: "oauth" | "role") {
  const destination = applicationUrl("/login", request.url);
  destination.searchParams.set("error", error);
  return NextResponse.redirect(destination);
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) return loginRedirect(request, "oauth");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return loginRedirect(request, "oauth");

  const role = data.user.app_metadata.app_role;
  if (!isAppRole(role)) {
    await supabase.auth.signOut();
    return loginRedirect(request, "role");
  }

  const destination = requestedWorkspaceDestination(
    request.nextUrl.searchParams.get("next"),
  );
  return NextResponse.redirect(applicationUrl(destination, request.url));
}
