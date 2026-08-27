import { type NextRequest, NextResponse } from "next/server";

import {
  copySupabaseCookies,
  createClient,
} from "@/utils/supabase/middleware";

const WORKSPACE_ROOT = "/workspace/drone";
const APP_ROLES = new Set(["viewer", "analyst", "admin"]);

function canonicalWorkspacePath(pathname: string): string {
  if (pathname === "/executive-overview") return WORKSPACE_ROOT;
  if (pathname.startsWith("/documentation/drone-platform")) {
    return `${WORKSPACE_ROOT}/docs${pathname.slice("/documentation/drone-platform".length)}`;
  }
  if (!pathname.startsWith("/drone")) return pathname;

  const suffix = pathname.slice("/drone".length);
  if (!suffix) return WORKSPACE_ROOT;
  if (suffix === "/explore") return `${WORKSPACE_ROOT}/map`;
  return `${WORKSPACE_ROOT}${suffix}`;
}

function implementationPath(pathname: string): string | null {
  if (!pathname.startsWith(WORKSPACE_ROOT)) return null;
  const suffix = pathname.slice(WORKSPACE_ROOT.length);
  if (!suffix) return "/drone";
  if (suffix === "/map") return "/drone/explore";
  if (suffix === "/docs") return "/documentation/drone-platform";
  if (suffix.startsWith("/docs/")) {
    return `/documentation/drone-platform${suffix.slice("/docs".length)}`;
  }
  return `/drone${suffix}`;
}

function withPrivateHeaders(response: NextResponse) {
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return response;
}

function protectedResponse(request: NextRequest, pathname: string) {
  const destination = request.nextUrl.clone();
  destination.pathname = pathname;
  return withPrivateHeaders(NextResponse.rewrite(destination));
}

export async function proxy(request: NextRequest) {
  const canonicalPath = canonicalWorkspacePath(request.nextUrl.pathname);
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );

  if (!configured && process.env.NODE_ENV !== "production") {
    if (canonicalPath !== request.nextUrl.pathname) {
      return withPrivateHeaders(
        NextResponse.redirect(new URL(canonicalPath, request.url)),
      );
    }
    return protectedResponse(
      request,
      implementationPath(request.nextUrl.pathname) ?? request.nextUrl.pathname,
    );
  }

  if (!configured) {
    const login = new URL("/login", request.url);
    login.searchParams.set("error", "config");
    login.searchParams.set("next", canonicalPath);
    return withPrivateHeaders(NextResponse.redirect(login));
  }

  const { supabase, supabaseResponse } = createClient(request);
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims as { app_metadata?: { app_role?: string } } | undefined;
  const role = claims?.app_metadata?.app_role;

  if (error || !claims) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", canonicalPath);
    return withPrivateHeaders(
      copySupabaseCookies(supabaseResponse, NextResponse.redirect(login)),
    );
  }

  if (!role || !APP_ROLES.has(role)) {
    const login = new URL("/login", request.url);
    login.searchParams.set("error", "role");
    return withPrivateHeaders(
      copySupabaseCookies(supabaseResponse, NextResponse.redirect(login)),
    );
  }

  if (canonicalPath !== request.nextUrl.pathname) {
    return withPrivateHeaders(
      copySupabaseCookies(
        supabaseResponse,
        NextResponse.redirect(new URL(canonicalPath, request.url)),
      ),
    );
  }

  const response = protectedResponse(
    request,
    implementationPath(request.nextUrl.pathname) ?? request.nextUrl.pathname,
  );
  return copySupabaseCookies(supabaseResponse, response);
}

export const config = {
  matcher: [
    "/workspace/drone/:path*",
    "/drone/:path*",
    "/documentation/drone-platform/:path*",
    "/executive-overview",
  ],
};
