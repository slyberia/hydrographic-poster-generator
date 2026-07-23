"use client";

/** components/drone/PublicReportDrawer.tsx — public-safe location guidance.
 *
 * Renders the /public/drone/report payload: plain-language classification,
 * primary reason, guidance, constraints, confidence, methodology version, and
 * the disclaimer. Deliberately shows NO numeric score and NO factor/weight
 * breakdown — those are internal-only (see the console's ReportDrawer). */

import { PublicReport } from "@/lib/publicDroneApi";
import { ZONE_CSS } from "@/lib/zoneTheme";

export default function PublicReportDrawer(props: {
  report: PublicReport;
  onClose: () => void;
}) {
  const r = props.report;

  return (
    <div className="drawer" role="dialog" aria-label="Location guidance">
      <button className="closebtn" onClick={props.onClose} aria-label="Close guidance">
        ✕
      </button>
      <h2>Location guidance</h2>
      <span className="zone-chip" style={{ background: ZONE_CSS[r.zone] }}>
        {r.classification}
      </span>

      <dl>
        <dt>Main reason</dt>
        <dd>{r.main_reason}</dd>

        <dt>Guidance</dt>
        <dd>{r.guidance}</dd>

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

        <dt>Data confidence</dt>
        <dd>{r.data_confidence.replace(/_/g, " ")}</dd>

        {r.methodology_version && (
          <>
            <dt>Methodology</dt>
            <dd>{r.methodology_version}</dd>
          </>
        )}

        <dt>Cell</dt>
        <dd style={{ fontVariantNumeric: "tabular-nums" }}>{r.h3_index}</dd>
      </dl>

      <p className="disclaimer">{r.disclaimer}</p>
    </div>
  );
}
