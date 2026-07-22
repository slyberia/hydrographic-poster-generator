"use client";

/** components/ControlRail.tsx — left rail: identity, zone strip, weights, runs,
 * sensitivity. */

import { useState } from "react";
import { FactorWeight, RunStats, RunSummary, SensitivityStatus, Zone } from "@/lib/droneApi";
import { ZONE_CSS, ZONE_LABELS } from "@/lib/zoneTheme";
import SensitivityPanel, { MapDisplayMode } from "@/components/drone/SensitivityPanel";
import { SweepPhase } from "@/lib/useSensitivity";
import InfoTip from "@/components/drone/InfoTip";
import GeoSearch from "@/components/drone/GeoSearch";
import { FACTOR_INFO, OPERATION_INFO, WEIGHTING_INFO } from "@/lib/droneInfo";

function ZoneStrip(props: {
  stats: RunStats | null;
  hiddenZones: Set<Zone>;
  onToggleZone: (zone: Zone) => void;
}) {
  const { stats, hiddenZones } = props;
  if (!stats) return null;
  return (
    <section className="zonestrip" aria-label="Zone distribution">
      <p className="sectionlabel">Region 4 zoning</p>
      <div className="zonestrip-bar" role="img"
           aria-label={stats.zones.map((z) => `${z.zone} ${z.pct}%`).join(", ")}>
        {stats.zones.map((z) => (
          <div
            key={z.zone}
            className="zonestrip-seg"
            style={{
              flex: `${z.pct} 0 0`,
              background: ZONE_CSS[z.zone],
              opacity: hiddenZones.has(z.zone) ? 0.25 : 1,
            }}
          />
        ))}
      </div>
      <div className="zonestrip-rows">
        {stats.zones.map((z) => (
          <div className="zonestrip-row" key={z.zone}>
            <input
              type="checkbox"
              id={`zv-${z.zone}`}
              className="zonevis"
              checked={!hiddenZones.has(z.zone)}
              onChange={() => props.onToggleZone(z.zone)}
              aria-label={`Show ${z.zone} cells on map`}
            />
            <label htmlFor={`zv-${z.zone}`} className="zonevis-label">
              <span className="swatch" style={{ background: ZONE_CSS[z.zone] }} />
              <span className="zname">{ZONE_LABELS[z.zone]}</span>
            </label>
            <span className="zpct">{z.pct}%</span>
            <span className="zarea">{z.area_km2.toLocaleString()} km²</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function ControlRail(props: {
  factors: FactorWeight[];
  runs: RunSummary[];
  activeRun: string | null;
  stats: RunStats | null;
  busy: boolean;
  status: { text: string; error?: boolean };
  hiddenZones: Set<Zone>;
  sensitivityPhase: SweepPhase;
  sensitivityStatus: SensitivityStatus | null;
  sensitivityError: string | null;
  displayMode: MapDisplayMode;
  onRunModel: (label: string, overrides?: Record<string, number>) => void;
  onSelectRun: (runId: string) => void;
  onDeleteRun: (runId: string) => void;
  onToggleZone: (zone: Zone) => void;
  onTriggerSensitivity: (delta: number) => void;
  onDisplayMode: (mode: MapDisplayMode) => void;
  onGeoPick: (pick: { lat: number; lon: number; h3: string; label: string }) => void;
  onExport: (
    format: "png" | "svg" | "pdf",
    scale: number,
    showBoundary: boolean,
    name: string,
  ) => void;
  exporting: boolean;
  onOpenGuide: () => void;
  onSignOut?: () => Promise<void>;
}) {
  const { factors, runs, activeRun, stats, busy, status } = props;
  const [label, setLabel] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [exportFormat, setExportFormat] = useState<"png" | "svg" | "pdf">("png");
  const [exportScale, setExportScale] = useState(2);
  const [showBoundary, setShowBoundary] = useState(false);
  const [exportName, setExportName] = useState("");

  const WEIGHT_MAX = 10;

  const draftValue = (f: FactorWeight) =>
    drafts[f.factor_key] ?? String(f.raw_weight);

  const clampWeight = (v: number) => Math.min(WEIGHT_MAX, Math.max(0, v));

  const commitWeight = (f: FactorWeight) => {
    const v = parseFloat(draftValue(f));
    const next = Number.isNaN(v) ? f.raw_weight : clampWeight(v);
    setDrafts((draft) => ({ ...draft, [f.factor_key]: String(next) }));
  };

  // Draft weights typed but not yet blurred/saved, so "Run zoning model" uses
  // exactly what's on screen (previously unsaved edits were silently dropped).
  const pendingOverrides = (): Record<string, number> | undefined => {
    const out: Record<string, number> = {};
    for (const f of factors) {
      const v = parseFloat(draftValue(f));
      if (!Number.isNaN(v)) out[f.factor_key] = clampWeight(v);
    }
    return Object.keys(out).length ? out : undefined;
  };

  const activeRunComplete =
    activeRun !== null &&
    runs.some((r) => r.run_id === activeRun && r.status === "complete");

  const factorNames = Object.fromEntries(
    factors.map((f) => [f.factor_key, f.factor_name])
  );

  return (
    <aside className="rail">
      <header>
        <h1 className="brand">
          Drone Airspace Zoning
          <small>Region 4 · Demerara-Mahaica · decision-support prototype</small>
        </h1>
      </header>

      <button type="button" className="helpbtn" onClick={props.onOpenGuide}>
        <span aria-hidden="true">ⓘ</span> How this console works
      </button>
      {props.onSignOut && (
        <button type="button" className="helpbtn" onClick={() => void props.onSignOut?.()}>
          Sign out
        </button>
      )}

      <ZoneStrip
        stats={stats}
        hiddenZones={props.hiddenZones}
        onToggleZone={props.onToggleZone}
      />

      <section aria-label="Run model">
        <p className="sectionlabel">
          Run model
          <InfoTip text={OPERATION_INFO.zoning.body} label="What Run zoning model does" />
        </p>
        <input
          type="text"
          placeholder="Run label (e.g. baseline)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          style={{
            width: "100%", font: "inherit", padding: "8px 10px",
            border: "1px solid var(--hairline)", borderRadius: "var(--radius)",
            marginBottom: 8, background: "var(--paper)", color: "var(--ink)",
          }}
        />
        <button
          className="btn"
          disabled={busy}
          onClick={() => props.onRunModel(label || "unlabelled run", pendingOverrides())}
        >
          {busy ? "Scoring cells…" : "Run zoning model"}
        </button>
        <p className={`statusline${status.error ? " error" : ""}`} role="status">
          {status.text}
        </p>
      </section>

      <section aria-label="Factor weights">
        <p className="sectionlabel">
          Scenario factor weights (AHP · provisional)
          <InfoTip
            text={`${WEIGHTING_INFO.scale} ${WEIGHTING_INFO.normalisation}`}
            label="How factor weights and normalisation work"
          />
        </p>
        <p className="fieldhint">
          0–10 scale · applied to the next run · organization defaults stay unchanged
        </p>
        {factors.map((f) => (
          <div className="weightrow" key={f.factor_key}>
            <div>
              <label htmlFor={`w-${f.factor_key}`}>
                {f.factor_name}
                {FACTOR_INFO[f.factor_key] && (
                  <InfoTip text={FACTOR_INFO[f.factor_key]} label={`About ${f.factor_name}`} />
                )}
              </label>
              <div className="norm">normalised {f.normalised_weight}</div>
            </div>
            <input
              id={`w-${f.factor_key}`}
              type="number"
              min={0}
              max={WEIGHT_MAX}
              step={0.01}
              value={draftValue(f)}
              onChange={(e) =>
                setDrafts((d) => ({ ...d, [f.factor_key]: e.target.value }))
              }
              onBlur={() => commitWeight(f)}
              onKeyDown={(e) => e.key === "Enter" && commitWeight(f)}
            />
          </div>
        ))}
      </section>

      <section aria-label="Previous runs">
        <p className="sectionlabel">Runs</p>
        {runs.length === 0 && (
          <p className="statusline">No runs yet — run the model to generate zoning.</p>
        )}
        {runs.map((r) => {
          const empty = r.status === "complete" && r.cell_count === 0;
          return (
            <div className="runrow" key={r.run_id}>
              <button
                className="runitem"
                aria-pressed={r.run_id === activeRun}
                onClick={() => props.onSelectRun(r.run_id)}
                disabled={r.status !== "complete"}
                title={empty ? "This run has no scored cells" : undefined}
              >
                <span className="rlabel">
                  {r.label ?? "unlabelled"}
                  {empty && <span className="rbadge">no results</span>}
                </span>
                <span className="rmeta">
                  {r.status} · {new Date(r.created_at).toLocaleString()}
                </span>
              </button>
              <button
                className="runitem-del"
                aria-label={`Delete run ${r.label ?? "unlabelled"}`}
                title="Delete run"
                onClick={() => {
                  if (
                    window.confirm(
                      `Delete "${r.label ?? "unlabelled"}"? This removes the run and any sensitivity results derived from it.`
                    )
                  ) {
                    props.onDeleteRun(r.run_id);
                  }
                }}
              >
                🗑
              </button>
            </div>
          );
        })}
      </section>

      <GeoSearch onPick={props.onGeoPick} disabled={busy} />

      <SensitivityPanel
        phase={props.sensitivityPhase}
        status={props.sensitivityStatus}
        error={props.sensitivityError}
        canTrigger={activeRunComplete && !busy}
        displayMode={props.displayMode}
        factorNames={factorNames}
        onTrigger={props.onTriggerSensitivity}
        onDisplayMode={props.onDisplayMode}
      />

      <section aria-label="Export">
        <p className="sectionlabel">
          Export current view
          <InfoTip text={OPERATION_INFO.export.body} label="What Export does" />
        </p>
        <div className="exportrow">
          <label htmlFor="export-format" className="exportlabel">Format</label>
          <select
            id="export-format"
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value as "png" | "svg" | "pdf")}
          >
            <option value="png">PNG (raster)</option>
            <option value="svg">SVG (vector)</option>
            <option value="pdf">PDF (print)</option>
          </select>
        </div>
        <div className="exportrow">
          <label htmlFor="export-scale" className="exportlabel">Resolution</label>
          <select
            id="export-scale"
            value={exportScale}
            onChange={(e) => setExportScale(Number(e.target.value))}
            disabled={exportFormat === "svg"}
            title={exportFormat === "svg" ? "SVG is resolution-independent" : undefined}
          >
            <option value={1}>1× (screen)</option>
            <option value={2}>2× (sharp)</option>
            <option value={4}>4× (poster)</option>
          </select>
        </div>
        <div className="exportrow exportrow--check">
          <input
            type="checkbox"
            id="export-boundary"
            checked={showBoundary}
            onChange={(e) => setShowBoundary(e.target.checked)}
          />
          <label htmlFor="export-boundary" className="exportlabel">
            Include Region 4 outline
          </label>
        </div>
        <label htmlFor="export-name" className="exportlabel exportname-label">
          File name <span className="exporthint">(optional)</span>
        </label>
        <input
          type="text"
          id="export-name"
          className="exportname-input"
          placeholder="e.g. georgetown-north-restricted"
          value={exportName}
          maxLength={80}
          onChange={(e) => setExportName(e.target.value)}
        />
        <button
          className="btn"
          disabled={!activeRunComplete || busy || props.exporting}
          onClick={() => props.onExport(exportFormat, exportScale, showBoundary, exportName)}
          title={
            !activeRunComplete
              ? "Select a completed run to export"
              : "Render what's on screen at the chosen resolution"
          }
        >
          {props.exporting ? "Rendering export…" : "Export current view"}
        </button>
      </section>
    </aside>
  );
}
