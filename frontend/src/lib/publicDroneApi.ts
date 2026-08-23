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
  artifacts?: Array<{ type: "dissolved" | "cell" | "clipped_cell"; url: string; sha256: string; byte_size: number }>;
}

export interface PublicConfig {
  study_area: PublicStudyArea;
  /** null when nothing has been published for the study area yet. */
  published: PublishedMeta | null;
}

export interface ReferenceLayerDefinition {
  key: string;
  display_name: string;
  group: "aviation" | "infrastructure";
  min_zoom: number;
  label_min_zoom: number;
  default_enabled: boolean;
  loading: "eager" | "lazy";
  /** Absent means available, preserving compatibility with earlier configs. */
  available?: boolean;
  availability_note?: string;
}

export interface ReferenceArtifactManifest {
  schema_version: number;
  dataset_version: string;
  generated_at: string;
  reference_only: boolean;
  artifact: {
    url: string;
    storage_path: string;
    sha256: string;
    byte_size: number;
    feature_count: number;
  };
  layers: Array<{
    key: string;
    group: "aviation" | "infrastructure";
    available: boolean;
    feature_count: number;
  }>;
}

export interface ReferenceLayerConfig {
  layers: ReferenceLayerDefinition[];
  version: string;
  /** Stable Storage pointer. Older deployments omit it and use category APIs. */
  manifest_url?: string;
}

export interface PublicReport {
  h3_index: string;
  zone: Zone;
  classification: string;
  main_reason: string;
  guidance: string;
  constraint_reasons: string[] | null;
  data_confidence: string | null;
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

async function get<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    const url = /^https?:\/\//i.test(path) ? path : `${BASE}${path}`;
    res = await fetch(url, init); // no auth header — public by contract
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
  getZoning: async (artifactUrl?: string, cacheKey?: string) => {
    const key = cacheKey ? `drone-published-zoning:${cacheKey}` : null;
    if (key && typeof window !== "undefined") {
      const cached = window.sessionStorage.getItem(key);
      if (cached) return JSON.parse(cached) as GeoJSON.FeatureCollection;
    }
    const geo = await get<GeoJSON.FeatureCollection>(artifactUrl ?? "/public/drone/zoning", {
      cache: "force-cache",
    });
    if (key && typeof window !== "undefined") {
      try { window.sessionStorage.setItem(key, JSON.stringify(geo)); } catch { /* private mode/quota */ }
    }
    return geo;
  },
  getLayer: (artifactUrl: string, cacheKey: string) =>
    publicDroneApi.getZoning(artifactUrl, cacheKey),
  getReferenceConfig: () => get<ReferenceLayerConfig>("/public/drone/reference-layers/config"),
  getReferenceManifest: (manifestUrl: string) =>
    get<ReferenceArtifactManifest>(manifestUrl, { cache: "no-cache" }),
  getReferenceDataset: async (manifest: ReferenceArtifactManifest) => {
    const cacheKey = `drone-reference-dataset:${manifest.dataset_version}`;
    if (typeof window !== "undefined") {
      const cached = window.sessionStorage.getItem(cacheKey);
      if (cached) return JSON.parse(cached) as GeoJSON.FeatureCollection;
    }
    const fc = await get<GeoJSON.FeatureCollection>(manifest.artifact.url, { cache: "force-cache" });
    if (typeof window !== "undefined") {
      try { window.sessionStorage.setItem(cacheKey, JSON.stringify(fc)); } catch { /* private mode/quota */ }
    }
    return fc;
  },
  getReferenceLayer: async (key: string, version = "legacy") => {
    const cacheKey = `drone-reference:${version}:${key}`;
    if (typeof window !== "undefined") {
      const cached = window.sessionStorage.getItem(cacheKey);
      if (cached) return JSON.parse(cached) as GeoJSON.FeatureCollection;
    }
    const fc = await get<GeoJSON.FeatureCollection>(`/public/drone/reference-layers/${encodeURIComponent(key)}`, { cache: "force-cache" });
    if (typeof window !== "undefined") {
      try { window.sessionStorage.setItem(cacheKey, JSON.stringify(fc)); } catch { /* private mode/quota */ }
    }
    return fc;
  },
  getReport: (h3: string) => get<PublicReport>(`/public/drone/report/${encodeURIComponent(h3)}`),
};
