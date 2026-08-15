type CapabilityPreviewProps = {
  kind: "scenario" | "workspace" | "map" | "export";
};

export default function CapabilityPreview({ kind }: CapabilityPreviewProps) {
  if (kind === "scenario") {
    return <div className="capability-preview capability-preview--scenario" aria-label="Scenario controls preview">
      <div className="preview-topline"><span>Scenario controls</span><b>Draft</b></div>
      {["Population", "Airspace", "Environment"].map((label, index) => <div className="preview-slider" key={label}><span>{label}</span><i style={{ width: `${72 - index * 14}%` }} /></div>)}
      <small>Weights update the planning scenario.</small>
    </div>;
  }

  if (kind === "workspace") {
    return <div className="capability-preview capability-preview--workspace" aria-label="Role-based workspace preview">
      <div className="preview-topline"><span>Run workspace</span><b>Admin</b></div>
      <div className="preview-run"><span>Region 4 baseline</span><em>Published</em></div>
      <div className="preview-run"><span>Urban sensitivity</span><em>Review</em></div>
      <small>Manage access, runs, and publication.</small>
    </div>;
  }

  if (kind === "map") {
    return <div className="capability-preview capability-preview--map" aria-label="Interactive map analysis preview">
      <span className="preview-map-zone preview-map-zone--a" /><span className="preview-map-zone preview-map-zone--b" /><span className="preview-map-zone preview-map-zone--c" />
      <div className="preview-map-card"><b>Conditional</b><span>Location explanation</span></div>
      <small>Inspect a place and see why.</small>
    </div>;
  }

  return <div className="capability-preview capability-preview--export" aria-label="Reporting and export preview">
    <div className="preview-topline"><span>Planning brief</span><b>PDF</b></div>
    <div className="preview-report-line preview-report-line--title" />
    <div className="preview-report-line" /><div className="preview-report-line" /><div className="preview-report-line preview-report-line--short" />
    <div className="preview-export-row"><span>GeoJSON</span><span>Download</span></div>
  </div>;
}
