"use client";

/** components/MapView.tsx — Leaflet map rendering ~19.5k H3 cells on canvas. */

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const ZONE_FILL: Record<string, string> = {
  // Concrete colors for canvas (CSS vars don't reach canvas paths).
  PROHIBITED: "#b3362b",
  RESTRICTED: "#d98e2b",
  CONDITIONAL: "#e5c95c",
  SUITABLE: "#5da06f",
};

export default function MapView(props: {
  geojson: GeoJSON.FeatureCollection | null;
  onCellClick: (h3: string) => void;
}) {
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.GeoJSON | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const clickRef = useRef(props.onCellClick);

  useEffect(() => {
    clickRef.current = props.onCellClick;
  }, [props.onCellClick]);

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
        style: (feature) => ({
          fillColor: ZONE_FILL[feature?.properties?.zone] ?? "#999",
          fillOpacity: 0.55,
          color: ZONE_FILL[feature?.properties?.zone] ?? "#999",
          weight: 0.3,
          opacity: 0.6,
        }),
        onEachFeature: (feature, lyr) => {
          lyr.on("click", () => clickRef.current(feature.properties.h3_index));
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

  return <div ref={containerRef} style={{ height: "100%", width: "100%" }} />;
}
