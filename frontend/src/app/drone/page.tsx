"use client";

/** app/drone/page.tsx — Zoning console. Rail (controls) + map + report drawer. */

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { droneApi as api, FactorWeight, RunStats, RunSummary, LocationReport, Zone } from "@/lib/droneApi";
import ControlRail from "@/components/drone/ControlRail";
import ReportDrawer from "@/components/drone/ReportDrawer";
import { MapDisplayMode } from "@/components/drone/SensitivityPanel";
import { useSensitivity } from "@/lib/useSensitivity";

// Leaflet touches `window`; render map client-side only.
const MapView = dynamic(() => import("@/components/drone/MapView"), { ssr: false });

export default function Page() {
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

  const sensitivity = useSensitivity(activeRun);

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
    setBusy(true);
    setReport(null);
    setDisplayMode("zones");
    setHiddenZones(new Set());
    setStatus({ text: "Loading results…" });
    try {
      const [fc, detail] = await Promise.all([
        api.getRunGeoJSON(runId),
        api.getRunStats(runId),
      ]);
      setGeojson(fc);
      setStats(detail.stats ?? null);
      setActiveRun(runId);
      setStatus({ text: "" });
    } catch (e) {
      setStatus({ text: String(e), error: true });
    } finally {
      setBusy(false);
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

  const saveWeight = useCallback(
    async (key: string, weight: number) => {
      try {
        const updated = await api.patchFactor(key, weight);
        setFactors(updated);
        setStatus({ text: `Saved weight for ${key}. Run the model to apply.` });
      } catch (e) {
        setStatus({ text: String(e), error: true });
      }
    },
    []
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
      <div className="shell">
        <ControlRail
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
          onSaveWeight={saveWeight}
          onSelectRun={selectRun}
          onToggleZone={toggleZone}
          onTriggerSensitivity={sensitivity.trigger}
          onDisplayMode={setDisplayMode}
        />
        <div className="mapwrap">
          <MapView
            geojson={geojson}
            onCellClick={onCellClick}
            displayMode={displayMode}
            volatilityByH3={sensitivity.volatilityByH3}
            hiddenZones={hiddenZones}
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
