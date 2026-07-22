"use client";

/** app/drone/page.tsx — Zoning console. Rail (controls) + map + report drawer. */

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { droneApi as api, FactorWeight, RunStats, RunSummary, LocationReport, Zone, type ViewportSnapshot } from "@/lib/droneApi";
import { createClient, isSupabaseConfigured } from "@/utils/supabase/client";
import ControlRail from "@/components/drone/ControlRail";
import ReportDrawer from "@/components/drone/ReportDrawer";
import GuideDialog from "@/components/drone/GuideDialog";
import { MapDisplayMode } from "@/components/drone/SensitivityPanel";
import { useSensitivity } from "@/lib/useSensitivity";

const GUIDE_SEEN_KEY = "drone.guideSeen.v1";

// Leaflet touches `window`; render map client-side only.
const MapView = dynamic(() => import("@/components/drone/MapView"), { ssr: false });

const CONSOLE_ROLES = new Set(["viewer", "analyst", "admin"]);

export default function Page() {
  const router = useRouter();
  const localAuthBypass =
    !isSupabaseConfigured && process.env.NODE_ENV !== "production";
  const [authorized, setAuthorized] = useState(localAuthBypass);

  useEffect(() => {
    if (localAuthBypass) return;
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data, error }) => {
      if (error || !data.user) {
        router.replace("/login?next=/drone");
        return;
      }
      if (!CONSOLE_ROLES.has(data.user.app_metadata.app_role)) {
        router.replace("/login?error=role");
        return;
      }
      setAuthorized(true);
    });
  }, [localAuthBypass, router]);

  if (!authorized) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f5f5f0] text-sm text-[#53645b]">
        Checking access…
      </main>
    );
  }

  const signOut = isSupabaseConfigured
    ? async () => {
        await createClient().auth.signOut();
        router.replace("/login");
      }
    : undefined;

  return <Console onSignOut={signOut} />;
}

function Console({ onSignOut }: { onSignOut?: () => Promise<void> }) {
  const [factors, setFactors] = useState<FactorWeight[]>([]);
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [activeRun, setActiveRun] = useState<string | null>(null);
  const [stats, setStats] = useState<RunStats | null>(null);
  const [geojson, setGeojson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [report, setReport] = useState<LocationReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ text: string; error?: boolean }>({ text: "" });
  const [hiddenZones, setHiddenZones] = useState<Set<Zone>>(new Set());
  const [displayMode, setDisplayMode] = useState<MapDisplayMode>("zones");
  const [focusPoint, setFocusPoint] = useState<{ lat: number; lon: number } | null>(null);
  const [exporting, setExporting] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  // Monotonic guard: only the most recent selectRun may write results, so
  // fast run switches can't render an earlier response over a later one.
  const loadSeq = useRef(0);

  // Populated by MapView with a reader for the live map extent (the export
  // contract). Reads current bbox + zoom on demand; never triggers re-renders.
  const viewportRef = useRef<(() => ViewportSnapshot) | null>(null);

  const sensitivity = useSensitivity(activeRun);

  // First visit: auto-open the plain-language guide once, then remember it.
  // Read in an effect (not render) so SSR and first client render agree.
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (!localStorage.getItem(GUIDE_SEEN_KEY)) setGuideOpen(true);
    } catch {
      /* storage blocked — skip the auto-open, the button still works */
    }
  }, []);

  const openGuide = useCallback(() => setGuideOpen(true), []);
  const closeGuide = useCallback(() => {
    setGuideOpen(false);
    try {
      localStorage.setItem(GUIDE_SEEN_KEY, "1");
    } catch {
      /* ignore */
    }
  }, []);

  const refreshConfig = useCallback(async () => {
    try {
      const [f, r] = await Promise.all([api.getFactors(), api.listRuns()]);
      setFactors(f);
      setRuns(r);
      return r;
    } catch (e) {
      setStatus({ text: `Backend unreachable — ${String(e)}`, error: true });
      return [];
    }
  }, []);

  const selectRun = useCallback(async (runId: string) => {
    const seq = ++loadSeq.current;
    setBusy(true);
    setReport(null);
    setFocusPoint(null);
    setDisplayMode("zones");
    setHiddenZones(new Set());
    setStatus({ text: "Loading results…" });
    try {
      const [fc, detail] = await Promise.all([
        api.getRunGeoJSON(runId),
        api.getRunStats(runId),
      ]);
      if (seq !== loadSeq.current) return; // superseded by a newer selection
      setGeojson(fc);
      setStats(detail.stats ?? null);
      setActiveRun(runId);
      setStatus({ text: "" });
    } catch (e) {
      if (seq !== loadSeq.current) return;
      setStatus({ text: String(e), error: true });
    } finally {
      if (seq === loadSeq.current) setBusy(false);
    }
  }, []);

  // initial load: config + most recent completed run
  useEffect(() => {
    (async () => {
      const r = await refreshConfig();
      const latest = r.find((x) => x.status === "complete");
      if (latest) await selectRun(latest.run_id);
    })();
  }, [refreshConfig, selectRun]);

  const runModel = useCallback(
    async (label: string, overrides?: Record<string, number>) => {
      setBusy(true);
      setStatus({ text: "Running model — scoring 19,471 cells…" });
      try {
        const result = await api.createRun(label, overrides);
        setStatus({ text: "Run complete." });
        await refreshConfig();
        await selectRun(result.run_id);
      } catch (e) {
        setStatus({ text: String(e), error: true });
        setBusy(false);
      }
    },
    [refreshConfig, selectRun]
  );

  const onCellClick = useCallback(
    async (h3: string) => {
      if (!activeRun) return;
      try {
        setReport(await api.getLocationReport(activeRun, h3));
      } catch (e) {
        setStatus({ text: String(e), error: true });
      }
    },
    [activeRun]
  );

  const deleteRun = useCallback(
    async (runId: string) => {
      try {
        await api.deleteRun(runId);
        if (runId === activeRun) {
          // Resetting activeRun also tears down the sensitivity poll (the hook
          // keys on it) and clears the drawer — the domino guard for deletion.
          setActiveRun(null);
          setGeojson(null);
          setStats(null);
          setReport(null);
        }
        await refreshConfig();
        setStatus({ text: "Run deleted." });
      } catch (e) {
        setStatus({ text: String(e), error: true });
      }
    },
    [activeRun, refreshConfig]
  );

  const onGeoPick = useCallback(
    async (pick: { lat: number; lon: number; h3: string; label: string }) => {
      setFocusPoint({ lat: pick.lat, lon: pick.lon });
      if (!activeRun) {
        setStatus({ text: "Select a run first to see its zoning at that location.", error: true });
        return;
      }
      try {
        setReport(await api.getLocationReport(activeRun, pick.h3));
        setStatus({ text: `Showing zoning at ${pick.label}.` });
      } catch {
        // report endpoint 404s for cells outside the grid.
        setReport(null);
        setStatus({
          text: `"${pick.label}" is outside the covered zoning area (Region 4).`,
          error: true,
        });
      }
    },
    [activeRun]
  );

  const exportView = useCallback(
    async (
      format: "png" | "svg" | "pdf",
      scale: number,
      showBoundary: boolean,
      name: string,
    ) => {
      if (!activeRun) {
        setStatus({ text: "Select a run before exporting.", error: true });
        return;
      }
      const reader = viewportRef.current;
      if (!reader) {
        setStatus({ text: "Map isn't ready yet — try again in a moment.", error: true });
        return;
      }
      const { bbox, zoom } = reader();
      // Volatility export needs the completed sweep; fall back to zones otherwise.
      const useVolatility =
        displayMode === "volatility" &&
        sensitivity.phase === "complete" &&
        !!sensitivity.status?.sweep_id;
      setExporting(true);
      setStatus({ text: "Rendering export…" });
      try {
        const { blob, filename } = await api.exportView(activeRun, {
          bbox,
          zoom,
          format,
          scale,
          display_mode: useVolatility ? "volatility" : "zones",
          sweep_id: useVolatility ? sensitivity.status!.sweep_id : null,
          hidden_zones: useVolatility ? null : Array.from(hiddenZones),
          show_boundary: showBoundary,
        });
        // A user-supplied name overrides the server filename for the download.
        // Sanitise to a safe base and force the correct extension.
        const downloadName = (() => {
          const clean = name
            .trim()
            .replace(/\.[a-z0-9]+$/i, "") // drop any extension the user typed
            .replace(/[^a-z0-9 _-]+/gi, "-") // strip path/illegal chars
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 80);
          return clean ? `${clean}.${format}` : filename;
        })();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = downloadName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        setStatus({ text: `Exported ${downloadName}.` });
      } catch (e) {
        setStatus({ text: `Export failed — ${String(e)}`, error: true });
      } finally {
        setExporting(false);
      }
    },
    [activeRun, displayMode, hiddenZones, sensitivity.phase, sensitivity.status]
  );

  const toggleZone = useCallback((zone: Zone) => {
    setHiddenZones((prev) => {
      const next = new Set(prev);
      if (next.has(zone)) next.delete(zone);
      else next.add(zone);
      return next;
    });
  }, []);

  // Volatility lookup for the drawer: undefined = no completed sweep,
  // null = sweep exists but this cell is constraint-locked.
  const reportVolatility =
    report && sensitivity.phase === "complete" && sensitivity.volatilityByH3
      ? sensitivity.volatilityByH3.get(report.h3_index) ?? null
      : undefined;

  return (
    <div className="drone-console h-full w-full">
      <GuideDialog open={guideOpen} onClose={closeGuide} />
      <div className="shell">
        <ControlRail
          onOpenGuide={openGuide}
          onSignOut={onSignOut}
          factors={factors}
          runs={runs}
          activeRun={activeRun}
          stats={stats}
          busy={busy}
          status={status}
          hiddenZones={hiddenZones}
          sensitivityPhase={sensitivity.phase}
          sensitivityStatus={sensitivity.status}
          sensitivityError={sensitivity.error}
          displayMode={displayMode}
          onRunModel={runModel}
          onSelectRun={selectRun}
          onDeleteRun={deleteRun}
          onToggleZone={toggleZone}
          onTriggerSensitivity={sensitivity.trigger}
          onDisplayMode={setDisplayMode}
          onGeoPick={onGeoPick}
          onExport={exportView}
          exporting={exporting}
        />
        <div className="mapwrap">
          <MapView
            geojson={geojson}
            onCellClick={onCellClick}
            displayMode={displayMode}
            volatilityByH3={sensitivity.volatilityByH3}
            hiddenZones={hiddenZones}
            loading={busy}
            focusPoint={focusPoint}
            viewportRef={viewportRef}
          />
          {report && (
            <ReportDrawer
              report={report}
              onClose={() => setReport(null)}
              volatility={reportVolatility}
              totalPerturbations={sensitivity.status?.total_runs}
            />
          )}
        </div>
      </div>
    </div>
  );
}
