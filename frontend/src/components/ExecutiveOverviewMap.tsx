"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { publicDroneApi } from "@/lib/publicDroneApi";

const MapView = dynamic(() => import("@/components/drone/MapView"), { ssr: false });

export default function ExecutiveOverviewMap() {
  const [geojson, setGeojson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void publicDroneApi.getConfig()
      .then(async (config) => {
        if (!config.published) throw new Error("No published map");
        const artifact = config.published.artifacts?.find((item) => item.type === "dissolved");
        const layer = await publicDroneApi.getZoning(artifact?.url, `overview:${config.published.published_at}`);
        if (!cancelled) {
          setGeojson(layer);
          setPublishedAt(config.published.published_at);
        }
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="overview-map" aria-label="Interactive published Region 4 zoning map">
      <MapView
        geojson={geojson}
        geometryMode="dissolved"
        loading={!geojson && !error}
        fitBoundsKey={publishedAt}
      />
      {error && (
        <div className="overview-map-status" role="status">
          <strong>Published map preview unavailable</strong>
          <span>Open the platform to inspect the current planning map.</span>
        </div>
      )}
      <span className="overview-map-hint">Pan and zoom the published planning view</span>
    </div>
  );
}
