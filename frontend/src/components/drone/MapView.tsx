"use client";

/** components/MapView.tsx — Leaflet map rendering ~19.5k H3 cells on canvas. */

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { VolatilityRecord, Zone } from "@/lib/droneApi";
import { CONSTRAINT_LOCKED_FILL, VOLATILITY_FILL, ZONE_FILL } from "@/lib/zoneTheme";
import LoadingBar from "@/components/drone/LoadingBar";

export type MapDisplayMode = "zones" | "volatility";

export default function MapView(props: {
  geojson: GeoJSON.FeatureCollection | null;
  onCellClick: (h3: string) => void;
  displayMode?: MapDisplayMode;
  volatilityByH3?: Map<string, VolatilityRecord> | null;
  hiddenZones?: Set<Zone>;
  loading?: boolean;
  /** When set, fly the map to this point and drop a marker (georeference search). */
  focusPoint?: { lat: number; lon: number } | null;
}) {
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.GeoJSON | null>(null);
  const markerRef = useRef<L.CircleMarker | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const clickRef = useRef(props.onCellClick);

  const isEmpty = props.geojson !== null && (props.geojson.features?.length ?? 0) === 0;

  // Style inputs live in refs so restyles never force a layer rebuild.
  const styleInputsRef = useRef({
    displayMode: props.displayMode ?? "zones",
    volatilityByH3: props.volatilityByH3 ?? null,
    hiddenZones: props.hiddenZones ?? new Set<Zone>(),
  });

  useEffect(() => {
    clickRef.current = props.onCellClick;
  }, [props.onCellClick]);

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
    return { fillColor: fill, fillOpacity: 0.55, color: fill, weight: 0.3, opacity: 0.6 };
  }

  // init once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      preferCanvas: true, // 19.5k polygons need canvas, not SVG DOM nodes
      center: [6.6, -58.1], // Region 4
      zoom: 10,
    });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
      maxZoom: 18,
    }).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
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
          if (h3) lyr.on("click", () => clickRef.current(h3));
        },
      }).addTo(map);
      layerRef.current = layer;

      const bounds = layer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [16, 16] });
      }
    } catch (e) {
      console.error("Failed to render GeoJSON layer", e);
    }
  }, [props.geojson]);

  // mode / volatility / visibility changes restyle the existing layer only
  useEffect(() => {
    styleInputsRef.current = {
      displayMode: props.displayMode ?? "zones",
      volatilityByH3: props.volatilityByH3 ?? null,
      hiddenZones: props.hiddenZones ?? new Set<Zone>(),
    };
    layerRef.current?.setStyle(styleFor);
  }, [props.displayMode, props.volatilityByH3, props.hiddenZones]);

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
