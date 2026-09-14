"use client";
import { useEffect, useRef, useState } from "react";
import PosterHeader from "@/components/PosterHeader";
import GeorefResults from "@/components/GeorefResults";
import { getGeographies, getGeographyChildren, getPresets, type GeographyRegion, type GeographyDetail, type PresetsResponse } from "@/lib/api";
import { recoverGeoreference, type GeorefResult } from "@/lib/georefApi";
import { cleanupHandoffs, consumeHandoff, type HandoffResult } from "@/lib/studioHandoff";

export default function GeoreferencePage() {
  const [image, setImage] = useState<File | null>(null);
  const [posterId, setPosterId] = useState("");
  const [geography, setGeography] = useState("");
  const [children, setChildren] = useState<GeographyDetail[]>([]);
  const [child, setChild] = useState("");
  const [regions, setRegions] = useState<GeographyRegion[]>([]);
  const [presets, setPresets] = useState<PresetsResponse | null>(null);
  const [density, setDensity] = useState("balanced");
  const [sidecar, setSidecar] = useState<File | null>(null);
  const [controlPoints, setControlPoints] = useState<File | null>(null);
  const [result, setResult] = useState<GeorefResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const handoff = useRef<Promise<HandoffResult> | null>(null);
  const [handoffNotice, setHandoffNotice] = useState("");
  const [provenance, setProvenance] = useState<Record<string, unknown> | null>(null);

  function selectImage(file: File | undefined) {
    if (!file) return;
    setImage(file); setResult(null); setError("");
    if (handoffNotice) { setPosterId(""); setProvenance(null); setHandoffNotice(""); setSidecar(null); setControlPoints(null); }
  }

  useEffect(() => {
    const abort = new AbortController();
    let active = true;
    const params = new URLSearchParams(window.location.search);
    const token = params.get("handoff");
    let linked = params.get("poster_id");
    try { if (!linked && !token) linked = sessionStorage.getItem("hydro:last-poster-id"); } catch { /* Optional legacy hint. */ }
    if (linked) queueMicrotask(() => setPosterId(linked));
    if (token) {
      // Reuse the promise across Strict Mode effect replay; never consume twice.
      handoff.current ??= consumeHandoff(token, params.get("expires"));
      void handoff.current.then(value => {
        if (!active) return;
        if (value.status === "ready") {
          setImage(value.file); setPosterId(value.posterId ?? ""); setProvenance(value.provenance);
          setHandoffNotice("Studio poster loaded. Review its context, then analyze alignment.");
        } else {
          setHandoffNotice(`Studio transfer ${value.status}. Prepare it again in Studio or choose an image below.`);
        }
        void cleanupHandoffs().catch(() => {});
      });
    } else { void cleanupHandoffs().catch(() => {}); }
    Promise.all([getGeographies(abort.signal), getPresets(abort.signal)])
      .then(([geo, styles]) => { setRegions(geo.regions); setPresets(styles); })
      .catch(err => { if (!abort.signal.aborted) setError(String(err)); });
    return () => { active = false; abort.abort(); controller.current?.abort(); };
  }, []);
  useEffect(() => {
    if (!geography) return;
    const abort = new AbortController();
    getGeographyChildren(geography, abort.signal).then(setChildren)
      .catch(err => { if (!abort.signal.aborted) setError(String(err)); });
    return () => abort.abort();
  }, [geography]);

  async function analyze(event: React.FormEvent) {
    event.preventDefault();
    if (!image) return;
    setError(""); setBusy(true);
    controller.current = new AbortController();
    try {
      if (image.size > 25 * 1024 * 1024) throw new Error("Choose an image smaller than 25 MB.");
      if (posterId.trim() && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(posterId.trim())) {
        throw new Error("Enter the complete poster ID from your export, or leave this field empty to use the image metadata.");
      }
      if ((sidecar?.size ?? 0) > 65536 || (controlPoints?.size ?? 0) > 65536) throw new Error("Metadata files must be smaller than 64 KB.");
      const options: Record<string, unknown> = { density_preset: density };
      if (posterId.trim()) options.poster_id = posterId.trim();
      if (provenance) options.studio_provenance = provenance;
      if (child || geography) options.geography_id = child || geography;
      if (sidecar) options.manifest = JSON.parse(await sidecar.text());
      if (controlPoints) options.gcps = JSON.parse(await controlPoints.text());
      const next = await recoverGeoreference(image, options, controller.current.signal);
      setResult(next);
    } catch (err) {
      if (!controller.current?.signal.aborted) setError(err instanceof Error ? err.message : String(err));
    } finally { setBusy(false); }
  }

  return <main className="georef-page min-h-screen bg-[var(--ui-page)] text-[var(--ui-text)]">
    <PosterHeader current="georeference" />
    <div className="georef-shell mx-auto grid max-w-[100rem] grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
      <form onSubmit={analyze} className="georef-panel min-w-0 space-y-5 p-5 sm:p-6">
        <div>
          <p className="section-header">Poster verification</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Georeferencer</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--ui-text-muted)]">Restore geographic coordinates to a Hydro Poster image, then inspect the alignment before using it.</p>
        </div>
        <ol className="georef-steps" aria-label="Georeferencing workflow">
          <li className="georef-step georef-step--active"><span>1</span><div><strong>Upload</strong><small>Choose a poster image</small></div></li>
          <li className="georef-step"><span>2</span><div><strong>Context</strong><small>Confirm source geography</small></div></li>
          <li className="georef-step"><span>3</span><div><strong>Review</strong><small>Check the evidence</small></div></li>
        </ol>
        <section className="georef-form-section" aria-labelledby="georef-upload-heading">
          <div className="georef-section-heading"><span className="georef-kicker">Step 1</span><h2 id="georef-upload-heading">Upload your poster</h2></div>
          <div className={`georef-dropzone ${dragging ? "georef-dropzone--active" : ""} ${image ? "georef-dropzone--selected" : ""}`}
            onDragOver={e => { e.preventDefault(); if (!busy) setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); if (!busy) selectImage(e.dataTransfer.files[0]); }}>
            <input ref={fileInput} aria-label="Poster image" className="sr-only" type="file" accept=".png,.jpg,.jpeg,.tif,.tiff" required={!image} disabled={busy}
              onChange={e => selectImage(e.target.files?.[0])} />
            <span className="georef-upload-icon" aria-hidden="true">↑</span>
            <strong>{image ? image.name : "Drop a poster image here"}</strong>
            <span>{image ? `${(image.size / 1024 / 1024).toFixed(2)} MB · Ready to analyze` : "or choose a PNG, JPEG, or TIFF"}</span>
            <button type="button" className="btn-secondary mt-3" disabled={busy} onClick={() => fileInput.current?.click()}>{image ? "Replace image" : "Choose image"}</button>
          </div>
          <p id="georef-upload-help" className="field-help">Up to 25 MB and 40 megapixels. Embedded provenance is detected automatically.</p>
          {handoffNotice && <p role="status" className="georef-note">{handoffNotice}</p>}
          {posterId && <p className="georef-note"><span aria-hidden="true">↗</span> Linked automatically to your latest Studio export.</p>}
        </section>
        <section className="georef-form-section" aria-labelledby="georef-context-heading">
          <div className="georef-section-heading"><span className="georef-kicker">Step 2</span><h2 id="georef-context-heading">Confirm source context</h2></div>
          <label className="glass-label" htmlFor="source-geography">Source geography <span className="normal-case font-normal tracking-normal">(for images without metadata)</span></label>
          <select id="source-geography" className="glass-select" value={geography} disabled={busy} onChange={e => { setGeography(e.target.value); setChild(""); setChildren([]); }}>
            <option value="">Use embedded metadata or poster ID</option>
            {regions.map(region => <optgroup key={region.region_code} label={region.name}>
              {region.countries.filter(country => country.admin_0_id).map(country =>
                <option key={country.admin_0_id!} value={country.admin_0_id!}>{country.name}</option>)}
            </optgroup>)}
          </select>
          {children.length > 0 && <><label className="glass-label mt-4" htmlFor="administrative-region">Administrative region</label>
          <select id="administrative-region" className="glass-select" value={child} disabled={busy} onChange={e => setChild(e.target.value)}>
            <option value="">Whole country</option>
            {children.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          </>}
          <label className="glass-label mt-4" htmlFor="river-density">River density <span className="normal-case font-normal tracking-normal">(legacy images)</span></label>
          <select id="river-density" className="glass-select" value={density} disabled={busy} onChange={e => setDensity(e.target.value)}>
            {(presets?.density ?? [{ id: "balanced", name: "Balanced" }]).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </section>
        <details className="georef-advanced"><summary><span>Metadata and control points</span> <span>Advanced inputs · optional</span></summary>
          <label className="glass-label mt-4" htmlFor="poster-id">Poster ID <span className="normal-case font-normal tracking-normal">(optional)</span></label><input id="poster-id" className="glass-input" value={posterId} disabled={busy} onChange={e => setPosterId(e.target.value)} placeholder="From a previous export" />
          <label className="glass-label mt-4" htmlFor="manifest-json">Manifest JSON <span className="normal-case font-normal tracking-normal">(optional)</span></label><input id="manifest-json" className="glass-input" type="file" accept=".json" disabled={busy} onChange={e => setSidecar(e.target.files?.[0] ?? null)} />
          <label className="glass-label mt-4" htmlFor="control-points-json">Control-point JSON <span className="normal-case font-normal tracking-normal">(optional)</span></label><input id="control-points-json" className="glass-input" type="file" accept=".json" disabled={busy} onChange={e => setControlPoints(e.target.files?.[0] ?? null)} />
          <p className="mt-2 text-xs">Most Studio exports need none of these. A manifest comes from a georeferencing result; control points are independently measured reference pairs supplied by the user.</p>
          <p className="mt-2 text-xs">At least 12 well-distributed pairs, with source_x/source_y in EPSG:3857 and pixel_x/pixel_y in the uploaded image. The system withholds points for validation.</p>
        </details>
        <div className="georef-action-stack">
          <button className="btn-primary" type="submit" disabled={!image || busy}>{busy ? "Analyzing…" : "Analyze alignment"}</button>
          {busy && <button className="btn-secondary" type="button" onClick={() => controller.current?.abort()}>Cancel analysis</button>}
        </div>
        <p role="status" className="georef-status">{busy ? "Matching river landmarks and checking against source geometry…" : ""}</p>
        {error && <p role="alert" className="georef-error break-words"><strong>Unable to analyze this image.</strong><span>{error}</span></p>}
        <p className="georef-privacy">Only provenance and quality metadata are saved. Image processing is temporary; download the results to keep them.</p>
      </form>
      {result ? <GeorefResults result={result} /> : <section className="georef-empty-state">
        <div className="georef-empty-mark" aria-hidden="true">◎</div>
        <p className="section-header">Step 3 · Review</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">Your alignment workspace</h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--ui-text-muted)]">After analysis, you’ll see the source overlay, network displacement, withheld-point validation, geographic inspection, and downloads for the GeoTIFF and evidence reports.</p>
        <div className="georef-boundary"><strong>Scope note</strong><span>Perspective distortion and heavily edited river geometry are outside this version’s scope.</span></div>
      </section>}
    </div>
  </main>;
}
