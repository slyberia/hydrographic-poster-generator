"use client";
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { georefPlacement } from "@/lib/georefPlacement";
import {
  downloadJson, getRiverNameDataset, getRiverNameManifest, inspectRivers,
  type GeorefViewer, type InspectedRivers, type RiverNameDataset,
  type RiverNameManifest, type RiverNameRecord, type RiverNameStatus,
} from "@/lib/georefApi";

const STATUS: Record<RiverNameStatus, { color: string; label: string }> = {
  matched: { color: "#15803d", label: "Matched" },
  ambiguous: { color: "#b45309", label: "Ambiguous" },
  unnamed_in_source: { color: "#64748b", label: "Unnamed in source" },
  not_evaluated: { color: "#2563eb", label: "Not evaluated" },
};

export default function GeorefMap({ viewer, posterId }: { viewer: GeorefViewer; posterId: string }) {
  const host = useRef<HTMLDivElement>(null), map = useRef<L.Map | null>(null);
  const raster = useRef<L.SVGOverlay | null>(null), tiles = useRef<L.TileLayer | null>(null);
  const request = useRef<AbortController | null>(null), nameRequest = useRef<AbortController | null>(null);
  const [opacity, setOpacity] = useState(0.65), [basemap, setBasemap] = useState(false);
  const [rivers, setRivers] = useState<InspectedRivers | null>(null);
  const [selected, setSelected] = useState<GeoJSON.Feature | null>(null);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const [namesEnabled, setNamesEnabled] = useState(false), [namesBusy, setNamesBusy] = useState(false);
  const [nameMessage, setNameMessage] = useState("");
  const [nameManifest, setNameManifest] = useState<RiverNameManifest | null>(null);
  const [nameData, setNameData] = useState<RiverNameDataset | null>(null);

  useEffect(() => {
    if (!host.current) return;
    const position = georefPlacement(viewer);
    const bounds = L.latLngBounds(L.CRS.EPSG3857.unproject(L.point(position.west, position.south)),
      L.CRS.EPSG3857.unproject(L.point(position.east, position.north)));
    const instance = L.map(host.current, { scrollWheelZoom: false, minZoom: 2, maxZoom: 18 });
    map.current = instance;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", position.viewBox); svg.setAttribute("preserveAspectRatio", "none");
    const image = document.createElementNS("http://www.w3.org/2000/svg", "image");
    image.setAttribute("href", "data:image/png;base64," + viewer.png_base64);
    image.setAttribute("width", String(viewer.width)); image.setAttribute("height", String(viewer.height));
    image.setAttribute("transform", position.matrix); svg.appendChild(image);
    raster.current = L.svgOverlay(svg, bounds, { opacity: 0.65, interactive: false }).addTo(instance);
    instance.fitBounds(bounds, { padding: [12,12] });
    tiles.current = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
    }).on("tileerror", () => setMessage("Some basemap tiles could not load. Raster inspection and downloads remain available."));
    const resize = new ResizeObserver(() => instance.invalidateSize()); resize.observe(host.current);
    return () => { resize.disconnect(); request.current?.abort(); nameRequest.current?.abort(); instance.remove(); map.current = null; };
  }, [viewer]);
  useEffect(() => { raster.current?.setOpacity(opacity); }, [opacity]);
  useEffect(() => {
    if (!map.current || !tiles.current) return;
    if (basemap) tiles.current.addTo(map.current); else tiles.current.remove();
  }, [basemap]);

  const nameFor = (feature: GeoJSON.Feature): RiverNameRecord | undefined =>
    nameData?.name_index[String(feature.properties?.hydrorivers_id)];

  useEffect(() => {
    if (!map.current || !nameData || !namesEnabled) return;
    const layer = L.geoJSON(nameData, {
      style: { color: STATUS.matched.color, weight: 2, opacity: 0.65, dashArray: "5 4" },
      onEachFeature: (feature, reach) => {
        const name = feature.properties?.name;
        if (name) reach.bindTooltip(String(name), { sticky: true, direction: "auto" });
      },
    }).addTo(map.current);
    return () => { layer.remove(); };
  }, [nameData, namesEnabled]);
  useEffect(() => {
    if (!map.current || !rivers) return;
    const layer = L.geoJSON(rivers, {
      style: feature => {
        const status = feature
          ? nameData?.name_index[String(feature.properties?.hydrorivers_id)]?.name_status ?? "not_evaluated"
          : "not_evaluated";
        return { color: STATUS[status].color, weight: 3 };
      },
      onEachFeature: (feature, reach) => { reach.on("click", () => setSelected(feature)); }
    }).addTo(map.current);
    return () => { layer.remove(); };
  }, [rivers, nameData]);

  async function loadRivers() {
    if (!map.current) return;
    request.current?.abort(); const abort = new AbortController(); request.current = abort;
    const b = map.current.getBounds(); setBusy(true); setMessage("");
    try {
      const next = await inspectRivers(posterId, [Math.max(-180,b.getWest()), Math.max(-85,b.getSouth()),
        Math.min(180,b.getEast()), Math.min(85,b.getNorth())], abort.signal);
      if (abort.signal.aborted) return;
      setRivers(next); setSelected(null);
      setMessage(next.truncated ? "Showing the first 250 reaches. Zoom in and reload to inspect more." : `${next.features.length} source reaches loaded.`);
    } catch (error) { if (!abort.signal.aborted) setMessage(String(error)); }
    finally { if (!abort.signal.aborted) setBusy(false); }
  }

  async function toggleNames(enabled: boolean) {
    setNamesEnabled(enabled);
    if (!enabled || nameData || namesBusy) return;
    nameRequest.current?.abort(); const abort = new AbortController(); nameRequest.current = abort;
    setNamesBusy(true); setNameMessage("");
    try {
      const manifest = await getRiverNameManifest(posterId, abort.signal);
      const data = await getRiverNameDataset(manifest.artifact.url, abort.signal);
      if (abort.signal.aborted) return;
      setNameManifest(manifest); setNameData(data);
      setNameMessage(`${manifest.artifact.indexed_reach_count.toLocaleString()} evaluated reach associations loaded.`);
    } catch (error) {
      if (!abort.signal.aborted) { setNamesEnabled(false); setNameMessage(error instanceof Error ? error.message : String(error)); }
    } finally { if (!abort.signal.aborted) setNamesBusy(false); }
  }

  const props = selected?.properties;
  const selectedRecord = selected ? nameFor(selected) : undefined;
  const selectedStatus: RiverNameStatus = selectedRecord?.name_status ?? "not_evaluated";
  const displayedName = selectedRecord?.name ?? (selectedStatus === "ambiguous" && selectedRecord?.candidate_name
    ? `Possible match: ${selectedRecord.candidate_name}`
    : selectedStatus === "unnamed_in_source" ? "No name in evaluated OSM source" : "Not evaluated");

  return <section className="georef-map-panel min-w-0 space-y-3" aria-label="Geographic inspection">
    <div className="georef-map-heading"><div><p className="section-header">Geographic inspection</p><h3 className="mt-1 font-semibold">Inspect on a map</h3></div><span className="georef-map-badge">Lazy loaded</span></div>
    <p className="text-xs text-[var(--ui-text-muted)]">Basemap is visual context, not surveyed ground truth. Source lines are clipped to the viewport for display only.</p>
    <div className="georef-map-controls">
    <label className="georef-toggle"><input className="glass-checkbox" type="checkbox" checked={basemap} onChange={e=>setBasemap(e.target.checked)} /> <span><strong>OpenStreetMap basemap</strong><small>Visual context only</small></span></label>
    <p className="text-xs">Enabling the basemap sends map tile requests to OpenStreetMap. Tiles are not included in downloads.</p>
    <label className="georef-toggle"><input aria-label="Show evaluated river names" className="glass-checkbox" type="checkbox" checked={namesEnabled} disabled={namesBusy} onChange={e=>void toggleNames(e.target.checked)} /> <span><strong>{namesBusy ? "Loading evaluated river names…" : "Evaluated river names"}</strong><small>Versioned OSM-derived layer</small></span></label>
    </div>
    <p className="text-xs">Names are loaded from a cached, versioned OSM-derived layer. Completeness may vary by country, language, source coverage, segmentation and local mapping practice.</p>
    <p role="status" className="text-xs">{nameMessage}</p>
    {namesEnabled && nameData && <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" aria-label="River name status legend">
      {(Object.keys(STATUS) as RiverNameStatus[]).map(status => <span key={status}><span aria-hidden="true" style={{ color: STATUS[status].color }}>●</span> {STATUS[status].label}</span>)}
    </div>}
    <label className="georef-opacity"><span>Poster opacity <strong>{Math.round(opacity*100)}%</strong></span><input aria-label="Poster opacity" type="range" min="0" max="1" step="0.05" value={opacity} onChange={e=>setOpacity(Number(e.target.value))} /></label>
    <div ref={host} className="relative z-0 w-full rounded" style={{ height: "clamp(440px, 70vh, 900px)" }} aria-label="Georeferenced poster map" />
    <div className="georef-map-actions"><button type="button" className="btn-primary" disabled={busy} onClick={loadRivers}>{busy ? "Loading rivers…" : "Load rivers in view"}</button>
      <button type="button" className="glass-input" onClick={()=>{request.current?.abort();setBusy(false);setRivers(null);setSelected(null);setMessage("");}}>Clear source overlay</button></div>
    <p role="status" className="break-words text-sm">{message}</p>
    {!!rivers?.features.length && <label className="glass-label">Inspect a river reach
      <select className="glass-select" value={selected ? String(selected.properties?.hydrorivers_id) : ""} onChange={e=>setSelected(rivers.features.find(f=>String(f.properties?.hydrorivers_id)===e.target.value) ?? null)}>
        <option value="">Click a colored line or choose an ID</option>{rivers.features.map(f=><option key={String(f.properties?.hydrorivers_id)} value={String(f.properties?.hydrorivers_id)}>{String(f.properties?.hydrorivers_id)}</option>)}
      </select></label>}
    {props && <dl className="georef-reach-details grid grid-cols-2 gap-2 text-sm" aria-label="Selected river attributes">
      <dt>HydroRIVERS ID</dt><dd>{String(props.hydrorivers_id)}</dd><dt>Stream order</dt><dd>{props.stream_order ?? "Not available"}</dd>
      <dt>Upstream area</dt><dd>{props.upstream_area == null ? "Not available" : `${props.upstream_area} km²`}</dd>
      <dt>Reach length</dt><dd>{props.length_km == null ? "Not available" : `${props.length_km} km`}</dd>
      <dt>River name</dt><dd>{displayedName}</dd><dt>Name status</dt><dd style={{ color: STATUS[selectedStatus].color }} className="font-semibold">{STATUS[selectedStatus].label}</dd>
      {selectedRecord?.confidence != null && <><dt>Match confidence</dt><dd>{Math.round(selectedRecord.confidence * 100)}%</dd></>}
    </dl>}
    {nameManifest && <><p className="text-xs">Country evaluation: {nameManifest.coverage_status ?? nameManifest.evaluation.status}. {nameManifest.disclaimer} © OpenStreetMap contributors, ODbL 1.0.</p>
      <button type="button" className="glass-input" onClick={() => downloadJson(
        nameManifest.evaluation,
        `${nameManifest.country_code.toLowerCase()}-river-naming-qc.json`,
      )}>Download naming QC</button></>}
  </section>;
}
