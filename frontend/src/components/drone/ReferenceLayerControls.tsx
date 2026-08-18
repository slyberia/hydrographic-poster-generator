"use client";

import type { ReferenceLayerDefinition } from "@/lib/publicDroneApi";
import type { ReferenceLayerKey } from "@/lib/referenceLayers";

export default function ReferenceLayerControls(props: {
  definitions: ReferenceLayerDefinition[];
  enabled: Set<ReferenceLayerKey>;
  loading: Set<string>;
  errors?: Record<string, string>;
  zoom: number;
  onToggle: (key: ReferenceLayerKey) => void;
  compact?: boolean;
}) {
  const groups = ["aviation", "infrastructure"] as const;
  return (
    <section aria-label="Reference map layers" className="reference-controls">
      <p className="sectionlabel">Map layers</p>
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
                <label key={def.key} className="reference-row">
                  <input type="checkbox" checked={checked && !unavailable} disabled={unavailable} onChange={() => props.onToggle(key)} />
                  <span>{def.display_name}</span>
                  {unavailable && <small title={def.availability_note}>{def.availability_note ?? "Coming soon"}</small>}
                  {props.loading.has(def.key) && <small>Loading…</small>}
                  {props.errors?.[def.key] && <small role="status">{props.errors[def.key]}</small>}
                  {checked && below && <small title={`Visible from zoom ${def.min_zoom}`}>Zoom in to view</small>}
                </label>
              );
            })}
          </div>
        );
      })}
      {!props.compact && <p className="fieldhint">Reference layers provide context and do not change zoning.</p>}
    </section>
  );
}

