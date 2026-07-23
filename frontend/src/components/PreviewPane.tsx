"use client";

/**
 * Poster preview canvas.
 *
 * Display contract (docs/PROJECTION_SCALEBAR_NOTES.md §14): the SVG is
 * injected as-is via dangerouslySetInnerHTML and scaled with CSS only
 * (`.preview-svg svg { width: 100%; height: auto; }` in globals.css).
 * No attribute stripping, no preserveAspectRatio override. The container
 * keeps aspect-ratio 2/3 so the skeleton and the loaded SVG occupy
 * identical space (no layout shift).
 */

import InteractiveCanvas from "./InteractiveCanvas";
import { LayoutOverrides } from "@/lib/api";

interface PreviewPaneProps {
  svg: string | null;
  loading: boolean;
  error: string | null;
  designAssetMode: boolean;
  riverCount: number | null;
  geographyName: string | null;
  transforms: LayoutOverrides;
  onTransformsChange: (transforms: LayoutOverrides) => void;
  onResetTransforms: () => void;
  onDownload: () => void;
  isDownloading: boolean;
  exportDisabled: boolean;
}

export default function PreviewPane({
  svg,
  loading,
  error,
  designAssetMode,
  riverCount,
  geographyName,
  transforms,
  onTransformsChange,
  onResetTransforms,
  onDownload,
  isDownloading,
  exportDisabled,
}: PreviewPaneProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
      {/* ── Preview card ── */}
      <div
        className={`relative w-full max-w-xl overflow-hidden rounded-2xl transition-shadow duration-500 ${
          designAssetMode
            ? "preview-checkerboard"
            : "bg-[var(--ui-surface)]"
        } ${
          svg
            ? "shadow-[0_8px_60px_-12px_rgba(94,106,210,0.15)]"
            : "shadow-2xl shadow-black/40"
        }`}
        style={{
          aspectRatio: "2 / 3",
          border: "1px solid rgba(255, 255, 255, 0.06)",
        }}
        aria-busy={loading}
      >
        {svg ? (
          <div className="preview-svg animate-fade-in h-full w-full">
            <InteractiveCanvas
              svg={svg}
              transforms={transforms}
              onTransformsChange={onTransformsChange}
              onReset={onResetTransforms}
            />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center px-8 text-center text-sm text-[var(--ui-text-muted)]">
            {loading
              ? null
              : error
                ? "Preview unavailable."
                : "Select a geography to generate a preview."}
          </div>
        )}

        {/* ── Premium loading indicator ── */}
        {loading && (
          <div
            role="status"
            className="absolute inset-0 flex items-center justify-center bg-[var(--ui-page)]/60 backdrop-blur-sm"
          >
            <div className="relative flex items-center justify-center">
              <div className="absolute h-12 w-12 rounded-full pulse-ring bg-[var(--ui-action)]/20" />
              <div className="h-10 w-10 spin-smooth rounded-full border-2 border-[var(--ui-action)]/20 border-t-[var(--ui-action)]" />
            </div>
            <span className="sr-only">Rendering preview…</span>
          </div>
        )}
      </div>

      {/* ── Status & Actions ── */}
      <div className="flex w-full max-w-xl items-center justify-between text-xs text-[var(--ui-text-muted)]">
        <div className="flex-1 truncate">
          {error ? (
            <span className="text-red-400" title={error}>
              {error}
            </span>
          ) : (
            <span>
              {geographyName ?? ""}
              {geographyName && riverCount !== null ? " • " : ""}
              {riverCount !== null ? `${riverCount.toLocaleString()} features` : ""}
            </span>
          )}
        </div>
        
        {svg && !error && (
          <button
            onClick={onDownload}
            disabled={isDownloading || exportDisabled}
            className="btn-primary py-2 px-6 ml-4"
          >
            {isDownloading ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 spin-smooth rounded-full border-2 border-white/20 border-t-white" />
                <span>Exporting...</span>
              </div>
            ) : (
              "Download"
            )}
          </button>
        )}
      </div>
    </div>
  );
}
