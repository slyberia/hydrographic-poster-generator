"use client";

/** components/SensitivityPanel.tsx — rail section: OAT sweep trigger, progress,
 * factor rankings, and the Zones | Volatility display-mode toggle. */

import { useState } from "react";
import { SensitivityStatus } from "@/lib/droneApi";
import { SweepPhase } from "@/lib/useSensitivity";
import {
  CONSTRAINT_LOCKED_FILL,
  CONSTRAINT_LOCKED_LABEL,
  VOLATILITY_FILL,
  VOLATILITY_LABELS,
} from "@/lib/zoneTheme";

const DELTA_CHOICES = [
  { label: "±5%", value: 0.05 },
  { label: "±10%", value: 0.1 },
  { label: "±20%", value: 0.2 },
];

export type MapDisplayMode = "zones" | "volatility";

export default function SensitivityPanel(props: {
  phase: SweepPhase;
  status: SensitivityStatus | null;
  error: string | null;
  canTrigger: boolean;
  displayMode: MapDisplayMode;
  factorNames: Record<string, string>;
  onTrigger: (delta: number) => void;
  onDisplayMode: (mode: MapDisplayMode) => void;
}) {
  const { phase, status, error, canTrigger, displayMode, factorNames } = props;
  const [delta, setDelta] = useState(0.1);

  const summary = status?.summary ?? null;

  return (
    <section aria-label="Sensitivity analysis">
      <p className="sectionlabel">Sensitivity (±weight sweep)</p>

      {(phase === "idle" || phase === "failed" || phase === "stalled") && (
        <>
          <div className="deltarow" role="radiogroup" aria-label="Perturbation size">
            {DELTA_CHOICES.map((c) => (
              <button
                key={c.value}
                className="deltabtn"
                role="radio"
                aria-checked={delta === c.value}
                onClick={() => setDelta(c.value)}
              >
                {c.label}
              </button>
            ))}
          </div>
          <button
            className="btn"
            disabled={!canTrigger}
            onClick={() => props.onTrigger(delta)}
          >
            {phase === "idle" ? "Run sensitivity analysis" : "Re-run sensitivity analysis"}
          </button>
          {phase === "failed" && (
            <p className="statusline error" role="status">
              Sweep failed{error ? ` — ${error}` : "."}
            </p>
          )}
          {phase === "stalled" && (
            <p className="statusline error" role="status">{error}</p>
          )}
        </>
      )}

      {phase === "running" && (
        <p className="statusline" role="status">
          Running {status ? `${status.completed_runs}/${status.total_runs}` : "…"}{" "}
          perturbation runs…
        </p>
      )}

      {phase === "complete" && status && (
        <>
          <p className="statusline" role="status">
            {summary
              ? `${summary.pct_cells_flipped}% of cells flipped zone at least once · ` +
                `${summary.total_zone_flips} flips total`
              : "Sweep complete."}
            {status.partial_results && " (partial results)"}
          </p>

          {summary && summary.factor_rankings.length > 0 && (
            <table className="ranktable">
              <thead>
                <tr>
                  <th scope="col">Factor</th>
                  <th scope="col">Δ</th>
                  <th scope="col">Flips</th>
                  <th scope="col">MAD</th>
                </tr>
              </thead>
              <tbody>
                {summary.factor_rankings.map((r) => (
                  <tr key={`${r.factor_key}-${r.direction}`}>
                    <td>{factorNames[r.factor_key] ?? r.factor_key}</td>
                    <td>{r.direction === "up" ? "+" : "−"}</td>
                    <td>{r.zone_flips}</td>
                    <td>{r.mean_absolute_deviation.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="modetoggle" role="radiogroup" aria-label="Map display mode">
            {(["zones", "volatility"] as const).map((m) => (
              <button
                key={m}
                className="deltabtn"
                role="radio"
                aria-checked={displayMode === m}
                onClick={() => props.onDisplayMode(m)}
              >
                {m === "zones" ? "Zones" : "Volatility"}
              </button>
            ))}
          </div>

          {displayMode === "volatility" && (
            <div className="vol-legend" aria-label="Volatility legend">
              {(Object.keys(VOLATILITY_FILL) as Array<keyof typeof VOLATILITY_FILL>).map(
                (cat) => (
                  <div className="zonestrip-row" key={cat}>
                    <span className="swatch" style={{ background: VOLATILITY_FILL[cat] }} />
                    <span className="zname">{VOLATILITY_LABELS[cat]}</span>
                  </div>
                )
              )}
              <div className="zonestrip-row">
                <span className="swatch" style={{ background: CONSTRAINT_LOCKED_FILL }} />
                <span className="zname">{CONSTRAINT_LOCKED_LABEL}</span>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
