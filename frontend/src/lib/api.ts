/**
 * Typed API client for the FastAPI backend.
 *
 * Request/response shapes mirror the backend Pydantic models exactly
 * (backend/app/models/*.py). Base URL comes from NEXT_PUBLIC_API_URL.
 */

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ---------------------------------------------------------------- geographies

export interface GeographyCountry {
  country_code: string;
  name: string;
  admin_0_id: string | null;
}

export interface GeographyRegion {
  region_code: string;
  name: string;
  countries: GeographyCountry[];
}

export interface GeographyListResponse {
  regions: GeographyRegion[];
}

export interface GeographyDetail {
  id: string;
  name: string;
  country: string;
  country_code: string;
  admin_level: number;
  parent_id: string | null;
  region_code: string;
  bbox: number[] | null;
}

// -------------------------------------------------------------------- presets

export interface DensityPreset {
  id: string;
  name: string;
  min_stream_order: number;
  description: string;
  classification_map: Record<string, string>;
}

export interface PaletteTokens {
  background: string;
  feature_major: string;
  feature_primary: string;
  feature_secondary: string;
  feature_minor: string;
  feature_headwater: string;
  text_primary: string;
  text_secondary: string;
}

export interface PalettePreset {
  id: string;
  name: string;
  type: string; // "dark" | "light"
  tokens: PaletteTokens;
}

export interface TypographyPreset {
  id: string;
  name: string;
  title_font: string;
  title_weight: string;
  title_tracking: string;
  subtitle_font: string;
  subtitle_weight: string;
  subtitle_tracking: string;
}

export interface PresetsResponse {
  density: DensityPreset[];
  palette: PalettePreset[];
  typography: TypographyPreset[];
}

// ------------------------------------------------------------ render / export

export interface RenderRequest {
  geography_id: string;
  density_preset: string;
  classification_preset: string;
  palette: string;
  typography: string;
  title: string;
  subtitle: string;
  design_asset_mode: boolean;
  show_legend: boolean;
  show_metadata: boolean;
  custom_colors?: Record<string, string>;
  element_transforms?: Record<string, { x: number; y: number; scale: number }>;
}

export type ExportFormat = "svg" | "png" | "pdf";

export type ExportSize =
  | "digital_poster"
  | "high_res_poster"
  | "instagram_portrait"
  | "print_18x24"
  | "square_design_asset"
  | "custom";

export interface ExportRequest extends RenderRequest {
  export_format: ExportFormat;
  export_size: ExportSize;
  custom_width?: number | null;
  custom_height?: number | null;
}

export interface PreviewResult {
  svg: string;
  riverCount: number | null;
  geographyName: string | null;
}

export interface ExportResult {
  blob: Blob;
  filename: string;
}

// -------------------------------------------------------------------- helpers

async function raiseForStatus(res: Response): Promise<never> {
  let detail = `${res.status} ${res.statusText}`;
  try {
    const body = await res.json();
    if (typeof body?.detail === "string") {
      detail = body.detail;
    } else if (Array.isArray(body?.detail) && body.detail[0]?.msg) {
      detail = body.detail[0].msg;
    }
  } catch {
    // non-JSON error body; keep the status text
  }
  throw new Error(detail);
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { signal });
  if (!res.ok) await raiseForStatus(res);
  return res.json();
}

// ------------------------------------------------------------------- wrappers

export function getGeographies(
  signal?: AbortSignal,
): Promise<GeographyListResponse> {
  return getJson<GeographyListResponse>("/geographies", signal);
}

export function getGeographyChildren(
  parentId: string,
  signal?: AbortSignal,
): Promise<GeographyDetail[]> {
  return getJson<GeographyDetail[]>(
    `/geographies/${encodeURIComponent(parentId)}/children`,
    signal,
  );
}

export function getPresets(signal?: AbortSignal): Promise<PresetsResponse> {
  return getJson<PresetsResponse>("/presets", signal);
}

export async function getPreview(
  request: RenderRequest,
  signal?: AbortSignal,
): Promise<PreviewResult> {
  const res = await fetch(`${API_BASE}/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    signal,
  });
  if (!res.ok) await raiseForStatus(res);
  const riverCount = res.headers.get("X-River-Count");
  return {
    svg: await res.text(),
    riverCount: riverCount !== null ? Number(riverCount) : null,
    geographyName: res.headers.get("X-Geography-Name"),
  };
}

export async function triggerExport(
  request: ExportRequest,
  signal?: AbortSignal,
): Promise<ExportResult> {
  const res = await fetch(`${API_BASE}/export`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    signal,
  });
  if (!res.ok) await raiseForStatus(res);

  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="([^"]+)"/);
  const filename =
    match?.[1] ?? `hydro_export.${request.export_format}`;

  return { blob: await res.blob(), filename };
}
