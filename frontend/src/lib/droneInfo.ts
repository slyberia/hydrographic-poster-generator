/** lib/droneInfo.ts — plain-language explanatory copy for the drone console.
 *
 * Static, frontend-only reference text (the six factors are fixed). Keeps the
 * UI self-documenting without a backend round-trip. Factor keys mirror
 * mcda_factors.factor_key.
 */

export const FACTOR_INFO: Record<string, string> = {
  population:
    "Density of people on the ground. Higher weight steers drone-suitable zones away from populated areas, since overflight risk rises where more people are below.",
  land_use:
    "What the land is used for (built-up, agricultural, forest, water). Shapes where flight is appropriate independent of specific hazards.",
  infrastructure_sensitive:
    "Proximity to sensitive infrastructure and sites — hospitals, schools, power lines, key facilities. Higher weight enforces wider standoff from them.",
  environmental:
    "Protected and ecologically sensitive areas (reserves, habitats). Higher weight discourages flight where wildlife or ecosystems could be disturbed.",
  airspace_activity:
    "Manned-aviation activity — airports, aerodromes, known flight corridors. Higher weight tightens exclusion around active airspace.",
  regulatory:
    "Formal regulatory designations and no-fly rules from the governing authority. Higher weight makes those designations dominate the outcome.",
};

/** What the two run actions actually do — surfaced via ⓘ and the help panel. */
export const OPERATION_INFO = {
  zoning: {
    title: "Run Zoning Model",
    body:
      "Scores every grid cell once using your current factor weights and classifies each into a suitability zone (Prohibited → Suitable). Answers: “given these priorities, where is it safe to fly?” Produces one zoning map.",
  },
  sensitivity: {
    title: "Run Sensitivity Analysis",
    body:
      "Takes a completed zoning run and nudges each factor’s weight up and down one at a time (e.g. ±10%), re-scoring the whole grid each time. Answers: “how fragile is this map to my weighting choices — which factors, if changed slightly, flip the most cells between zones?” Produces volatility stats and a factor ranking, not a new map.",
  },
  export: {
    title: "Export current view",
    body:
      "Renders exactly what’s framed in the map right now — the current pan/zoom, the active Zones or Volatility colouring, and any hidden zones — as a high-resolution image. Pan and zoom to the area you want (a neighbourhood or the whole region), then export. Basemap and attribution are included, and you can optionally overlay the Region 4 study-area outline.",
  },
} as const;

/** The weighting model: the 0–10 scale, what higher/lower does, and what
 * "normalised" means — surfaced via ⓘ on the Factor weights heading. */
export const WEIGHTING_INFO = {
  scale:
    "Each factor's weight is on a 0–10 scale: 0 means ignore this factor entirely, 10 means give it maximum emphasis. Higher weight pulls the zoning to respect that factor more.",
  normalisation:
    "Only the relative sizes matter. Before scoring, the engine normalises the weights — divides each by the total of all active weights so they add up to 100% — and the “normalised” value shown by each factor is that share. So doubling every weight changes nothing; what moves the map is the ratio between factors (making one twice another doubles its pull). AHP = Analytic Hierarchy Process, the pairwise-priority method these provisional weights approximate.",
} as const;

/** Definitions for the location-report fields — surfaced via ⓘ in the drawer. */
export const REPORT_INFO = {
  risk_score:
    "The cell's weighted risk on a 0–5 scale (higher = more constrained). It's the sum of each factor's 0–5 score times its normalised weight. Constraint-locked cells show no score because a hard rule — not the weighting — fixes their zone.",
  factor_breakdown:
    "Each active factor's contribution at this cell, shown as score × weight: the factor's 0–5 score here times its weight (renormalised over the factors actually present at this cell). These products sum to the weighted risk score above.",
  stability:
    "From the sensitivity sweep. σ (sigma) is the standard deviation of this cell's score across every ± weight perturbation — higher means more sensitive to your weighting choices. “Zone flips” counts how many of those perturbations pushed the cell into a different zone, out of the total run.",
} as const;

/** Data-confidence categories shown in the location report. */
export const CONFIDENCE_INFO: Record<string, string> = {
  high: "Derived from recent, high-resolution sources with good spatial agreement.",
  medium: "Derived from moderately recent or coarser sources; treat with some caution.",
  low: "Derived from older or low-resolution sources; verify before operational use.",
};
