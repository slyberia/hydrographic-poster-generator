"use client";

/** components/MapView.tsx — Leaflet map rendering ~19.5k H3 cells on canvas. */

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { VolatilityRecord, Zone } from "@/lib/droneApi";
import { CONSTRAINT_LOCKED_FILL, VOLATILITY_FILL, ZONE_FILL } from "@/lib/zoneTheme";

export type MapDisplayMode = "zones" | "volatility";

export default function MapView(props: {
  geojson: GeoJSON.FeatureCollection | null;
  onCellClick: (h3: string) => void;
  displayMode?: MapDisplayMode;
  volatilityByH3?: Map<string, VolatilityRecord> | null;
  hiddenZones?: Set<Zone>;
}) {
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.GeoJSON | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const clickRef = useRef(props.onCellClick);

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

  return <div ref={containerRef} style={{ height: "100%", width: "100%" }} />;
}
