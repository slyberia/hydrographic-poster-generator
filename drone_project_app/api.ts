/** lib/api.ts — typed client for the Drone Zoning FastAPI backend. */

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

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText} — ${body.slice(0, 300)}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
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

  getLocationReport: (runId: string, h3: string) =>
    http<LocationReport>(`/runs/${runId}/report/${h3}`),
};
