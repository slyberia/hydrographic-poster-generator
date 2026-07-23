/** lib/publicDroneApi.ts — typed client for the PUBLIC drone endpoints.
 *
 * These endpoints (`/public/drone/*`, added in ARC-1) are unauthenticated and
 * serve ONLY the single published run. This client sends no Authorization
 * header and never references a run id, so the Public Explorer cannot select or
 * infer an unpublished run. Internal, role-protected calls live in droneApi.ts.
 */

import type { Zone } from "@/lib/droneApi";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface PublicStudyArea {
  slug: string;
  display_name: string;
  center: { lat: number; lng: number };
  default_zoom: number;
  min_zoom: number;
  max_zoom: number;
  bbox: { west: number; south: number; east: number; north: number } | null;
  h3_resolution: number;
  methodology_version: string;
}

export interface PublishedMeta {
  published_at: string;
  methodology_version: string;
}

export interface PublicConfig {
  study_area: PublicStudyArea;
  /** null when nothing has been published for the study area yet. */
  published: PublishedMeta | null;
}

export interface PublicReport {
  h3_index: string;
  zone: Zone;
  classification: string;
  main_reason: string;
  guidance: string;
  constraint_reasons: string[];
  data_confidence: string;
  methodology_version: string | null;
  disclaimer: string;
}

/** Carries the HTTP status so callers can distinguish "nothing published /
 * outside the grid" (404) from a genuine backend failure. */
export class PublicApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "PublicApiError";
    this.status = status;
  }
}

async function get<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`); // no auth header — public by contract
  } catch (e) {
    throw new PublicApiError(0, `Network error — ${String(e)}`);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new PublicApiError(res.status, `${res.status} ${res.statusText} — ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

export const publicDroneApi = {
  getConfig: () => get<PublicConfig>("/public/drone/config"),
  getZoning: () => get<GeoJSON.FeatureCollection>("/public/drone/zoning"),
  getReport: (h3: string) => get<PublicReport>(`/public/drone/report/${encodeURIComponent(h3)}`),
};
