"use client";

/** components/ReportDrawer.tsx — the methodology's location report, rendered. */

import { LocationReport, Zone } from "@/lib/droneApi";

const ZONE_COLORS: Record<Zone, string> = {
  PROHIBITED: "var(--z-prohibited)",
  RESTRICTED: "var(--z-restricted)",
  CONDITIONAL: "var(--z-conditional)",
  SUITABLE: "var(--z-suitable)",
};

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
}) {
  const r = props.report;
  const factors = Object.entries(r.factor_breakdown ?? {});

  return (
    <div className="drawer" role="dialog" aria-label="Location report">
      <button className="closebtn" onClick={props.onClose} aria-label="Close report">
        ✕
      </button>
      <h2>Location report</h2>
      <span className="zone-chip" style={{ background: ZONE_COLORS[r.zone] }}>
        {r.zone}
      </span>

      <dl>
        <dt>Main reason</dt>
        <dd>{r.main_reason}</dd>

        <dt>Guidance</dt>
        <dd>{r.authorization_note}</dd>

        {r.risk_score !== null && (
          <>
            <dt>Weighted risk score</dt>
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
            <dt>Factor breakdown</dt>
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

        <dt>Data confidence</dt>
        <dd>{r.data_confidence.replace("_", " ")}</dd>

        <dt>Cell</dt>
        <dd style={{ fontVariantNumeric: "tabular-nums" }}>{r.h3_index}</dd>
      </dl>

      <p className="disclaimer">{r.disclaimer}</p>
    </div>
  );
}
