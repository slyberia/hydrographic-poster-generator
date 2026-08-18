"use client";

/** components/MapView.tsx — shared Leaflet renderer for zoning areas and cells. */

import { useEffect, useRef, type MutableRefObject } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { VolatilityRecord, Zone, type ViewportSnapshot } from "@/lib/droneApi";
import { CONSTRAINT_LOCKED_FILL, VOLATILITY_FILL, ZONE_FILL } from "@/lib/zoneTheme";
import { DEFAULT_STUDY_AREA } from "@/lib/studyArea";
import LoadingBar from "@/components/drone/LoadingBar";

export type MapDisplayMode = "zones" | "volatility";
export type GeometryDisplayMode = "dissolved" | "cell";

const REFERENCE_COLORS: Record<string, { stroke: string; fill?: string; dash?: string }> = {
  airports: { stroke: "#153b5b", fill: "#f7f4ec" },
  runways: { stroke: "#263238" },
  runway_safeguarding: { stroke: "#8b5e62", fill: "#c98e8f", dash: "7 6" },
  airport_notification: { stroke: "#7a6a42", fill: "#d9c58a", dash: "4 7" },
  schools: { stroke: "#4b6f6a", fill: "#e8f0eb" },
  healthcare: { stroke: "#9b5a58", fill: "#f2e5e1" },
  government: { stroke: "#6b627c", fill: "#ece8f0" },
  police: { stroke: "#355b7a", fill: "#e4edf3" },
  fire: { stroke: "#a65b37", fill: "#f4e4d9" },
};

const REFERENCE_ICONS: Record<string, string> = {
  airports: '<path d="M12 2l2 7 7 3-7 1-2 7-2-7-7-1 7-3z" fill="currentColor"/>',
  schools: '<path d="M3 10l9-6 9 6-9 6-9-6zm3 3v5h12v-5M9 17v-4m6 4v-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  healthcare: '<path d="M12 20S4 15 4 9a4 4 0 0 1 8-2 4 4 0 0 1 8 2c0 6-8 11-8 11z" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M12 8v6m-3-3h6" stroke="currentColor" stroke-width="1.7"/>',
  government: '<path d="M3 20h18M5 17h14M6 9h12M4 7l8-4 8 4M8 10v6m4-6v6m4-6v6" fill="none" stroke="currentColor" stroke-width="1.6"/>',
  police: '<path d="M12 3l7 3v5c0 4-3 7-7 10-4-3-7-6-7-10V6l7-3z" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M9 11h6m-3-3v6" stroke="currentColor" stroke-width="1.6"/>',
  fire: '<path d="M13 21c4-1 6-4 5-8-.5-2-2-4-4-6 0 3-1 4-2 5 0-4-2-7-5-9 1 4-3 6-3 11 0 4 3 7 7 7 1 0 1 0 2 0z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>',
};

export default function MapView(props: {
  geojson: GeoJSON.FeatureCollection | null;
  onCellClick?: (h3: string) => void;
  onFeatureClick?: (feature: GeoJSON.Feature) => void;
  geometryMode?: GeometryDisplayMode;
  displayMode?: MapDisplayMode;
  volatilityByH3?: Map<string, VolatilityRecord> | null;
  hiddenZones?: Set<Zone>;
  loading?: boolean;
  /** When set, fly the map to this point and drop a marker (georeference search). */
  focusPoint?: { lat: number; lon: number } | null;
  /** Populated with a reader for the live viewport (bbox + zoom) — the export
   * contract. Null until the map has initialised. */
  viewportRef?: MutableRefObject<(() => ViewportSnapshot) | null>;
  fitBoundsKey?: string | null;
  referenceLayers?: Record<string, GeoJSON.FeatureCollection>;
  onReferenceFeatureClick?: (feature: GeoJSON.Feature) => void;
  onZoomChange?: (zoom: number) => void;
}) {
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.GeoJSON | null>(null);
  const markerRef = useRef<L.CircleMarker | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const clickRef = useRef(props.onCellClick);
  const featureClickRef = useRef(props.onFeatureClick);
  const hasFittedRef = useRef(false);
  const lastFitKeyRef = useRef<string | null>(null);
  const referenceLayerRef = useRef<L.LayerGroup | null>(null);

  const isEmpty = props.geojson !== null && (props.geojson.features?.length ?? 0) === 0;

  // Style inputs live in refs so restyles never force a layer rebuild.
  const styleInputsRef = useRef({
    displayMode: props.displayMode ?? "zones",
    geometryMode: props.geometryMode ?? "cell",
    volatilityByH3: props.volatilityByH3 ?? null,
    hiddenZones: props.hiddenZones ?? new Set<Zone>(),
  });

  useEffect(() => {
    clickRef.current = props.onCellClick;
  }, [props.onCellClick]);

  useEffect(() => {
    featureClickRef.current = props.onFeatureClick;
  }, [props.onFeatureClick]);

  function styleFor(feature?: GeoJSON.Feature): L.PathOptions {
    const { displayMode, volatilityByH3, hiddenZones } = styleInputsRef.current;
    const zone = feature?.properties?.zone as Zone | undefined;
    if (zone && hiddenZones.has(zone)) {
      return { fillOpacity: 0, opacity: 0 };
    }
    let fill: string;
    if (displayMode === "volatility") {
      const rec = feature?.properties?.h3_index
        ? volatilityByH3?.get(feature.properties.h3_index)
        : undefined;
      // Absent from the payload = constraint-locked (stable by definition).
      fill = rec ? VOLATILITY_FILL[rec.volatility_category] : CONSTRAINT_LOCKED_FILL;
    } else {
      fill = (zone && ZONE_FILL[zone]) || "#999";
    }
    const dissolved = styleInputsRef.current.geometryMode === "dissolved";
    return {
      fillColor: fill,
      fillOpacity: dissolved ? 0.58 : 0.55,
      color: dissolved ? "#46544d" : fill,
      weight: dissolved ? 1.2 : 0.3,
      opacity: dissolved ? 0.78 : 0.6,
    };
  }

  // init once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const needsHighVolumeRenderer = Boolean(props.onCellClick) || (props.geometryMode ?? "cell") === "cell";
    const map = L.map(containerRef.current, {
      // Keep canvas for the analyst's 19.5k-cell view. Published dissolved
      // surfaces are small enough for SVG, which also avoids carrying a canvas
      // redraw lifecycle through public-page reloads and route transitions.
      preferCanvas: needsHighVolumeRenderer,
      center: [DEFAULT_STUDY_AREA.center.lat, DEFAULT_STUDY_AREA.center.lng],
      zoom: DEFAULT_STUDY_AREA.defaultZoom,
    });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
      maxZoom: 18,
    }).addTo(map);
    mapRef.current = map;
    props.onZoomChange?.(map.getZoom());
    const handleZoom = () => props.onZoomChange?.(map.getZoom());
    const handleResize = () => map.invalidateSize({ pan: false });
    map.on("zoomend", handleZoom);
    window.addEventListener("resize", handleResize);

    // Expose a reader for the current extent so the export control can send the
    // exact bbox + zoom on screen. Reads live state each call; no re-renders.
    const vpRef = props.viewportRef;
    if (vpRef) {
      vpRef.current = () => {
        const b = map.getBounds();
        return {
          bbox: {
            west: b.getWest(),
            south: b.getSouth(),
            east: b.getEast(),
            north: b.getNorth(),
          },
          zoom: Math.round(map.getZoom()),
        };
      };
    }

    return () => {
      if (vpRef) vpRef.current = null;
      map.off("zoomend", handleZoom);
      window.removeEventListener("resize", handleResize);

      // React cleans effects up in declaration order. Remove the component-owned
      // layers before Leaflet destroys its shared canvas renderer; otherwise a
      // later layer cleanup can queue a redraw against an already-destroyed
      // canvas during rapid route changes.
      referenceLayerRef.current?.remove();
      referenceLayerRef.current = null;
      layerRef.current?.remove();
      layerRef.current = null;
      markerRef.current?.remove();
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
    // props.viewportRef is a stable ref container; init must run exactly once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    referenceLayerRef.current?.remove();
    const group = L.layerGroup().addTo(map);
    referenceLayerRef.current = group;
    for (const [key, fc] of Object.entries(props.referenceLayers ?? {})) {
      const palette = REFERENCE_COLORS[key] ?? { stroke: "#536b60", fill: "#eef2ed" };
      const layer = L.geoJSON(fc, {
        style: (feature) => {
          const surface = feature?.properties?.surface_type;
          const color = key === "runway_safeguarding" && surface === "departure" ? "#557b75" : palette.stroke;
          return { color, fillColor: palette.fill ?? color, fillOpacity: key.includes("safeguarding") || key === "airport_notification" ? 0.12 : 0.32, weight: key === "runways" ? 4 : 1.5, dashArray: palette.dash };
        },
        pointToLayer: (feature, latlng) => {
          const icon = REFERENCE_ICONS[key];
          if (!icon) return L.circleMarker(latlng, { radius: 5, color: palette.stroke, fillColor: palette.fill, fillOpacity: 0.9, weight: 1.5 });
          const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="${palette.fill ?? "#f7f4ec"}" stroke="${palette.stroke}" stroke-width="1.5"/><g color="${palette.stroke}">${icon}</g></svg>`;
          return L.marker(latlng, { icon: L.divIcon({ className: `reference-marker reference-marker--${key}`, html: svg, iconSize: [28, 28], iconAnchor: [14, 14] }), title: feature.properties?.name ?? key, alt: feature.properties?.name ?? key });
        },
        onEachFeature: (feature, lyr) => {
          const p = feature.properties ?? {};
          const name = p.name ?? p.runway_designation ?? p.surface_type ?? key;
          const details = [p.category, p.airport_code, p.surface_type, p.confidence].filter(Boolean).join(" · ");
          lyr.bindTooltip(String(name), { direction: "top", opacity: 0.95 });
          lyr.bindPopup(`<strong>${String(name)}</strong><br/><span>${details}</span>${p.explanation ? `<br/><small>${String(p.explanation)}</small>` : ""}`);
          lyr.on("click", () => props.onReferenceFeatureClick?.(feature));
        },
      });
      layer.addTo(group);
    }
    return () => { group.remove(); if (referenceLayerRef.current === group) referenceLayerRef.current = null; };
  }, [props.referenceLayers, props.onReferenceFeatureClick]);

  // swap data layer when a run's geojson arrives
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (layerRef.current) {
      layerRef.current.remove();
      layerRef.current = null;
    }
    if (!props.geojson) return;

    try {
      const layer = L.geoJSON(props.geojson, {
        style: styleFor,
        onEachFeature: (feature, lyr) => {
          const h3 = feature.properties?.h3_index;
          lyr.on("click", () => {
            if (featureClickRef.current) featureClickRef.current(feature);
            else if (h3 && clickRef.current) clickRef.current(h3);
          });
        },
      }).addTo(map);
      layerRef.current = layer;

      const bounds = layer.getBounds();
      const fitKey = props.fitBoundsKey ?? null;
      const shouldFit = fitKey
        ? lastFitKeyRef.current !== fitKey
        : !hasFittedRef.current;
      if (bounds.isValid() && shouldFit) {
        map.fitBounds(bounds, { padding: [16, 16] });
        hasFittedRef.current = true;
        lastFitKeyRef.current = fitKey;
      }
    } catch (e) {
      console.error("Failed to render GeoJSON layer", e);
    }
  }, [props.geojson, props.fitBoundsKey]);

  // mode / volatility / visibility changes restyle the existing layer only
  useEffect(() => {
    styleInputsRef.current = {
      displayMode: props.displayMode ?? "zones",
      geometryMode: props.geometryMode ?? "cell",
      volatilityByH3: props.volatilityByH3 ?? null,
      hiddenZones: props.hiddenZones ?? new Set<Zone>(),
    };
    layerRef.current?.setStyle(styleFor);
  }, [props.displayMode, props.geometryMode, props.volatilityByH3, props.hiddenZones]);

  // Georeference search: fly to the picked point and mark it.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const p = props.focusPoint;
    if (!p) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }
    map.flyTo([p.lat, p.lon], 13, { duration: 0.75 });
    if (markerRef.current) {
      markerRef.current.setLatLng([p.lat, p.lon]);
    } else {
      markerRef.current = L.circleMarker([p.lat, p.lon], {
        radius: 7, color: "#111", weight: 2, fillColor: "#fff", fillOpacity: 1,
      }).addTo(map);
    }
  }, [props.focusPoint]);

  return (
    <div className="mapview-root" style={{ position: "relative", height: "100%", width: "100%" }}>
      <LoadingBar active={!!props.loading} label="Loading map" />
      <div ref={containerRef} style={{ height: "100%", width: "100%" }} />
      {isEmpty && !props.loading && (
        <div className="map-overlay map-overlay--empty" role="status">
          <div className="map-overlay-card">
            <strong>No scored cells for this run</strong>
            <span>This run completed without results — re-run the zoning model to generate a map.</span>
          </div>
        </div>
      )}
      {props.loading && (
        <div className="map-overlay map-overlay--loading" role="status" aria-live="polite">
          <div className="map-overlay-card">
            <span className="map-spinner" aria-hidden="true" />
            <span>Loading map…</span>
          </div>
        </div>
      )}
    </div>
  );
}
