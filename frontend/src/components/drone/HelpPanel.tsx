"use client";

/** components/drone/HelpPanel.tsx — collapsible "How this works" explainer.
 * Clarifies the two run actions (zoning vs sensitivity) in plain language. */

import { OPERATION_INFO } from "@/lib/droneInfo";

export default function HelpPanel() {
  return (
    <details className="helppanel">
      <summary>How this works</summary>
      <div className="helppanel-body">
        <p>
          <strong>{OPERATION_INFO.zoning.title}.</strong> {OPERATION_INFO.zoning.body}
        </p>
        <p>
          <strong>{OPERATION_INFO.sensitivity.title}.</strong>{" "}
          {OPERATION_INFO.sensitivity.body}
        </p>
      </div>
    </details>
  );
}
