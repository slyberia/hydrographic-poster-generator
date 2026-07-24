"use client";

/** components/ReportDrawer.tsx — the methodology's location report, rendered. */

import { useEffect } from "react";
import { LocationReport, VolatilityRecord } from "@/lib/droneApi";
import { VOLATILITY_FILL, ZONE_CSS } from "@/lib/zoneTheme";
import InfoTip from "@/components/drone/InfoTip";
import { CONFIDENCE_INFO, REPORT_INFO } from "@/lib/droneInfo";

const FACTOR_NAMES: Record<string, string> = {
  population: "Population density",
  land_use: "Land use / cover",
  infrastructure_sensitive: "Infrastructure & sensitive sites",
  environmental: "Environmental",
  airspace_activity: "Airspace activity",
  regulatory: "Regulatory",
};

export default function ReportDrawer(props: {
  report: LocationReport;
  onClose: () => void;
  /** Volatility for this cell, when a completed sweep exists for the active run.
   * null = sweep exists but cell is constraint-locked; undefined = no sweep. */
  volatility?: VolatilityRecord | null;
  totalPerturbations?: number;
}) {
  const r = props.report;
  const factors = Object.entries(r.factor_breakdown ?? {});
  const hasSweep = props.volatility !== undefined;

  // Escape closes the report — quicker than reaching for the ✕ after a click.
  const { onClose } = props;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="drawer" role="dialog" aria-label="Location report">
      <button className="closebtn" onClick={props.onClose} aria-label="Close report">
        ✕
      </button>
      <h2>Location report</h2>
      <span className="zone-chip" style={{ background: ZONE_CSS[r.zone] }}>
        {r.zone}
      </span>

      <dl>
        <dt>Main reason</dt>
        <dd>{r.main_reason}</dd>

        <dt>Guidance</dt>
        <dd>{r.authorization_note}</dd>

        {r.risk_score !== null && (
          <>
            <dt>
              Weighted risk score
              <InfoTip text={REPORT_INFO.risk_score} label="What the weighted risk score means" />
            </dt>
            <dd>{r.risk_score.toFixed(2)} / 5</dd>
          </>
        )}

        {r.constraint_reasons.length > 0 && (
          <>
            <dt>Active constraints</dt>
            <dd>
              {r.constraint_reasons.map((c) => (
                <div key={c}>{c}</div>
              ))}
            </dd>
          </>
        )}

        {factors.length > 0 && (
          <>
            <dt>
              Factor breakdown
              <InfoTip text={REPORT_INFO.factor_breakdown} label="What score × weight means" />
            </dt>
            <dd>
              {factors.map(([key, f]) => (
                <div className="factorline" key={key}>
                  <span>{FACTOR_NAMES[key] ?? key}</span>
                  <span title={f.reason} className="fscore">
                    {f.score} × {f.weight}
                  </span>
                </div>
              ))}
            </dd>
          </>
        )}

        {hasSweep && (
          <>
            <dt>
              Stability
              <InfoTip text={REPORT_INFO.stability} label="What stability, σ and zone flips mean" />
            </dt>
            <dd>
              {props.volatility ? (
                <>
                  <span
                    className="zone-chip"
                    style={{
                      background: VOLATILITY_FILL[props.volatility.volatility_category],
                    }}
                  >
                    {props.volatility.volatility_category}
                  </span>{" "}
                  σ {props.volatility.stddev.toFixed(3)} ·{" "}
                  {props.volatility.zone_flips}
                  {props.totalPerturbations
                    ? ` / ${props.totalPerturbations}`
                    : ""}{" "}
                  zone flips under ±weight perturbation
                </>
              ) : (
                "Constraint-locked — not affected by weight changes."
              )}
            </dd>
          </>
        )}

        <dt>
          Data confidence
          {CONFIDENCE_INFO[r.data_confidence.toLowerCase()] && (
            <InfoTip
              text={CONFIDENCE_INFO[r.data_confidence.toLowerCase()]}
              label="What data confidence means"
            />
          )}
        </dt>
        <dd>{r.data_confidence.replace("_", " ")}</dd>

        <dt>Cell</dt>
        <dd style={{ fontVariantNumeric: "tabular-nums" }}>{r.h3_index}</dd>
      </dl>

      <p className="disclaimer">{r.disclaimer}</p>
    </div>
  );
}
