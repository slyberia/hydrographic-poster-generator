/** lib/droneApi.ts — typed client for the Drone Zoning FastAPI backend. */

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

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText} — ${body.slice(0, 300)}`);
  }
  if (res.status === 204) return undefined as T; // e.g. DELETE
  return res.json() as Promise<T>;
}

export const droneApi = {
  getFactors: () => http<FactorWeight[]>("/config/factors"),

  patchFactor: (key: string, weight: number) =>
    http<FactorWeight[]>(`/config/factors/${key}`, {
      method: "PATCH",
      body: JSON.stringify({ weight }),
    }),

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
};
