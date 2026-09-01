import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import PlatformHeader from "@/components/PlatformHeader";
import WorkspaceSignOutButton from "@/components/workspace/WorkspaceSignOutButton";
import WorkspaceStatusPanel from "@/components/workspace/WorkspaceStatusPanel";
import {
  type AppRole,
  isAppRole,
  WORKSPACE_ROOT,
} from "@/lib/workspaceAccess";
import { WORKSPACE_UPDATES } from "@/lib/workspaceUpdates";
import { createClient } from "@/utils/supabase/server";
import "@/styles/hps-workspace.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Workspace — HPS Geospatial",
  description: "Authorized applications, data status, and platform updates for HPS Geospatial.",
  robots: { index: false, follow: false },
};

type WorkspaceIdentity = {
  email: string;
  role: AppRole;
};

async function getWorkspaceIdentity(): Promise<WorkspaceIdentity> {
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  if (!configured && process.env.NODE_ENV !== "production") {
    return { email: "Local development", role: "admin" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims as
    | { app_metadata?: { app_role?: unknown }; email?: unknown }
    | undefined;
  const role = claims?.app_metadata?.app_role;
  if (error || !claims || !isAppRole(role)) {
    redirect(`/login?next=${encodeURIComponent(WORKSPACE_ROOT)}`);
  }

  return {
    email: typeof claims.email === "string" ? claims.email : "Authorized account",
    role,
  };
}

export default async function WorkspacePage() {
  const identity = await getWorkspaceIdentity();

  return (
    <main className="workspace-page hps-theme hps-theme--platform">
      <PlatformHeader current="workspace" />

      <section className="workspace-hero" aria-labelledby="workspace-title">
        <div className="workspace-shell workspace-hero__inner">
          <div>
            <p className="workspace-eyebrow">Authorized HPS portal</p>
            <h1 id="workspace-title">Workspace</h1>
            <p className="workspace-hero__copy">
              Open approved applications, review current data and publication status,
              and follow recent changes across the HPS platform.
            </p>
          </div>
          <div className="workspace-account" aria-label="Signed-in account">
            <p>Signed in as</p>
            <strong>{identity.email}</strong>
            <span>{identity.role} access</span>
            <WorkspaceSignOutButton />
          </div>
        </div>
      </section>

      <section className="workspace-shell workspace-section" aria-labelledby="applications-title">
        <div className="workspace-section__heading">
          <p className="workspace-eyebrow">Applications</p>
          <h2 id="applications-title">Available tools</h2>
          <p>Access reflects the role assigned to your authenticated account.</p>
        </div>
        <div className="workspace-app-grid">
          <article className="workspace-app-card workspace-app-card--private">
            <div className="workspace-app-card__meta">
              <span>Decision support</span>
              <span>Private</span>
            </div>
            <h3>Drone Zoning</h3>
            <p>Review the published Region 4 planning view, operational status, documentation, and role-aware analytical tools.</p>
            <div className="workspace-card-actions">
              <Link href="/workspace/drone">Open application</Link>
              <Link href="/workspace/drone/docs">Documentation</Link>
            </div>
          </article>
          <article className="workspace-app-card">
            <div className="workspace-app-card__meta">
              <span>Spatial systems</span>
              <span>Public</span>
            </div>
            <h3>Hydrographic Poster Generator</h3>
            <p>Create and export designed river-network posters using the supported geography and country-palette catalogs.</p>
            <div className="workspace-card-actions">
              <Link href="/poster">Open application</Link>
              <Link href="/documentation/poster-generator">Documentation</Link>
            </div>
          </article>
        </div>
      </section>

      <section className="workspace-section workspace-section--tint" aria-labelledby="status-title">
        <div className="workspace-shell">
          <div className="workspace-section__heading">
            <p className="workspace-eyebrow">Operational summary</p>
            <h2 id="status-title">Data and publication status</h2>
            <p>Live, bounded metadata from the authoritative analytical and published-artifact paths.</p>
          </div>
          <WorkspaceStatusPanel />
        </div>
      </section>

      <section className="workspace-shell workspace-section" aria-labelledby="updates-title">
        <div className="workspace-section__heading">
          <p className="workspace-eyebrow">Release notes</p>
          <h2 id="updates-title">Recent platform updates</h2>
          <p>Version-controlled summaries of material data, application, and portal changes.</p>
        </div>
        <ol className="workspace-updates">
          {WORKSPACE_UPDATES.map((update) => (
            <li key={`${update.date}-${update.title}`}>
              <time dateTime={update.date}>{update.date}</time>
              <div>
                <span>{update.category}</span>
                <h3>{update.title}</h3>
                <p>{update.summary}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
