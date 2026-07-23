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

import { useEffect, useRef, useState } from "react";

import { LayoutOverrides } from "@/lib/api";
import InteractiveCanvas from "./InteractiveCanvas";

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
  const workspaceRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<"fit" | number>("fit");
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === workspaceRef.current);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const resetView = () => {
    setZoom("fit");
    scrollerRef.current?.scrollTo({ top: 0, left: 0 });
  };

  const changeZoom = (delta: number) => {
    setZoom((current) => {
      const numericZoom = current === "fit" ? 100 : current;
      return Math.min(200, Math.max(50, numericZoom + delta));
    });
  };

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await workspaceRef.current?.requestFullscreen();
    }
  };

  const posterWidth =
    zoom === "fit"
      ? "min(100%, calc((100dvh - 9.5rem) * 2 / 3))"
      : `${Math.round(640 * (zoom / 100))}px`;

  return (
    <div
      ref={workspaceRef}
      className="flex h-full min-h-0 flex-col bg-[var(--ui-page)]"
      data-testid="preview-workspace"
    >
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--ui-border)] bg-[var(--ui-panel)] px-3 sm:px-4">
        <div className="hidden min-w-0 pl-24 text-xs text-[var(--ui-text-muted)] sm:block lg:pl-0">
          <span className="block truncate font-medium text-[var(--ui-text)]">
            {geographyName || "Poster preview"}
          </span>
          {riverCount !== null && (
            <span>{riverCount.toLocaleString()} features</span>
          )}
        </div>

        <div
          className="flex h-8 shrink-0 items-center overflow-hidden rounded-md border border-[var(--ui-border)] bg-[var(--ui-surface)]"
          role="group"
          aria-label="Preview view controls"
        >
          <button
            type="button"
            onClick={() => changeZoom(-25)}
            className="studio-view-button"
            aria-label="Zoom out"
            disabled={!svg || zoom === 50}
          >
            -
          </button>
          <button
            type="button"
            onClick={() => setZoom(100)}
            className="studio-view-button min-w-14 border-x border-[var(--ui-border)] px-2 text-[11px]"
            disabled={!svg}
          >
            {zoom === "fit" ? "Auto" : `${zoom}%`}
          </button>
          <button
            type="button"
            onClick={() => changeZoom(25)}
            className="studio-view-button"
            aria-label="Zoom in"
            disabled={!svg || zoom === 200}
          >
            +
          </button>
          <button
            type="button"
            onClick={() => setZoom("fit")}
            className="studio-view-button border-l border-[var(--ui-border)] px-2 text-[11px]"
            disabled={!svg}
          >
            Fit
          </button>
          <button
            type="button"
            onClick={resetView}
            className="studio-view-button border-l border-[var(--ui-border)] px-2 text-[11px]"
            disabled={!svg}
          >
            Reset
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="studio-view-button border-l border-[var(--ui-border)] px-2 text-[11px]"
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? "Exit" : "Full"}
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="min-h-0 flex-1 overflow-auto p-3 sm:p-5"
        data-testid="preview-scroller"
      >
        <div className="flex min-h-full min-w-full items-start justify-center">
          <div
            className={`relative shrink-0 overflow-hidden rounded-md transition-[width,box-shadow] duration-200 ${
              designAssetMode ? "preview-checkerboard" : "bg-[var(--ui-surface)]"
            } ${svg ? "shadow-xl shadow-black/15" : "shadow-lg shadow-black/10"}`}
            style={{
              width: posterWidth,
              aspectRatio: "2 / 3",
              border: "1px solid var(--ui-border-strong)",
            }}
            aria-busy={loading}
            data-testid="poster-canvas"
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

            {loading && (
              <div
                role="status"
                className="absolute inset-0 flex items-center justify-center bg-[var(--ui-page)]/60 backdrop-blur-sm"
              >
                <div className="relative flex items-center justify-center">
                  <div className="pulse-ring absolute h-12 w-12 rounded-full bg-[var(--ui-action)]/20" />
                  <div className="spin-smooth h-10 w-10 rounded-full border-2 border-[var(--ui-action)]/20 border-t-[var(--ui-action)]" />
                </div>
                <span className="sr-only">Rendering preview...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex min-h-14 shrink-0 items-center justify-between border-t border-[var(--ui-border)] bg-[var(--ui-panel)] px-3 text-xs text-[var(--ui-text-muted)] sm:px-5">
        <div className="flex-1 truncate">
          {error ? (
            <span className="text-[var(--ui-danger)]" title={error}>
              {error}
            </span>
          ) : svg ? (
            <span>Preview resolution. Export uses the selected output size.</span>
          ) : null}
        </div>

        {svg && !error && (
          <button
            onClick={onDownload}
            disabled={isDownloading || exportDisabled}
            className="btn-primary ml-4 !w-auto px-5 py-2"
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
