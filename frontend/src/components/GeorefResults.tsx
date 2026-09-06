"use client";
import Image from "next/image";
import { downloadJson, downloadTiff, type GeorefResult } from "@/lib/georefApi";

export default function GeorefResults({ result }: { result: GeorefResult }) {
  const metrics = result.qc.metrics;
  const distance = metrics.network_displacement;
  const meters = (value: number | null | undefined) => value == null ? "Unavailable" : value.toFixed(2) + " m";
  return (
    <section className="glass-card min-w-0 space-y-4 p-5" aria-label="Alignment results">
      <h2 className="text-lg font-semibold">Alignment: {result.qc.status === "passed" ? "Passed" : "Needs review"}</h2>
      <p className="text-sm">Source: {result.manifest.source.rivers} · Transform: {result.qc.transformation}</p>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div><dt>Network overlap</dt><dd>{((metrics.network_f1 ?? 0) * 100).toFixed(1)}%</dd></div>
        <div><dt>Network RMSE</dt><dd>{meters(distance?.rmse_m)}</dd></div>
        <div><dt>95th percentile displacement</dt><dd>{meters(distance?.p95_m)}</dd></div>
        <div><dt>Withheld points</dt><dd>{metrics.withheld_count ?? "Native: no fit required"}</dd></div>
      </dl>
      <p className="text-xs">Overlap uses a three-pixel tolerance in the validation preview. Quality thresholds are provisional.</p>
      {result.qc.warnings.map((warning, index) => <p key={index} role="status" className="text-sm">{warning}</p>)}
      <Image src={"data:image/png;base64," + result.preview_base64} unoptimized width={800} height={800}
        alt="Alignment overlay: source rivers blue, raster rivers orange, overlap white"
        className="max-h-[28rem] w-full rounded object-contain" />
      <p className="text-xs">Blue: HydroRIVERS · Orange: poster · White: overlap</p>
      <div className="flex flex-wrap gap-3">
        <button type="button" className="glass-input" onClick={() => downloadTiff(result)}>Download GeoTIFF</button>
        <button type="button" className="glass-input" onClick={() => downloadJson(result.qc, "alignment-qc.json")}>Download QC report</button>
        <button type="button" className="glass-input" onClick={() => downloadJson(result.manifest, "poster-manifest.json")}>Download manifest</button>
        {result.gcps.length > 0 && <button type="button" className="glass-input" onClick={() => downloadJson(result.gcps, "control-points.json")}>Download control points</button>}
      </div>
      <p className="break-all text-xs">Poster ID: {result.manifest.poster_id}</p>
    </section>
  );
}
