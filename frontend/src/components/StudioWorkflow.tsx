"use client";

import { useState } from "react";

import type { ExportSettings, PosterSettings } from "./ControlPanel";

type StudioWorkflowProps = {
  settings: PosterSettings;
  exportSettings: ExportSettings;
};

const STEPS = [
  "Choose geography",
  "Choose density and classification",
  "Choose visual style",
  "Configure typography and metadata",
  "Preview",
  "Export",
];

export default function StudioWorkflow({ settings, exportSettings }: StudioWorkflowProps) {
  const [copied, setCopied] = useState(false);
  const activeStep = !settings.geography_id ? 1 : 5;

  const copyConfiguration = async () => {
    const configuration = JSON.stringify({ settings, export: exportSettings }, null, 2);
    await navigator.clipboard.writeText(configuration);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <section className="rounded-md border border-[var(--ui-border)] bg-[var(--ui-surface-muted)] p-3" aria-labelledby="workflow-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="workflow-title" className="section-header !mb-0">Poster workflow</h2>
        <button type="button" onClick={() => void copyConfiguration()} className="text-[10px] font-semibold text-[var(--ui-action)] hover:underline">
          {copied ? "Copied setup" : "Copy setup"}
        </button>
      </div>
      <ol className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-[var(--ui-text-muted)]">
        {STEPS.map((step, index) => {
          const number = index + 1;
          return <li key={step} className={number === activeStep ? "font-semibold text-[var(--ui-text)]" : ""}><span className="mr-1 font-mono text-[var(--ui-action)]">{String(number).padStart(2, "0")}</span>{step}</li>;
        })}
      </ol>
      <p className="mt-2 text-[10px] leading-relaxed text-[var(--ui-text-muted)]">{settings.geography_id ? `Preview and export use the current ${exportSettings.export_format.toUpperCase()} configuration.` : "Select a supported geography to begin rendering."}</p>
    </section>
  );
}
