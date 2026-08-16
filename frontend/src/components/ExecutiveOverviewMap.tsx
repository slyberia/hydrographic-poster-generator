"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import Link from "next/link";
import { publicDroneApi } from "@/lib/publicDroneApi";

const MapView = dynamic(() => import("@/components/drone/MapView"), { ssr: false });

type ExecutiveOverviewMapProps = {
  variant?: "drone" | "platform";
};

function formatPublishedAt(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

export default function ExecutiveOverviewMap({ variant = "drone" }: ExecutiveOverviewMapProps) {
  const [geojson, setGeojson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [errorVersion, setErrorVersion] = useState<number | null>(null);
  const [requestVersion, setRequestVersion] = useState(0);
  const [resetVersion, setResetVersion] = useState(0);

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
        if (!cancelled) setErrorVersion(requestVersion);
      });
    return () => { cancelled = true; };
  }, [requestVersion]);

  const publicationLabel = formatPublishedAt(publishedAt);
  const error = errorVersion === requestVersion;

  return (
    <div
      className={`overview-map overview-map--${variant}`}
      role="region"
      aria-label="Interactive published Region 4 zoning map"
      aria-busy={!geojson && !error}
    >
      <MapView
        geojson={geojson}
        geometryMode="dissolved"
        loading={!geojson && !error}
        fitBoundsKey={publishedAt ? `${publishedAt}:${resetVersion}` : null}
      />
      <div className="overview-map-toolbar" role="group" aria-label="Map status and actions">
        <span>{publicationLabel ? `Published ${publicationLabel}` : "Published planning map"}</span>
        <button type="button" onClick={() => setResetVersion((value) => value + 1)} disabled={!geojson}>
          Reset view
        </button>
      </div>
      {error && (
        <div className="overview-map-status" role="alert">
          <strong>Published map preview unavailable</strong>
          <span>The planning map could not be retrieved just now.</span>
          <div>
            <button type="button" onClick={() => setRequestVersion((value) => value + 1)}>Try again</button>
            <Link href="/drone/explore">Open Public Explorer</Link>
          </div>
        </div>
      )}
      <span className="overview-map-hint">Pan and zoom the published planning view</span>
    </div>
  );
}
