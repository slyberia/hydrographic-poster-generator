"use client";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useState } from "react";
import { downloadJson, downloadTiff, type GeorefResult } from "@/lib/georefApi";

const GeorefMap = dynamic(() => import("./GeorefMap"), { ssr: false, loading: () => <p>Loading map viewer…</p> });

export default function GeorefResults({ result }: { result: GeorefResult }) {
  const [showMap, setShowMap] = useState(false);
  const metrics = result.qc.metrics;
  const tolerance = metrics.tolerance_ground_m as { min: number; max: number } | undefined;
  const held = metrics.withheld as { count: number; rmse_m: number; p95_m?: number } | undefined;
  const heldPixels = metrics.withheld_pixels as { p95: number } | undefined;
  const distance = metrics.network_displacement;
  const meters = (value: number | null | undefined) => value == null ? "Unavailable" : value.toFixed(2) + " m";
  return (
    <section className="glass-card min-w-0 space-y-4 p-5" aria-label="Alignment results">
      <h2 className="text-lg font-semibold">{result.qc.status === "passed" ? "Alignment accepted under provisional criteria" : "Alignment needs review"}</h2>
      <p className="text-sm">Acceptance describes agreement with the reference network, not a confidence probability or surveyed accuracy.</p>
      <p className="text-sm">Source: {result.manifest.source.rivers} · Transform: {result.qc.transformation}</p>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div><dt>Tolerant network agreement (F1)</dt><dd>{metrics.network_f1 == null ? "Not measured" : (metrics.network_f1 * 100).toFixed(1) + "%"}</dd></div>
        <div><dt>Raster-to-source RMSE</dt><dd>{meters(distance?.rmse_m)}</dd></div>
        <div><dt>Raster-to-source 95th percentile</dt><dd>{meters(distance?.p95_m)}</dd></div>
        <div><dt>Withheld points</dt><dd>{metrics.withheld_count ?? "Native: no fit required"}</dd></div>
      </dl>
      <p className="text-xs">Agreement uses a three-pixel radius in the downsampled validation preview
        {tolerance ? ` (approximately ${meters(tolerance.min)}–${meters(tolerance.max)} across the map)` : " (ground-distance tolerance unavailable in this older report)"}.
        Rasterization and nearby river branches affect these distances; they are not transform-error measurements.</p>
      <h3 className="font-semibold">Registration evidence</h3>
      <p className="text-sm">{result.qc.transformation === "known_render_transform" ? "Native: the original rendering transform is known; no fitting is required." :
        "Recovery: withheld matches were excluded from fitting, but share the source reference. They are not independent surveyed control points."}</p>
      {held && <p className="text-sm">{held.count} withheld matches · RMSE {meters(held.rmse_m)} · 95th percentile {meters(held.p95_m)}
        {heldPixels ? ` (${heldPixels.p95.toFixed(3)} uploaded-image pixels)` : ""}</p>}
      <p className="text-sm">Independent transform accuracy: not measured for this request.<br />Absolute geographic accuracy: not measured against surveyed ground truth.</p>
      {result.qc.warnings.map((warning, index) => <p key={index} role="status" className="text-sm">{warning}</p>)}
      <Image src={"data:image/png;base64," + result.preview_base64} unoptimized width={800} height={800}
        alt="Alignment overlay: source rivers blue, raster rivers orange, overlap white"
        className="max-h-[28rem] w-full rounded object-contain" />
      <p className="text-xs">Blue: HydroRIVERS · Orange: poster · White: overlap</p>
      {result.viewer ? <><button className="glass-input" type="button" onClick={()=>setShowMap(!showMap)}>{showMap ? "Hide geographic inspection" : "Open geographic inspection"}</button>
        {showMap && <GeorefMap key={result.filename} viewer={result.viewer} posterId={result.manifest.poster_id} />}</> :
        <p className="text-xs">Map placement is unavailable in this older response. Generate a new result to inspect it geographically.</p>}
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
