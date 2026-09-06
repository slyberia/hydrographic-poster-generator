"use client";
import { useEffect, useRef, useState } from "react";
import PosterHeader from "@/components/PosterHeader";
import GeorefResults from "@/components/GeorefResults";
import { getGeographies, getGeographyChildren, getPresets, type GeographyRegion, type GeographyDetail, type PresetsResponse } from "@/lib/api";
import { recoverGeoreference, type GeorefResult } from "@/lib/georefApi";

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
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    const abort = new AbortController();
    Promise.all([getGeographies(abort.signal), getPresets(abort.signal)])
      .then(([geo, styles]) => { setRegions(geo.regions); setPresets(styles); })
      .catch(err => { if (!abort.signal.aborted) setError(String(err)); });
    return () => { abort.abort(); controller.current?.abort(); };
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
      if (child || geography) options.geography_id = child || geography;
      if (sidecar) options.manifest = JSON.parse(await sidecar.text());
      if (controlPoints) options.gcps = JSON.parse(await controlPoints.text());
      const next = await recoverGeoreference(image, options, controller.current.signal);
      setResult(next);
    } catch (err) {
      if (!controller.current?.signal.aborted) setError(err instanceof Error ? err.message : String(err));
    } finally { setBusy(false); }
  }

  return <main className="min-h-screen bg-[var(--ui-page)] text-[var(--ui-text)]">
    <PosterHeader current="georeference" />
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 p-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
      <form onSubmit={analyze} className="glass-card min-w-0 space-y-4 p-5">
        <h1 className="text-2xl font-semibold">Georeferencer</h1>
        <p className="text-sm">Restore geographic coordinates to a Hydro Poster image. Supports rotation, resizing, margin cropping and JPEG compression.</p>
        <label className="block text-sm">Poster image
          <input className="glass-input mt-1" type="file" accept=".png,.jpg,.jpeg,.tif,.tiff" required disabled={busy}
            onChange={e => { setImage(e.target.files?.[0] ?? null); setResult(null); }} />
        </label>
        <p className="text-xs">PNG, JPEG or TIFF · Up to 25 MB and 40 megapixels. Embedded provenance is detected automatically.</p>
        <label className="block text-sm">Poster ID (optional)
          <input className="glass-input mt-1" value={posterId} disabled={busy} onChange={e => setPosterId(e.target.value)} placeholder="From a previous export" />
        </label>
        <label className="block text-sm">Source geography (for images without metadata)
          <select className="glass-select mt-1" value={geography} disabled={busy} onChange={e => { setGeography(e.target.value); setChild(""); setChildren([]); }}>
            <option value="">Use embedded metadata or poster ID</option>
            {regions.map(region => <optgroup key={region.region_code} label={region.name}>
              {region.countries.filter(country => country.admin_0_id).map(country =>
                <option key={country.admin_0_id!} value={country.admin_0_id!}>{country.name}</option>)}
            </optgroup>)}
          </select>
        </label>
        {children.length > 0 && <label className="block text-sm">Administrative region
          <select className="glass-select mt-1" value={child} disabled={busy} onChange={e => setChild(e.target.value)}>
            <option value="">Whole country</option>
            {children.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>}
        <label className="block text-sm">River density (legacy images)
          <select className="glass-select mt-1" value={density} disabled={busy} onChange={e => setDensity(e.target.value)}>
            {(presets?.density ?? [{ id: "balanced", name: "Balanced" }]).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <details className="text-sm"><summary>Metadata and control points</summary>
          <label className="mt-3 block">Manifest JSON (optional)<input className="glass-input" type="file" accept=".json" disabled={busy} onChange={e => setSidecar(e.target.files?.[0] ?? null)} /></label>
          <label className="mt-3 block">Control-point JSON (optional)<input className="glass-input" type="file" accept=".json" disabled={busy} onChange={e => setControlPoints(e.target.files?.[0] ?? null)} /></label>
          <p className="mt-2 text-xs">At least 12 well-distributed pairs, with source_x/source_y in EPSG:3857 and pixel_x/pixel_y in the uploaded image. The system withholds points for validation.</p>
        </details>
        <button className="glass-input font-semibold" type="submit" disabled={!image || busy}>{busy ? "Analyzing…" : "Analyze alignment"}</button>
        {busy && <button className="glass-input" type="button" onClick={() => controller.current?.abort()}>Cancel</button>}
        <p role="status" className="text-sm">{busy ? "Matching river landmarks and checking against source geometry…" : ""}</p>
        {error && <p role="alert" className="break-words text-sm text-[var(--ui-danger)]">{error}</p>}
        <p className="text-xs">Only provenance and quality metadata are saved. Image processing is temporary; download the results to keep them.</p>
      </form>
      {result ? <GeorefResults result={result} /> : <section className="glass-card p-8">
        <h2 className="text-lg font-semibold">Check the alignment before using it</h2>
        <p className="mt-3 text-sm">Your result includes a source overlay, measured network displacement, withheld-point validation, and downloads for the GeoTIFF, report and control points.</p>
        <p className="mt-3 text-sm">Photos with perspective distortion and heavily edited river geometry are outside this version’s scope.</p>
      </section>}
    </div>
  </main>;
}
