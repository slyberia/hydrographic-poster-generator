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

// Leaflet touches `window`; render the map client-side only.
const MapView = dynamic(() => import("@/components/drone/MapView"), { ssr: false });

const ZONE_ORDER: Zone[] = ["PROHIBITED", "RESTRICTED", "CONDITIONAL", "SUITABLE"];

type Phase = "loading" | "ready" | "unavailable" | "error";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
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
      const geo = await publicDroneApi.getZoning();
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

  const onCellClick = useCallback((h3: string) => void openCell(h3), [openCell]);

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
              <Link href="/drone/methodology">Methodology</Link>
            </nav>
          </div>

          <p className="explore-banner" role="note">
            <strong>Planning guidance, not flight authorization.</strong> This map
            supports planning. It does not grant permission to fly — GCAA approval,
            temporary restrictions, weather, and operator qualifications still apply.
          </p>

          <GeoSearch onPick={onGeoPick} disabled={phase !== "ready"} />

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
        </aside>

        <div className="mapwrap">
          <MapView
            geojson={geojson}
            onCellClick={onCellClick}
            hiddenZones={hiddenZones}
            loading={phase === "loading"}
            focusPoint={focusPoint}
          />

          {phase === "unavailable" && (
            <div className="map-overlay map-overlay--empty" role="status">
              <div className="map-overlay-card">
                <strong>No published zoning yet</strong>
                <span>
                  Guidance for this study area hasn’t been published. Check back once
                  an approved run is available.
                </span>
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
