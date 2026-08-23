"use client";

import type { ReferenceLayerDefinition } from "@/lib/publicDroneApi";
import { scaleLabelForZoom, type ReferenceLayerKey } from "@/lib/referenceLayers";

export default function ReferenceLayerControls(props: {
  definitions: ReferenceLayerDefinition[];
  enabled: Set<ReferenceLayerKey>;
  loading: Set<string>;
  errors?: Record<string, string>;
  zoom: number;
  onToggle: (key: ReferenceLayerKey) => void;
  onZoomRequest?: (key: ReferenceLayerKey, zoom: number) => void;
  compact?: boolean;
}) {
  const groups = ["aviation", "infrastructure"] as const;
  return (
    <section aria-label="Reference map layers" className="reference-controls">
      <div className="reference-heading">
        <p className="sectionlabel">Map layers</p>
        <span className="reference-current-zoom" aria-label={`Current map zoom ${props.zoom}`}>Z{props.zoom}</span>
      </div>
      <p className="fieldhint reference-scale-note">
        Context layers appear from their listed zoom onward. Select a Z-level to move the map there.
      </p>
      {groups.map((group) => {
        const defs = props.definitions.filter((d) => d.group === group);
        if (!defs.length) return null;
        return (
          <div key={group} className="reference-group">
            <p className="fieldhint">{group === "aviation" ? "Aviation" : "Infrastructure"}</p>
            {defs.map((def) => {
              const key = def.key as ReferenceLayerKey;
              const unavailable = def.available === false;
              const checked = props.enabled.has(key);
              const below = props.zoom < def.min_zoom;
              return (
                <div key={def.key} className={`reference-row${below && checked ? " is-below-scale" : ""}`}>
                  <label className="reference-toggle">
                    <input type="checkbox" checked={checked && !unavailable} disabled={unavailable} onChange={() => props.onToggle(key)} />
                    <span>{def.display_name}</span>
                  </label>
                  {!unavailable && props.onZoomRequest ? (
                    <button
                      type="button"
                      className="reference-zoom-target"
                      onClick={() => props.onZoomRequest?.(key, def.min_zoom)}
                      title={`Move map to zoom ${def.min_zoom}, ${scaleLabelForZoom(def.min_zoom).toLowerCase()} scale`}
                      aria-label={`Zoom map to Z${def.min_zoom} to show ${def.display_name}`}
                    >
                      Z{def.min_zoom}+
                    </button>
                  ) : !unavailable ? (
                    <span className="reference-zoom-target is-static" title={`Visible from zoom ${def.min_zoom}`}>
                      Z{def.min_zoom}+
                    </span>
                  ) : null}
                  {unavailable && <small title={def.availability_note}>{def.availability_note ?? "Coming soon"}</small>}
                  {props.loading.has(def.key) && <small role="status">Loading…</small>}
                  {props.errors?.[def.key] && <small role="status">{props.errors[def.key]}</small>}
                </div>
              );
            })}
          </div>
        );
      })}
      {!props.compact && <p className="fieldhint">Reference layers provide context and do not change zoning.</p>}
    </section>
  );
}

