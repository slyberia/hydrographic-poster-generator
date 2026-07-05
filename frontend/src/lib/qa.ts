/**
 * Client-side QA checks (spec §21, contract §15).
 *
 * The text-fit check is the explicit heuristic from
 * docs/PROJECTION_SCALEBAR_NOTES.md §15 — severity `warning`, never `block`.
 * Proportional-font advances are estimates; an authoritative fit check
 * belongs server-side with real font metrics.
 */

import type { ExportFormat, ExportSize, TypographyPreset } from "./api";

export type QASeverity = "pass" | "warning" | "block";

export interface QAItem {
  id: string;
  label: string;
  severity: QASeverity;
  message: string;
}

// Reference typography constants at the 3600x5400 canvas (contract §15).
const TITLE_SIZE = 200;
const SUBTITLE_SIZE = 90;
const TITLE_BLOCK_W = 3000;
const SUBTITLE_BLOCK_W = 3000;

// Spec §19.2 custom size limits (mirrors backend export_models.py).
export const CUSTOM_MIN_SHORT_SIDE = 1000;
export const CUSTOM_MAX_LONG_SIDE = 9000;

/**
 * Average glyph advance in em, per contract §15. Roboto Mono is exact
 * (monospace); the others are estimates for the specific weights the
 * typography presets use.
 */
function avgAdvance(font: string, weight: string): number {
  if (font === "Roboto Mono") return 0.6;
  if (font === "Inter") return Number(weight) >= 600 ? 0.55 : 0.5;
  if (font === "Outfit") return 0.52;
  // Unregistered face: assume a wide humanist sans so the warning fires
  // early rather than late.
  return 0.55;
}

function parseTrackingEm(tracking: string): number {
  const value = parseFloat(tracking);
  return Number.isFinite(value) ? value : 0;
}

// Guards against float noise (0.55 + 0.05 === 0.6000000000000001) turning
// the contract's exact worked value of 25 into floor(24.9999...) = 24.
const EPSILON = 1e-9;

/** max_chars = floor(block_w / (font_size * (adv + tracking)))  (§15) */
export function maxTitleChars(typography: TypographyPreset): number {
  const adv = avgAdvance(typography.title_font, typography.title_weight);
  const tracking = parseTrackingEm(typography.title_tracking);
  return Math.floor(TITLE_BLOCK_W / (TITLE_SIZE * (adv + tracking)) + EPSILON);
}

export function maxSubtitleChars(typography: TypographyPreset): number {
  const adv = avgAdvance(typography.subtitle_font, typography.subtitle_weight);
  const tracking = parseTrackingEm(typography.subtitle_tracking);
  return Math.floor(
    SUBTITLE_BLOCK_W / (SUBTITLE_SIZE * (adv + tracking)) + EPSILON,
  );
}

export interface QAInput {
  geographyId: string;
  title: string;
  subtitle: string;
  typography: TypographyPreset | null;
  designAssetMode: boolean;
  exportFormat: ExportFormat;
  exportSize: ExportSize;
  customWidth: number | null;
  customHeight: number | null;
  /** X-River-Count from the last successful preview; null before first load */
  riverCount: number | null;
  previewError: string | null;
}

export function evaluateQA(input: QAInput): QAItem[] {
  const items: QAItem[] = [];

  // Data QA: a boundary must be selected (spec §21.1).
  if (!input.geographyId) {
    items.push({
      id: "data",
      label: "Data Loaded",
      severity: "block",
      message: "Select a geography to load river data.",
    });
  } else if (input.previewError) {
    items.push({
      id: "data",
      label: "Data Loaded",
      severity: "block",
      message: `Preview failed: ${input.previewError}`,
    });
  } else if (input.riverCount === 0) {
    items.push({
      id: "data",
      label: "Data Loaded",
      severity: "block",
      message: "No HydroRIVERS features found for the selected boundary.",
    });
  } else {
    items.push({
      id: "data",
      label: "Data Loaded",
      severity: "pass",
      message:
        input.riverCount !== null
          ? `${input.riverCount.toLocaleString()} river features loaded.`
          : "Geography selected.",
    });
  }

  // Visual/layout QA: text fit heuristic (§15) — warning, never block.
  if (input.typography && !input.designAssetMode) {
    const titleLimit = maxTitleChars(input.typography);
    const subtitleLimit = maxSubtitleChars(input.typography);
    const titleOver = input.title.length > titleLimit;
    const subtitleOver = input.subtitle.length > subtitleLimit;
    if (titleOver || subtitleOver) {
      const parts = [];
      if (titleOver) {
        parts.push(`title ${input.title.length}/${titleLimit}`);
      }
      if (subtitleOver) {
        parts.push(`subtitle ${input.subtitle.length}/${subtitleLimit}`);
      }
      items.push({
        id: "text_fit",
        label: "Text Fit",
        severity: "warning",
        message: `Text may exceed its block (${parts.join(", ")} chars).`,
      });
    } else {
      items.push({
        id: "text_fit",
        label: "Text Fit",
        severity: "pass",
        message: "Title and subtitle fit their blocks.",
      });
    }
  }

  // Export QA (spec §21.4).
  if (input.designAssetMode && input.exportFormat === "pdf") {
    items.push({
      id: "export",
      label: "Export Config",
      severity: "block",
      message: "Design asset exports support PNG and SVG only.",
    });
  } else if (input.exportSize === "custom") {
    const w = input.customWidth ?? 0;
    const h = input.customHeight ?? 0;
    const short = Math.min(w, h);
    const long = Math.max(w, h);
    if (short < CUSTOM_MIN_SHORT_SIDE || long > CUSTOM_MAX_LONG_SIDE) {
      items.push({
        id: "export",
        label: "Export Config",
        severity: "block",
        message: `Custom size must be ${CUSTOM_MIN_SHORT_SIDE}px+ on the short side and at most ${CUSTOM_MAX_LONG_SIDE}px on the long side.`,
      });
    } else {
      items.push({
        id: "export",
        label: "Export Config",
        severity: "pass",
        message: `Custom size ${w} × ${h}px is within limits.`,
      });
    }
  } else {
    items.push({
      id: "export",
      label: "Export Config",
      severity: "pass",
      message: "Export format and size are valid.",
    });
  }

  return items;
}

export function hasBlockingIssue(items: QAItem[]): boolean {
  return items.some((item) => item.severity === "block");
}
