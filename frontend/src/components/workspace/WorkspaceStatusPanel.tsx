"use client";

import { useEffect, useState } from "react";

import { type DashboardData, droneApi } from "@/lib/droneApi";
import {
  type ReferenceArtifactManifest,
  publicDroneApi,
} from "@/lib/publicDroneApi";

type StatusState = {
  dashboard: DashboardData | null;
  references: ReferenceArtifactManifest | null;
  dashboardFailed: boolean;
  referencesFailed: boolean;
};

const INITIAL_STATUS: StatusState = {
  dashboard: null,
  references: null,
  dashboardFailed: false,
  referencesFailed: false,
};

function formatDate(value: string | null | undefined): string {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function WorkspaceStatusPanel() {
  const [status, setStatus] = useState<StatusState>(INITIAL_STATUS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadStatus() {
      const [dashboardResult, referenceConfigResult] = await Promise.allSettled([
        droneApi.getDashboard(),
        publicDroneApi.getReferenceConfig(),
      ]);

      let references: ReferenceArtifactManifest | null = null;
      let referencesFailed = referenceConfigResult.status === "rejected";
      if (
        referenceConfigResult.status === "fulfilled" &&
        referenceConfigResult.value.manifest_url
      ) {
        try {
          references = await publicDroneApi.getReferenceManifest(
            referenceConfigResult.value.manifest_url,
          );
        } catch {
          referencesFailed = true;
        }
      }

      if (!active) return;
      setStatus({
        dashboard:
          dashboardResult.status === "fulfilled" ? dashboardResult.value : null,
        references,
        dashboardFailed: dashboardResult.status === "rejected",
        referencesFailed,
      });
      setLoading(false);
    }

    void loadStatus();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <p className="workspace-status-message" role="status">Loading operational status…</p>;
  }

  const { dashboard, references, dashboardFailed, referencesFailed } = status;
  const availableReferences = references?.layers.filter((layer) => layer.available).length;

  return (
    <div className="workspace-status-grid">
      <article className="workspace-status-card">
        <div className="workspace-status-card__heading">
          <p>Published zoning</p>
          <span className={dashboardFailed ? "is-warning" : "is-online"}>
            {dashboardFailed ? "Unavailable" : dashboard?.published ? "Published" : "No publication"}
          </span>
        </div>
        <strong>{formatDate(dashboard?.published?.published_at)}</strong>
        <p>
          {dashboard?.study_area?.display_name ?? "Study area unavailable"}
          {dashboard?.freshness.methodology_version
            ? ` · ${dashboard.freshness.methodology_version}`
            : ""}
        </p>
      </article>

      <article className="workspace-status-card">
        <div className="workspace-status-card__heading">
          <p>Analytical activity</p>
          <span className={dashboardFailed ? "is-warning" : "is-online"}>
            {dashboardFailed ? "Unavailable" : "Connected"}
          </span>
        </div>
        <strong>{formatDate(dashboard?.latest_run?.created_at)}</strong>
        <p>
          {dashboard?.latest_run
            ? `${dashboard.latest_run.label ?? "Unlabelled run"} · ${dashboard.latest_run.status}`
            : "No recorded model run"}
        </p>
      </article>

      <article className="workspace-status-card">
        <div className="workspace-status-card__heading">
          <p>Reference datasets</p>
          <span className={referencesFailed ? "is-warning" : "is-online"}>
            {referencesFailed ? "Unavailable" : references ? "Materialized" : "Dynamic"}
          </span>
        </div>
        <strong>{references ? `${references.artifact.feature_count.toLocaleString()} features` : "Manifest pending"}</strong>
        <p>
          {references
            ? `${availableReferences ?? 0} available layers · ${formatDate(references.generated_at)}`
            : "Reference metadata will appear when available."}
        </p>
      </article>
    </div>
  );
}
