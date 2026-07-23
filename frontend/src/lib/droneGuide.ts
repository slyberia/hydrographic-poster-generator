/** lib/droneGuide.ts — plain-language, layered explainers for the drone console.
 *
 * Layered by design: each topic has a `summary` a non-expert can read at a
 * glance, a few plain `points`, and a `detail` block with the methodology for
 * anyone who wants it. Shared by the first-visit GuideDialog and the fuller
 * /drone/methodology page so the two never drift.
 */

export interface GuideTopic {
  id: string;
  title: string;
  /** One or two plain sentences — no jargon. */
  summary: string;
  /** Short, scannable plain-language points. */
  points: string[];
  /** The methodology, for the "more detail" disclosure. */
  detail: string;
}

export const GUIDE_TOPICS: GuideTopic[] = [
  {
    id: "zoning-model",
    title: "What is a Zoning Model?",
    summary:
      "A zoning model turns many separate map layers — where people live, protected areas, airports, sensitive sites and more — into one simple map that colours every area by how suitable it is for drone flight, from Prohibited to Suitable.",
    points: [
      "It answers one question: given what matters most to you, where does it make sense to fly?",
      "Every small area gets a colour — Prohibited, Restricted, Conditional, or Suitable.",
      "You set what “matters most” with the factor weights, then press “Run zoning model” to build the map.",
    ],
    detail:
      "The region is divided into a grid of small hexagonal cells (about 174 m across). For each cell the model scores six factors — population, land use, sensitive infrastructure, environment, airspace activity, and regulatory rules — combines those scores using your weights, and classifies the result into one of the four zones. Some cells are “constraint-locked”: a hard rule (for example, sitting inside an airport exclusion) fixes their zone no matter how you weight the factors. The result is decision-support only — it does not replace official authorization from the aviation authority.",
  },
  {
    id: "sensitivity-analysis",
    title: "What is a Sensitivity Analysis?",
    summary:
      "A sensitivity analysis checks how much the map depends on your weighting choices. It nudges each factor’s weight up and down a little and watches which areas change zone — showing you how trustworthy, or how fragile, the map really is.",
    points: [
      "It answers: if I had weighted things slightly differently, would the map look the same?",
      "Areas that keep their zone are stable; areas that flip easily are sensitive and worth a closer look.",
      "It doesn’t make a new map — it produces a stability rating and ranks which factors move the map the most.",
    ],
    detail:
      "Starting from a completed zoning run, the tool re-runs the model many times, each time changing just one factor’s weight by a set amount (for example ±10%) — a “one-at-a-time” test. For every cell it measures how much the score varied (the standard deviation, σ) and how often the cell ended up in a different zone (“zone flips”). Cells are graded LOW, MEDIUM, or HIGH volatility and shown with the Zones | Volatility toggle. The factor ranking tells you which weights, if changed, would reshape the map the most. Constraint-locked cells can’t flip, so they’re treated as stable by definition.",
  },
  {
    id: "reading-zones",
    title: "How to read the map",
    summary:
      "The map colours every area by a single verdict — how appropriate it is for drone flight — from safest to most restricted.",
    points: [
      "Suitable · lower risk — generally appropriate to fly.",
      "Conditional · caution — fly with care and awareness.",
      "Restricted · authorization — expect to need approval first.",
      "Prohibited · no-fly — treated as off-limits.",
    ],
    detail:
      "Click any area on the map to open a location report: the zone, the main reason for it, any active hard constraints, and a factor-by-factor breakdown of how the score was reached. The colours are produced by the zoning model from your current weights — change the weights and re-run to see how the verdicts shift.",
  },
  {
    id: "factor-weights",
    title: "What the factor weights do",
    summary:
      "The six weights tell the model what matters most to you. They are the main dial you turn to shape the map.",
    points: [
      "Each weight is on a 0–10 scale: 0 = ignore this factor, 10 = maximum emphasis.",
      "Only the balance between factors matters — the model normalises the weights to a 100% share.",
      "So doubling every weight changes nothing; making one factor twice another doubles its pull.",
    ],
    detail:
      "Before scoring, the model divides each factor’s weight by the total of all active weights, turning them into shares that add up to 100% (the “normalised” value shown by each factor). That’s why the ratio between factors — not the raw numbers — drives the result. These are provisional starting weights derived from an Analytic Hierarchy Process (AHP); adjust them to reflect your own priorities, then re-run the model.",
  },
];

/** Short intro shown at the top of the dialog and guide page. */
export const GUIDE_INTRO =
  "This console maps where it makes sense to fly a drone across Region 4 (Demerara-Mahaica). Here’s what the two main tools do — in plain terms, with the methodology tucked underneath if you want it.";
