"use client";
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { georefPlacement } from "@/lib/georefPlacement";
import { inspectRivers, type GeorefViewer, type InspectedRivers } from "@/lib/georefApi";

export default function GeorefMap({ viewer, posterId }: { viewer: GeorefViewer; posterId: string }) {
  const host = useRef<HTMLDivElement>(null), map = useRef<L.Map | null>(null);
  const raster = useRef<L.SVGOverlay | null>(null), tiles = useRef<L.TileLayer | null>(null);
  const request = useRef<AbortController | null>(null);
  const [opacity, setOpacity] = useState(0.65), [basemap, setBasemap] = useState(false);
  const [rivers, setRivers] = useState<InspectedRivers | null>(null);
  const [selected, setSelected] = useState<GeoJSON.Feature | null>(null);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
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
    return () => { resize.disconnect(); request.current?.abort(); instance.remove(); map.current = null; };
  }, [viewer]);
  useEffect(() => { raster.current?.setOpacity(opacity); }, [opacity]);
  useEffect(() => {
    if (!map.current || !tiles.current) return;
    if (basemap) tiles.current.addTo(map.current); else tiles.current.remove();
  }, [basemap]);
  useEffect(() => {
    if (!map.current || !rivers) return;
    const layer = L.geoJSON(rivers, { style: { color: "#087bcc", weight: 3 },
      onEachFeature: (feature, reach) => { reach.on("click", () => setSelected(feature)); }
    }).addTo(map.current);
    return () => { layer.remove(); };
  }, [rivers]);
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
  const props = selected?.properties;
  return <section className="min-w-0 space-y-3" aria-label="Geographic inspection">
    <h3 className="font-semibold">Inspect on a map</h3>
    <p className="text-xs">Basemap is visual context, not surveyed ground truth. Source lines are clipped to the viewport for display only.</p>
    <label className="block text-sm"><input type="checkbox" checked={basemap} onChange={e=>setBasemap(e.target.checked)} /> Show OpenStreetMap basemap</label>
    <p className="text-xs">Enabling the basemap sends map tile requests to OpenStreetMap. Tiles are not included in downloads.</p>
    <label className="block text-sm">Poster opacity: {Math.round(opacity*100)}% <input aria-label="Poster opacity" type="range" min="0" max="1" step="0.05" value={opacity} onChange={e=>setOpacity(Number(e.target.value))} /></label>
    <div ref={host} className="relative z-0 w-full rounded" style={{ height: 420 }} aria-label="Georeferenced poster map" />
    <div className="flex flex-wrap gap-2"><button type="button" className="glass-input" disabled={busy} onClick={loadRivers}>{busy ? "Loading rivers…" : "Load rivers in view"}</button>
      <button type="button" className="glass-input" onClick={()=>{request.current?.abort();setBusy(false);setRivers(null);setSelected(null);setMessage("");}}>Clear source overlay</button></div>
    <p role="status" className="break-words text-sm">{message}</p>
    {!!rivers?.features.length && <label className="block text-sm">Inspect a river reach
      <select className="glass-select" value={selected ? String(selected.properties?.hydrorivers_id) : ""} onChange={e=>setSelected(rivers.features.find(f=>String(f.properties?.hydrorivers_id)===e.target.value) ?? null)}>
        <option value="">Click a blue line or choose an ID</option>{rivers.features.map(f=><option key={String(f.properties?.hydrorivers_id)} value={String(f.properties?.hydrorivers_id)}>{String(f.properties?.hydrorivers_id)}</option>)}
      </select></label>}
    {props && <dl className="grid grid-cols-2 gap-2 text-sm" aria-label="Selected river attributes">
      <dt>HydroRIVERS ID</dt><dd>{String(props.hydrorivers_id)}</dd><dt>Stream order</dt><dd>{props.stream_order ?? "Not available"}</dd>
      <dt>Upstream area</dt><dd>{props.upstream_area == null ? "Not available" : `${props.upstream_area} km²`}</dd>
      <dt>Reach length</dt><dd>{props.length_km == null ? "Not available" : `${props.length_km} km`}</dd>
      <dt>River name</dt><dd>Not evaluated</dd>
    </dl>}
  </section>;
}
