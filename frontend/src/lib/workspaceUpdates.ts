export type WorkspaceUpdateCategory = "data" | "application" | "platform";

export interface WorkspaceUpdate {
  date: string;
  category: WorkspaceUpdateCategory;
  title: string;
  summary: string;
}

export const WORKSPACE_UPDATES: readonly WorkspaceUpdate[] = [
  {
    date: "2026-09-01",
    category: "platform",
    title: "Authorized workspace hub introduced",
    summary: "The portal now combines role-aware application access, live publication and dataset status, and version-controlled release notes.",
  },
  {
    date: "2026-09-01",
    category: "platform",
    title: "Private Google workspace enabled",
    summary: "Authorized accounts now enter the protected HPS workspace through Google OAuth and role-based access controls.",
  },
  {
    date: "2026-08-24",
    category: "data",
    title: "Supabase security posture hardened",
    summary: "Database, storage, function, and authentication controls were reviewed and tightened for the current deployment.",
  },
  {
    date: "2026-08-23",
    category: "application",
    title: "Country palette catalog rebuilt",
    summary: "The Poster Generator now provides an idempotent flag-palette catalog for supported geographies and G20 countries.",
  },
  {
    date: "2026-08-22",
    category: "data",
    title: "Reference map artifacts materialized",
    summary: "Aviation and infrastructure references now use a versioned manifest and unified, scale-aware GeoJSON artifact.",
  },
  {
    date: "2026-08-18",
    category: "application",
    title: "Platform and Drone experience polished",
    summary: "Navigation, documentation, map controls, and product presentation were aligned across the HPS interface.",
  },
] as const;
