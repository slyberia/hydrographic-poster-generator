"use client";

/** components/ControlRail.tsx — left rail: identity, zone strip, weights, runs. */

import { useState } from "react";
import { FactorWeight, RunStats, RunSummary, Zone } from "@/lib/droneApi";

const ZONE_COLORS: Record<Zone, string> = {
  PROHIBITED: "var(--z-prohibited)",
  RESTRICTED: "var(--z-restricted)",
  CONDITIONAL: "var(--z-conditional)",
  SUITABLE: "var(--z-suitable)",
};

const ZONE_LABELS: Record<Zone, string> = {
  PROHIBITED: "Prohibited · no-fly",
  RESTRICTED: "Restricted · authorization",
  CONDITIONAL: "Conditional · caution",
  SUITABLE: "Suitable · lower risk",
};

function ZoneStrip({ stats }: { stats: RunStats | null }) {
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
            style={{ flex: `${z.pct} 0 0`, background: ZONE_COLORS[z.zone] }}
          />
        ))}
      </div>
      <div className="zonestrip-rows">
        {stats.zones.map((z) => (
          <div className="zonestrip-row" key={z.zone}>
            <span className="swatch" style={{ background: ZONE_COLORS[z.zone] }} />
            <span className="zname">{ZONE_LABELS[z.zone]}</span>
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
  onRunModel: (label: string, overrides?: Record<string, number>) => void;
  onSaveWeight: (key: string, weight: number) => void;
  onSelectRun: (runId: string) => void;
}) {
  const { factors, runs, activeRun, stats, busy, status } = props;
  const [label, setLabel] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const draftValue = (f: FactorWeight) =>
    drafts[f.factor_key] ?? String(f.raw_weight);

  const commitWeight = (f: FactorWeight) => {
    const v = parseFloat(draftValue(f));
    if (!Number.isNaN(v) && v >= 0 && v !== f.raw_weight) {
      props.onSaveWeight(f.factor_key, v);
    }
  };

  return (
    <aside className="rail">
      <header>
        <h1 className="brand">
          Drone Airspace Zoning
          <small>Region 4 · Demerara-Mahaica · decision-support prototype</small>
        </h1>
      </header>

      <ZoneStrip stats={stats} />

      <section aria-label="Run model">
        <p className="sectionlabel">Run model</p>
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
          onClick={() => props.onRunModel(label || "unlabelled run")}
        >
          {busy ? "Scoring cells…" : "Run zoning model"}
        </button>
        <p className={`statusline${status.error ? " error" : ""}`} role="status">
          {status.text}
        </p>
      </section>

      <section aria-label="Factor weights">
        <p className="sectionlabel">Factor weights (AHP · provisional)</p>
        {factors.map((f) => (
          <div className="weightrow" key={f.factor_key}>
            <div>
              <label htmlFor={`w-${f.factor_key}`}>{f.factor_name}</label>
              <div className="norm">normalised {f.normalised_weight}</div>
            </div>
            <input
              id={`w-${f.factor_key}`}
              type="number"
              min={0}
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
        {runs.map((r) => (
          <button
            key={r.run_id}
            className="runitem"
            aria-pressed={r.run_id === activeRun}
            onClick={() => props.onSelectRun(r.run_id)}
            disabled={r.status !== "complete"}
          >
            <span className="rlabel">{r.label ?? "unlabelled"}</span>
            <span className="rmeta">
              {r.status} · {new Date(r.created_at).toLocaleString()}
            </span>
          </button>
        ))}
      </section>
    </aside>
  );
}
