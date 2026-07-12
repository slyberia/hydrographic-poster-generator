"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import ControlPanel, {
  type ExportSettings,
  type PosterSettings,
} from "@/components/ControlPanel";
import PreviewPane from "@/components/PreviewPane";
import {
  getGeographies,
  getPresets,
  getPreview,
  triggerExport,
  type GeographyRegion,
  type PresetsResponse,
} from "@/lib/api";
import { evaluateQA, hasBlockingIssue } from "@/lib/qa";

const PREVIEW_DEBOUNCE_MS = 500;

const DEFAULT_SETTINGS: PosterSettings = {
  geography_id: "",
  density_preset: "balanced",
  classification_preset: "standard",
  palette: "abyss",
  typography: "gallery_poster",
  title: "",
  subtitle: "",
  design_asset_mode: false,
  show_legend: true,
  show_metadata: true,
};

const DEFAULT_EXPORT: ExportSettings = {
  export_format: "png",
  export_size: "digital_poster",
  custom_width: null,
  custom_height: null,
};

export default function Page() {
  const [regions, setRegions] = useState<GeographyRegion[]>([]);
  const [presets, setPresets] = useState<PresetsResponse | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);

  const [settings, setSettings] = useState<PosterSettings>(DEFAULT_SETTINGS);
  const [exportSettings, setExportSettings] =
    useState<ExportSettings>(DEFAULT_EXPORT);

  const [svg, setSvg] = useState<string | null>(null);
  const [riverCount, setRiverCount] = useState<number | null>(null);
  const [geographyName, setGeographyName] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const previewAbort = useRef<AbortController | null>(null);

  // Bootstrap: geography hierarchy + live preset registry.
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      getGeographies(controller.signal),
      getPresets(controller.signal),
    ])
      .then(([geo, pre]) => {
        setRegions(geo.regions);
        setPresets(pre);
        // Align defaults with whatever the registry actually serves.
        setSettings((s) => ({
          ...s,
          density_preset: pre.density[0]?.id ?? s.density_preset,
          palette: pre.palette[0]?.id ?? s.palette,
          typography: pre.typography[0]?.id ?? s.typography,
        }));
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setBootError(err instanceof Error ? err.message : String(err));
        }
      });
    return () => controller.abort();
  }, []);

  // Debounced preview refetch on any setting change. Clearing on
  // deselection happens in handleSettingsChange (not here) so the effect
  // never calls setState synchronously.
  useEffect(() => {
    if (!settings.geography_id) return;

    const timer = setTimeout(() => {
      previewAbort.current?.abort();
      const controller = new AbortController();
      previewAbort.current = controller;
      setPreviewLoading(true);

      getPreview(settings, controller.signal)
        .then((result) => {
          setSvg(result.svg);
          setRiverCount(result.riverCount);
          setGeographyName(result.geographyName);
          setPreviewError(null);
          setPreviewLoading(false);
        })
        .catch((err) => {
          if (controller.signal.aborted) return;
          setPreviewError(err instanceof Error ? err.message : String(err));
          setPreviewLoading(false);
        });
    }, PREVIEW_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [settings]);

  const handleSettingsChange = (patch: Partial<PosterSettings>) => {
    setSettings((s) => ({ ...s, ...patch }));
    // Design assets are PNG/SVG only (backend rejects PDF with 422).
    if (patch.design_asset_mode) {
      setExportSettings((e) =>
        e.export_format === "pdf" ? { ...e, export_format: "png" } : e,
      );
    }
    // Geography deselected: drop the stale preview immediately.
    if (patch.geography_id === "") {
      previewAbort.current?.abort();
      setSvg(null);
      setRiverCount(null);
      setGeographyName(null);
      setPreviewError(null);
      setPreviewLoading(false);
    }
  };

  const handleExportSettingsChange = (patch: Partial<ExportSettings>) => {
    setExportSettings((e) => ({ ...e, ...patch }));
  };

  const typographyPreset =
    presets?.typography.find((t) => t.id === settings.typography) ?? null;

  const qaItems = useMemo(
    () =>
      evaluateQA({
        geographyId: settings.geography_id,
        title: settings.title,
        subtitle: settings.subtitle,
        typography: typographyPreset,
        designAssetMode: settings.design_asset_mode,
        exportFormat: exportSettings.export_format,
        exportSize: exportSettings.export_size,
        customWidth: exportSettings.custom_width,
        customHeight: exportSettings.custom_height,
        riverCount,
        previewError,
      }),
    [settings, exportSettings, typographyPreset, riverCount, previewError],
  );

  const handleExport = async () => {
    setExporting(true);
    setExportError(null);
    try {
      const { blob, filename } = await triggerExport({
        ...settings,
        ...exportSettings,
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : String(err));
    } finally {
      setExporting(false);
    }
  };

  return (
    <main className="flex h-screen bg-slate-950 text-slate-100">
      <aside className="flex w-80 shrink-0 flex-col border-r border-slate-800 bg-slate-900/40 lg:w-96">
        <header className="border-b border-slate-800 px-4 py-3 flex justify-between items-start">
          <div>
            <h1 className="text-base font-semibold">
              Hydrographic Poster Generator
            </h1>
            <p className="text-xs text-slate-400">
              Preset-driven river network posters
            </p>
          </div>
          <Link
            href="/docs"
            className="text-xs text-blue-400 hover:text-blue-300 underline underline-offset-2"
          >
            Docs
          </Link>
        </header>

        {bootError ? (
          <div className="m-4 rounded-md border border-red-800 bg-red-950/50 p-3 text-sm text-red-300">
            Failed to reach the API: {bootError}
          </div>
        ) : (
          <ControlPanel
            regions={regions}
            presets={presets}
            settings={settings}
            onSettingsChange={handleSettingsChange}
            exportSettings={exportSettings}
            onExportSettingsChange={handleExportSettingsChange}
            qaItems={qaItems}
            onExport={handleExport}
            exporting={exporting}
            exportDisabled={hasBlockingIssue(qaItems)}
          />
        )}

        {exportError && (
          <div className="mx-4 mb-4 rounded-md border border-red-800 bg-red-950/50 p-2 text-xs text-red-300">
            Export failed: {exportError}
          </div>
        )}
      </aside>

      <section className="min-w-0 flex-1 overflow-y-auto">
        <PreviewPane
          svg={svg}
          loading={previewLoading}
          error={previewError}
          designAssetMode={settings.design_asset_mode}
          riverCount={riverCount}
          geographyName={geographyName}
        />
      </section>
    </main>
  );
}
