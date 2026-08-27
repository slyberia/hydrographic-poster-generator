type CapabilityPreviewProps = {
  kind: "scenario" | "workspace" | "map" | "export";
};

const FACTORS = [
  ["Population", "74%"],
  ["Airspace", "58%"],
  ["Environment", "42%"],
] as const;

export default function CapabilityPreview({ kind }: CapabilityPreviewProps) {
  if (kind === "scenario") {
    return (
      <div className="cap-screen cap-screen--scenario" role="img" aria-label="Planning Console scenario controls with provisional factor weights">
        <div className="cap-screen__bar"><span>Scenario</span><b>Draft</b></div>
        <div className="cap-scenario-layout">
          <div className="cap-mini-rail" aria-hidden="true"><i /><i /><i /><i /></div>
          <div className="cap-factor-list">
            {FACTORS.map(([label, width]) => (
              <div className="cap-factor" key={label}>
                <span>{label}</span><em><i style={{ width }} /></em>
              </div>
            ))}
          </div>
        </div>
        <small>Provisional weights · next model run</small>
      </div>
    );
  }

  if (kind === "workspace") {
    return (
      <div className="cap-screen cap-screen--workspace" role="img" aria-label="Planning Console run governance workspace">
        <div className="cap-screen__bar"><span>Run workspace</span><b>Admin</b></div>
        <div className="cap-run cap-run--selected"><span><strong>Region 4 baseline</strong><small>19,471 cells</small></span><em>Published</em></div>
        <div className="cap-run"><span><strong>Urban sensitivity</strong><small>Review complete</small></span><em>Approved</em></div>
        <div className="cap-run"><span><strong>Airport context</strong><small>Draft scenario</small></span><em>Draft</em></div>
      </div>
    );
  }

  if (kind === "map") {
    return (
      <div className="cap-screen cap-screen--map" role="img" aria-label="Published dissolved zoning map with a location explanation">
        <svg className="cap-map-shapes" viewBox="0 0 320 150" aria-hidden="true" preserveAspectRatio="none">
          <path className="cap-zone cap-zone--suitable" d="M0 0H170L145 48L84 70L0 52Z" />
          <path className="cap-zone cap-zone--conditional" d="M170 0H320V64L238 82L145 48Z" />
          <path className="cap-zone cap-zone--restricted" d="M0 52L84 70L145 48L238 82L204 150H0Z" />
          <path className="cap-zone cap-zone--prohibited" d="M238 82L320 64V150H204Z" />
        </svg>
        <div className="cap-map-legend" aria-hidden="true"><i /><i /><i /><i /></div>
        <div className="cap-map-report"><span>Selected location</span><strong>Conditional</strong><small>View explanation →</small></div>
      </div>
    );
  }

  return (
    <div className="cap-screen cap-screen--export" role="img" aria-label="Planning Console output panel with map and GeoJSON export choices">
      <div className="cap-screen__bar"><span>Export current view</span><b>Ready</b></div>
      <div className="cap-export-layout">
        <div className="cap-document" aria-hidden="true"><i /><i /><i /><span>Region 4</span></div>
        <div className="cap-format-list">
          <span><b>PNG</b><small>Raster map</small></span>
          <span><b>PDF</b><small>Print output</small></span>
          <span className="cap-format-active"><b>GeoJSON</b><small>Dissolved layer</small></span>
        </div>
      </div>
      <small>Current view or full approved run</small>
    </div>
  );
}
