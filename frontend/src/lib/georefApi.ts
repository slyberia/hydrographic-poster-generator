import type { ExportRequest } from "./api";

export interface GeorefResult {
  manifest: { poster_id: string; source: Record<string, string> } & Record<string, unknown>;
  qc: {
    status: "passed" | "warning" | "failed";
    transformation: string;
    warnings: string[];
    metrics: {
      network_f1?: number;
      network_displacement?: { rmse_m: number | null; p95_m: number | null };
      withheld?: { rmse_m: number | null; count: number };
      withheld_count?: number;
    } & Record<string, unknown>;
  };
  gcps: Record<string, unknown>[];
  geotiff_base64: string;
  preview_base64: string;
  filename: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function result(response: Response): Promise<GeorefResult> {
  if (!response.ok) {
    let message = "Georeferencing failed. Check the image and source, then try again.";
    try {
      const body = await response.json();
      if (typeof body.detail === "string") message = body.detail;
      else if (typeof body.error?.message === "string") message = body.error.message;
    } catch { /* retain the readable fallback */ }
    throw new Error(message);
  }
  return response.json();
}

export async function nativeGeoreference(request: ExportRequest): Promise<GeorefResult> {
  return result(await fetch(API_BASE + "/georef/native", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request),
  }));
}

export async function recoverGeoreference(image: File, options: Record<string, unknown>, signal?: AbortSignal) {
  const data = new FormData();
  data.append("image", image);
  data.append("options", JSON.stringify(options));
  return result(await fetch(API_BASE + "/georef/recover", { method: "POST", body: data, signal }));
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = filename;
  document.body.appendChild(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadTiff(result: GeorefResult) {
  const bytes = Uint8Array.from(atob(result.geotiff_base64), char => char.charCodeAt(0));
  downloadBlob(new Blob([bytes], { type: "image/tiff" }), result.filename);
}

export function downloadJson(value: unknown, filename: string) {
  downloadBlob(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }), filename);
}
