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

interface PreviewPaneProps {
  svg: string | null;
  loading: boolean;
  error: string | null;
  designAssetMode: boolean;
  riverCount: number | null;
  geographyName: string | null;
}

export default function PreviewPane({
  svg,
  loading,
  error,
  designAssetMode,
  riverCount,
  geographyName,
}: PreviewPaneProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6">
      <div
        className={`relative w-full max-w-xl overflow-hidden rounded-md shadow-2xl ring-1 ring-slate-700/60 ${
          designAssetMode ? "preview-checkerboard" : "bg-slate-900"
        }`}
        style={{ aspectRatio: "2 / 3" }}
      >
        {svg ? (
          <div
            className="preview-svg"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ) : (
          <div className="flex h-full items-center justify-center px-8 text-center text-sm text-slate-500">
            {loading
              ? null
              : error
                ? "Preview unavailable."
                : "Select a geography to generate a preview."}
          </div>
        )}

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/50">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-500 border-t-slate-100" />
          </div>
        )}
      </div>

      <div className="flex h-5 w-full max-w-xl items-center justify-between text-xs text-slate-400">
        {error ? (
          <span className="truncate text-red-400" title={error}>
            {error}
          </span>
        ) : (
          <>
            <span>{geographyName ?? ""}</span>
            <span>
              {riverCount !== null
                ? `${riverCount.toLocaleString()} river features`
                : ""}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
