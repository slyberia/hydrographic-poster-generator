/** lib/zoneTheme.ts — single source for drone console zone & volatility colors.
 *
 * ZONE_FILL hex values MUST stay in sync with the --z-* custom properties in
 * globals.css: Leaflet canvas paths cannot read CSS variables, so the DOM side
 * uses ZONE_CSS while the canvas side uses ZONE_FILL.
 */

import type { Zone } from "@/lib/droneApi";

export type VolatilityCategory = "LOW" | "MEDIUM" | "HIGH";

export const ZONE_FILL: Record<Zone, string> = {
  PROHIBITED: "#b3362b",
  RESTRICTED: "#d98e2b",
  CONDITIONAL: "#e5c95c",
  SUITABLE: "#5da06f",
};

export const ZONE_CSS: Record<Zone, string> = {
  PROHIBITED: "var(--z-prohibited)",
  RESTRICTED: "var(--z-restricted)",
  CONDITIONAL: "var(--z-conditional)",
  SUITABLE: "var(--z-suitable)",
};

export const ZONE_LABELS: Record<Zone, string> = {
  PROHIBITED: "Prohibited · no-fly",
  RESTRICTED: "Restricted · authorization",
  CONDITIONAL: "Conditional · caution",
  SUITABLE: "Suitable · lower risk",
};

export const VOLATILITY_FILL: Record<VolatilityCategory, string> = {
  LOW: "#5da06f",
  MEDIUM: "#e5c95c",
  HIGH: "#b3362b",
};

export const VOLATILITY_LABELS: Record<VolatilityCategory, string> = {
  LOW: "Low · stable",
  MEDIUM: "Medium · noticeable instability",
  HIGH: "High · may cross zone boundary",
};

/** Cells absent from the volatility payload are constraint-locked (NULL score
 * server-side) — stable by definition, never alarming. */
export const CONSTRAINT_LOCKED_FILL = "#c8c8c8";
export const CONSTRAINT_LOCKED_LABEL = "Constraint-locked (stable by definition)";
