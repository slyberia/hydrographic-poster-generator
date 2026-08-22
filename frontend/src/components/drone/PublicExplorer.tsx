"use client";

/** components/drone/PublicExplorer.tsx — the public location-guidance map.
 *
 * Consumes ONLY the /public/drone/* contracts (config, zoning, report). It never
 * references a run id, so it cannot select or infer an unpublished run. Reuses
 * the console's map, geo-search, zone theme, and drawer primitives, minus every
 * internal control (weights, sensitivity, export, run selection). */

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { cellToLatLng } from "h3-js";

import { Zone } from "@/lib/droneApi";
import {
  PublicApiError,
  PublicConfig,
  PublicReport,
  publicDroneApi,
} from "@/lib/publicDroneApi";
import { ZONE_FILL, ZONE_LABELS } from "@/lib/zoneTheme";
import GeoSearch from "@/components/drone/GeoSearch";
import PublicReportDrawer from "@/components/drone/PublicReportDrawer";
import { createClient, isSupabaseConfigured } from "@/utils/supabase/client";
import ReferenceLayerControls from "@/components/drone/ReferenceLayerControls";
import { useReferenceLayers, type ReferenceLayerKey } from "@/lib/referenceLayers";
import type { MapZoomRequest } from "@/components/drone/MapView";

// Leaflet touches `window`; render the map client-side only.
const MapView = dynamic(() => import("@/components/drone/MapView"), { ssr: false });

const ZONE_ORDER: Zone[] = ["PROHIBITED", "RESTRICTED", "CONDITIONAL", "SUITABLE"];
const PUBLIC_REFERENCE_DEFAULTS: Partial<Record<ReferenceLayerKey, boolean>> = {
  airports: true, runways: true, runway_safeguarding: true,
};

type Phase = "loading" | "ready" | "unavailable" | "error";
type AppRole = "viewer" | "analyst" | "admin";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      });
}

export default function PublicExplorer() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [geojson, setGeojson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [report, setReport] = useState<PublicReport | null>(null);
  const [reportNote, setReportNote] = useState<{ text: string; error?: boolean } | null>(null);
  const [focusPoint, setFocusPoint] = useState<{ lat: number; lon: number } | null>(null);
  const [hiddenZones, setHiddenZones] = useState<Set<Zone>>(new Set());
  const [appRole, setAppRole] = useState<AppRole | null>(null);
  const [zoomRequest, setZoomRequest] = useState<MapZoomRequest | null>(null);
  const reference = useReferenceLayers({
    allowed: ["airports", "runways", "runway_safeguarding", "airport_notification", "schools", "healthcare", "government", "police", "fire"],
    enabledDefaults: PUBLIC_REFERENCE_DEFAULTS,
  });

  const urlCellHandled = useRef(false);

  const setUrlCell = useCallback((h3: string | null) => {
    try {
      const url = new URL(window.location.href);
      if (h3) url.searchParams.set("cell", h3);
      else url.searchParams.delete("cell");
      window.history.replaceState({}, "", url);
    } catch {
      /* history unavailable — sharing degrades, nothing else breaks */
    }
  }, []);

  const openCell = useCallback(
    async (h3: string, focus?: { lat: number; lon: number }, label?: string) => {
      if (focus) setFocusPoint(focus);
      try {
        const rep = await publicDroneApi.getReport(h3);
        setReport(rep);
        setReportNote(null);
        setUrlCell(h3);
      } catch (e) {
        setReport(null);
        if (e instanceof PublicApiError && e.status === 404) {
          setReportNote({
            text: label
              ? `“${label}” is outside the published zoning area.`
              : "This location is outside the published zoning area.",
            error: true,
          });
        } else {
          setReportNote({ text: "Couldn't load guidance for this location.", error: true });
        }
      }
    },
    [setUrlCell],
  );

  const load = useCallback(async () => {
    setPhase("loading");
    setError(null);
    try {
      const cfg = await publicDroneApi.getConfig();
      setConfig(cfg);
      if (!cfg.published) {
        setPhase("unavailable");
        return;
      }
      const dissolved = cfg.published.artifacts?.find((artifact) => artifact.type === "dissolved");
      const geo = await publicDroneApi.getZoning(dissolved?.url, cfg.published.published_at);
      setGeojson(geo);
      setPhase("ready");
    } catch (e) {
      // 404 from config (no study area) or zoning (nothing published) is an
      // explicit "no data yet" state, not a failure.
      if (e instanceof PublicApiError && e.status === 404) {
        setPhase("unavailable");
        return;
      }
      setError(e instanceof Error ? e.message : String(e));
      setPhase("error");
    }
  }, []);

  useEffect(() => {
    // Defer so the initial phase/error reset runs after the effect body, not
    // synchronously within it (avoids cascading-render lint + behaviour).
    void Promise.resolve().then(() => load());
  }, [load]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    void createClient().auth.getUser().then(({ data }) => {
      const role = data.user?.app_metadata.app_role;
      if (role === "viewer" || role === "analyst" || role === "admin") {
        setAppRole(role);
      }
    });
  }, []);

  // Shareable location URLs: once zoning is ready, resolve a ?cell= param once.
  useEffect(() => {
    if (phase !== "ready" || urlCellHandled.current) return;
    urlCellHandled.current = true;
    let cell: string | null = null;
    try {
      cell = new URLSearchParams(window.location.search).get("cell");
    } catch {
      cell = null;
    }
    if (!cell) return;
    let focus: { lat: number; lon: number } | undefined;
    try {
      const [lat, lon] = cellToLatLng(cell);
      focus = { lat, lon };
    } catch {
      focus = undefined;
    }
    // Resolve the shared cell in a microtask so the fetch/setState runs after
    // the effect body, not synchronously within it.
    void Promise.resolve().then(() => openCell(cell, focus));
  }, [phase, openCell]);

  const onGeoPick = useCallback(
    (pick: { lat: number; lon: number; h3: string; label: string }) => {
      void openCell(pick.h3, { lat: pick.lat, lon: pick.lon }, pick.label);
    },
    [openCell],
  );

  const closeReport = useCallback(() => {
    setReport(null);
    setReportNote(null);
    setFocusPoint(null);
    setUrlCell(null);
  }, [setUrlCell]);

  const toggleZone = useCallback((zone: Zone) => {
    setHiddenZones((prev) => {
      const next = new Set(prev);
      if (next.has(zone)) next.delete(zone);
      else next.add(zone);
      return next;
    });
  }, []);

  const published = config?.published ?? null;

  return (
    <div className="drone-console h-full w-full">
      <div className="shell">
        <aside className="rail" aria-label="Explorer controls">
          <div>
            <h1 className="brand">
              Public Explorer
              <small>{config?.study_area.display_name ?? "Drone zoning guidance"}</small>
            </h1>
            <nav className="explore-nav" aria-label="Drone product navigation">
              <Link href="/drone">Overview</Link>
              <Link href="/drone/dashboard">Dashboard</Link>
              <Link href="/drone/console">Planning Console</Link>
            </nav>
          </div>

          <p className="explore-banner" role="note">
            <strong>Planning guidance, not flight authorization.</strong> This map
            supports planning. It does not grant permission to fly — GCAA approval,
            temporary restrictions, weather, and operator qualifications still apply.
          </p>

          <GeoSearch
            onPick={onGeoPick}
            disabled={phase !== "ready"}
            placeholder="Search for drone-zone guidance"
          />

          {reportNote && (
            <p className={`statusline${reportNote.error ? " error" : ""}`} role="status">
              {reportNote.text}
            </p>
          )}

          <section aria-label="Zone legend">
            <p className="sectionlabel">Zones</p>
            <ul className="explore-legend">
              {ZONE_ORDER.map((zone) => {
                const hidden = hiddenZones.has(zone);
                return (
                  <li key={zone}>
                    <button
                      type="button"
                      className="explore-legend-row"
                      aria-pressed={!hidden}
                      onClick={() => toggleZone(zone)}
                      disabled={phase !== "ready"}
                    >
                      <span
                        className="swatch"
                        style={{ background: ZONE_FILL[zone], opacity: hidden ? 0.25 : 1 }}
                        aria-hidden="true"
                      />
                      <span className={hidden ? "muted" : undefined}>{ZONE_LABELS[zone]}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          {published && (
            <section aria-label="Publication details" className="explore-meta">
              <p className="sectionlabel">Published data</p>
              <p>Published {formatDate(published.published_at)}</p>
              <p className="muted">Methodology {published.methodology_version}</p>
            </section>
          )}
          <ReferenceLayerControls
            definitions={reference.definitions}
            enabled={reference.enabled}
            loading={reference.loading}
            errors={reference.errors}
            zoom={reference.zoom}
            onToggle={reference.toggle}
            onZoomRequest={(key, zoom) => setZoomRequest((previous) => ({
              id: (previous?.id ?? 0) + 1,
              key,
              zoom,
            }))}
          />
        </aside>

        <div className="mapwrap">
          <MapView
            geojson={geojson}
            geometryMode="dissolved"
            hiddenZones={hiddenZones}
            loading={phase === "loading"}
            focusPoint={focusPoint}
            fitBoundsKey={published?.published_at ?? null}
            referenceLayers={reference.visible}
            onZoomChange={reference.setZoom}
            zoomRequest={zoomRequest}
          />

          {phase === "unavailable" && (
            <div className="map-overlay map-overlay--empty" role="status">
              <div className="map-overlay-card">
                <strong>No published zoning yet</strong>
                <span>
                  Guidance for this study area has not been published.
                </span>
                {appRole === "admin" || appRole === "analyst" ? (
                  <>
                    <span>
                      Generate a zoning run in the Planning Console
                      {appRole === "admin"
                        ? ", then approve and publish it here."
                        : ". An administrator must approve and publish the result."}
                    </span>
                    <Link className="btn map-overlay-action" href="/drone/console">
                      Create zoning run
                    </Link>
                  </>
                ) : (
                  <>
                    <span>
                      Authorized staff can generate a run in the Planning Console.
                    </span>
                    <Link
                      className="btn map-overlay-action"
                      href="/login?next=/drone/console"
                    >
                      Staff sign in
                    </Link>
                  </>
                )}
              </div>
            </div>
          )}

          {phase === "error" && (
            <div className="map-overlay" role="alert">
              <div className="map-overlay-card">
                <strong>Couldn’t load the map</strong>
                <span>{error ?? "The service is unavailable right now."}</span>
                <button type="button" className="btn" onClick={() => void load()}>
                  Try again
                </button>
              </div>
            </div>
          )}

          {report && <PublicReportDrawer report={report} onClose={closeReport} />}
        </div>
      </div>
    </div>
  );
}
