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
}) {
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.GeoJSON | null>(null);
  const markerRef = useRef<L.CircleMarker | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const clickRef = useRef(props.onCellClick);
  const featureClickRef = useRef(props.onFeatureClick);
  const hasFittedRef = useRef(false);
  const lastFitKeyRef = useRef<string | null>(null);

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
    const map = L.map(containerRef.current, {
      preferCanvas: true, // 19.5k polygons need canvas, not SVG DOM nodes
      center: [DEFAULT_STUDY_AREA.center.lat, DEFAULT_STUDY_AREA.center.lng],
      zoom: DEFAULT_STUDY_AREA.defaultZoom,
    });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
      maxZoom: 18,
    }).addTo(map);
    mapRef.current = map;

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
      map.remove();
      mapRef.current = null;
    };
    // props.viewportRef is a stable ref container; init must run exactly once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
