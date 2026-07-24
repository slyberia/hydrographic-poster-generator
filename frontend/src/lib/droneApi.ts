/** lib/droneApi.ts — typed client for the Drone Zoning FastAPI backend. */

import { createClient } from "@/utils/supabase/client";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type Zone = "PROHIBITED" | "RESTRICTED" | "CONDITIONAL" | "SUITABLE";

export interface ZoneStat {
  zone: Zone;
  cells: number;
  area_km2: number;
  pct: number;
}

export interface RunStats {
  run_id: string;
  zones: ZoneStat[];
  total_cells: number;
}

export interface RunSummary {
  run_id: string;
  label: string | null;
  status: string;
  weights_snapshot: Record<string, number>;
  created_at: string;
  completed_at: string | null;
  /** Scored cells persisted for this run. 0 = complete but empty (nothing to
   * draw on the map) — the UI shows an explicit empty state for these. */
  cell_count: number;
}

export interface FactorWeight {
  factor_key: string;
  factor_name: string;
  raw_weight: number;
  normalised_weight: number;
  is_active: boolean;
}

export interface LocationReport {
  h3_index: string;
  zone: Zone;
  risk_score: number | null;
  main_reason: string;
  authorization_note: string;
  constraint_reasons: string[];
  factor_breakdown: Record<
    string,
    { score: number; weight: number; reason: string }
  >;
  data_confidence: string;
  disclaimer: string;
}

// ---- Dashboard (UX-9 internal aggregate — mirror of drone_dashboard_service) ----

export interface DashZone {
  zone: Zone;
  cells: number;
  area_km2?: number;
  pct: number;
}

export interface DashboardData {
  study_area: {
    slug: string;
    display_name: string;
    methodology_version: string;
  } | null;
  published: {
    run_id: string;
    label: string | null;
    lifecycle_state: string;
    published_at: string | null;
    published_by: string | null;
    total_cells: number;
    analyzed_area_km2: number;
    zone_distribution: DashZone[];
  } | null;
  latest_run: {
    run_id: string;
    label: string | null;
    status: string;
    created_at: string;
    completed_at: string | null;
  } | null;
  run_history: Array<{
    run_id: string;
    label: string | null;
    lifecycle_state: string;
    created_at: string;
    total_cells: number;
    zone_distribution: DashZone[];
  }>;
  sensitivity: {
    sweep_id: string;
    base_run_id: string;
    base_label: string | null;
    created_at: string;
    avg_stddev: number;
    max_stddev: number;
    total_zone_flips: number;
    pct_cells_flipped: number;
    factor_rankings: SensitivityFactorRank[];
  } | null;
  freshness: {
    published_at: string | null;
    days_since_published: number | null;
    is_stale: boolean;
    stale_threshold_days: number;
    methodology_version: string | null;
  };
}

// ---- Sensitivity (Phase C backend contract — mirror of drone.py Pydantic models) ----

export interface SensitivityFactorRank {
  factor_key: string;
  direction: "up" | "down";
  mean_absolute_deviation: number;
  zone_flips: number;
}

export interface SensitivitySummary {
  avg_stddev: number;
  max_stddev: number;
  total_zone_flips: number;
  pct_cells_flipped: number;
  factor_rankings: SensitivityFactorRank[];
}

export interface SensitivityStatus {
  sweep_id: string;
  status: "running" | "complete" | "failed";
  total_runs: number;
  completed_runs: number;
  failed_runs: number;
  partial_results: boolean;
  summary: SensitivitySummary | null;
}

export interface VolatilityRecord {
  h3_index: string;
  stddev: number;
  variance: number;
  zone_flips: number;
  volatility_category: "LOW" | "MEDIUM" | "HIGH";
  baseline_zone: string;
  baseline_score: number | null;
}

// ---- Export (Option B: server-side static-map composite of the viewport) ----

export interface ExportBBox {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface ExportViewParams {
  bbox: ExportBBox;
  zoom: number;
  format: "png" | "svg" | "pdf";
  scale?: number;
  display_mode?: "zones" | "volatility";
  sweep_id?: string | null;
  hidden_zones?: string[] | null;
  show_boundary?: boolean;
}

/** A read of the live map's current extent — the whole export contract. */
export type ViewportSnapshot = { bbox: ExportBBox; zoom: number };

function filenameFromDisposition(header: string | null, fallback: string): string {
  if (!header) return fallback;
  const m = /filename="?([^"]+)"?/.exec(header);
  return m?.[1] ?? fallback;
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const authHeaders = await authorizationHeaders();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...authHeaders, ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText} — ${body.slice(0, 300)}`);
  }
  if (res.status === 204) return undefined as T; // e.g. DELETE
  return res.json() as Promise<T>;
}

async function authorizationHeaders(): Promise<Record<string, string>> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return {};
  }

  const { data } = await createClient().auth.getSession();
  return data.session?.access_token
    ? { Authorization: `Bearer ${data.session.access_token}` }
    : {};
}

export const droneApi = {
  getFactors: () => http<FactorWeight[]>("/config/factors"),

  patchFactor: (key: string, weight: number) =>
    http<FactorWeight[]>(`/config/factors/${key}`, {
      method: "PATCH",
      body: JSON.stringify({ weight }),
    }),

  getDashboard: () => http<DashboardData>("/dashboard"),

  listRuns: () => http<RunSummary[]>("/runs"),

  createRun: (label: string, weightOverrides?: Record<string, number>) =>
    http<RunStats>("/runs", {
      method: "POST",
      body: JSON.stringify({
        label,
        weight_overrides: weightOverrides ?? null,
      }),
    }),

  getRunGeoJSON: (runId: string) =>
    http<GeoJSON.FeatureCollection>(`/runs/${runId}/geojson`),

  getRunStats: (runId: string) =>
    http<{ stats?: RunStats } & RunSummary>(`/runs/${runId}`),

  deleteRun: (runId: string) =>
    http<void>(`/runs/${runId}`, { method: "DELETE" }),

  getLocationReport: (runId: string, h3: string) =>
    http<LocationReport>(`/runs/${runId}/report/${h3}`),

  triggerSensitivity: (runId: string, delta = 0.1, label?: string) =>
    http<SensitivityStatus>(`/runs/${runId}/sensitivity`, {
      method: "POST",
      body: JSON.stringify({ delta, label: label ?? null }),
    }),

  getSensitivityStatus: (runId: string, sweepId: string) =>
    http<SensitivityStatus>(`/runs/${runId}/sensitivity/${sweepId}`),

  getVolatility: (runId: string, sweepId: string) =>
    http<VolatilityRecord[]>(`/runs/${runId}/sensitivity/${sweepId}/volatility`),

  exportView: async (
    runId: string,
    params: ExportViewParams
  ): Promise<{ blob: Blob; filename: string }> => {
    const authHeaders = await authorizationHeaders();
    const res = await fetch(`${BASE}/runs/${runId}/export`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`${res.status} ${res.statusText} — ${body.slice(0, 300)}`);
    }
    const blob = await res.blob();
    const filename = filenameFromDisposition(
      res.headers.get("Content-Disposition"),
      `drone_zoning.${params.format}`
    );
    return { blob, filename };
  },
};
