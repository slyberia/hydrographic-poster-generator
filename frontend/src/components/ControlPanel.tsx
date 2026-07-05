"use client";

import { useRef, useState } from "react";

import {
  getGeographyChildren,
  type ExportFormat,
  type ExportSize,
  type GeographyDetail,
  type GeographyRegion,
  type PresetsResponse,
} from "@/lib/api";
import type { QAItem } from "@/lib/qa";
import QAChecklist from "./QAChecklist";

export interface PosterSettings {
  geography_id: string;
  density_preset: string;
  classification_preset: string;
  palette: string;
  typography: string;
  title: string;
  subtitle: string;
  design_asset_mode: boolean;
  show_legend: boolean;
  show_metadata: boolean;
}

export interface ExportSettings {
  export_format: ExportFormat;
  export_size: ExportSize;
  custom_width: number | null;
  custom_height: number | null;
}

// Mirrors backend/app/models/export_models.py ExportSize / ExportFormat
// literals (sizes are a typed enum, not part of the /presets registry).
const EXPORT_SIZES: { id: ExportSize; label: string }[] = [
  { id: "digital_poster", label: "Digital Poster (1600 × 2400)" },
  { id: "high_res_poster", label: "High-Res Poster (3600 × 5400)" },
  { id: "instagram_portrait", label: "Instagram Portrait (1080 × 1350)" },
  { id: "print_18x24", label: "18 × 24 in Print (5400 × 7200)" },
  { id: "square_design_asset", label: "Square Design Asset (3000 × 3000)" },
  { id: "custom", label: "Custom…" },
];

const EXPORT_FORMATS: ExportFormat[] = ["png", "svg", "pdf"];

const selectClass =
  "w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-sm text-slate-100 focus:border-sky-500 focus:outline-none disabled:opacity-50";
const inputClass = selectClass;
const labelClass =
  "mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400";

interface ControlPanelProps {
  regions: GeographyRegion[];
  presets: PresetsResponse | null;
  settings: PosterSettings;
  onSettingsChange: (patch: Partial<PosterSettings>) => void;
  exportSettings: ExportSettings;
  onExportSettingsChange: (patch: Partial<ExportSettings>) => void;
  qaItems: QAItem[];
  onExport: () => void;
  exporting: boolean;
  exportDisabled: boolean;
}

export default function ControlPanel({
  regions,
  presets,
  settings,
  onSettingsChange,
  exportSettings,
  onExportSettingsChange,
  qaItems,
  onExport,
  exporting,
  exportDisabled,
}: ControlPanelProps) {
  // Cascading geography picker state. Deeper pickers render only when the
  // API actually returns children for the level above them.
  const [regionCode, setRegionCode] = useState("");
  const [countryId, setCountryId] = useState("");
  const [admin1Id, setAdmin1Id] = useState("");
  const [admin2Id, setAdmin2Id] = useState("");
  const [admin1Options, setAdmin1Options] = useState<GeographyDetail[]>([]);
  const [admin2Options, setAdmin2Options] = useState<GeographyDetail[]>([]);

  const admin1Abort = useRef<AbortController | null>(null);
  const admin2Abort = useRef<AbortController | null>(null);

  const region = regions.find((r) => r.region_code === regionCode) ?? null;

  const loadChildren = (
    parentId: string,
    setOptions: (opts: GeographyDetail[]) => void,
    abortRef: React.RefObject<AbortController | null>,
  ) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    getGeographyChildren(parentId, controller.signal)
      .then(setOptions)
      .catch((err) => {
        if (!controller.signal.aborted) {
          console.warn("Failed to load child geographies:", err);
          setOptions([]);
        }
      });
  };

  const selectGeography = (id: string) => onSettingsChange({ geography_id: id });

  const handleRegion = (code: string) => {
    setRegionCode(code);
    setCountryId("");
    setAdmin1Id("");
    setAdmin2Id("");
    setAdmin1Options([]);
    setAdmin2Options([]);
    selectGeography("");
  };

  const handleCountry = (id: string) => {
    setCountryId(id);
    setAdmin1Id("");
    setAdmin2Id("");
    setAdmin1Options([]);
    setAdmin2Options([]);
    selectGeography(id);
    if (id) loadChildren(id, setAdmin1Options, admin1Abort);
  };

  const handleAdmin1 = (id: string) => {
    setAdmin1Id(id);
    setAdmin2Id("");
    setAdmin2Options([]);
    selectGeography(id || countryId);
    if (id) loadChildren(id, setAdmin2Options, admin2Abort);
  };

  const handleAdmin2 = (id: string) => {
    setAdmin2Id(id);
    selectGeography(id || admin1Id);
  };

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto p-4">
      {/* Geography */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-100">Geography</h2>
        <div className="space-y-2.5">
          <div>
            <label htmlFor="region" className={labelClass}>
              Region
            </label>
            <select
              id="region"
              className={selectClass}
              value={regionCode}
              onChange={(e) => handleRegion(e.target.value)}
            >
              <option value="">Select a region…</option>
              {regions.map((r) => (
                <option key={r.region_code} value={r.region_code}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {region && (
            <div>
              <label htmlFor="country" className={labelClass}>
                Country
              </label>
              <select
                id="country"
                className={selectClass}
                value={countryId}
                onChange={(e) => handleCountry(e.target.value)}
              >
                <option value="">Select a country…</option>
                {region.countries.map((c) => (
                  <option key={c.country_code} value={c.admin_0_id ?? ""}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {admin1Options.length > 0 && (
            <div>
              <label htmlFor="admin1" className={labelClass}>
                State / Province
              </label>
              <select
                id="admin1"
                className={selectClass}
                value={admin1Id}
                onChange={(e) => handleAdmin1(e.target.value)}
              >
                <option value="">Entire country</option>
                {admin1Options.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {admin1Id && admin2Options.length > 0 && (
            <div>
              <label htmlFor="admin2" className={labelClass}>
                County / District
              </label>
              <select
                id="admin2"
                className={selectClass}
                value={admin2Id}
                onChange={(e) => handleAdmin2(e.target.value)}
              >
                <option value="">Entire state/province</option>
                {admin2Options.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </section>

      {/* Style presets — populated from the live /presets registry */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-100">Style</h2>
        <div className="space-y-2.5">
          <div>
            <label htmlFor="density" className={labelClass}>
              Density
            </label>
            <select
              id="density"
              className={selectClass}
              value={settings.density_preset}
              onChange={(e) =>
                onSettingsChange({ density_preset: e.target.value })
              }
            >
              {(presets?.density ?? []).map((p) => (
                <option key={p.id} value={p.id} title={p.description}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="palette" className={labelClass}>
              Palette
            </label>
            <select
              id="palette"
              className={selectClass}
              value={settings.palette}
              onChange={(e) => onSettingsChange({ palette: e.target.value })}
            >
              {(presets?.palette ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.type})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="typography" className={labelClass}>
              Typography
            </label>
            <select
              id="typography"
              className={selectClass}
              value={settings.typography}
              onChange={(e) => onSettingsChange({ typography: e.target.value })}
            >
              {(presets?.typography ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Poster text */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-100">Text</h2>
        <div className="space-y-2.5">
          <div>
            <label htmlFor="title" className={labelClass}>
              Title
            </label>
            <input
              id="title"
              type="text"
              className={inputClass}
              value={settings.title}
              placeholder="FLOWING GUYANA"
              disabled={settings.design_asset_mode}
              onChange={(e) => onSettingsChange({ title: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="subtitle" className={labelClass}>
              Subtitle
            </label>
            <input
              id="subtitle"
              type="text"
              className={inputClass}
              value={settings.subtitle}
              placeholder="River Network of Guyana"
              disabled={settings.design_asset_mode}
              onChange={(e) => onSettingsChange({ subtitle: e.target.value })}
            />
          </div>
        </div>
      </section>

      {/* Toggles */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-100">Layers</h2>
        <div className="space-y-1.5 text-sm text-slate-200">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.show_legend}
              disabled={settings.design_asset_mode}
              onChange={(e) =>
                onSettingsChange({ show_legend: e.target.checked })
              }
            />
            Legend
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.show_metadata}
              disabled={settings.design_asset_mode}
              onChange={(e) =>
                onSettingsChange({ show_metadata: e.target.checked })
              }
            />
            Metadata &amp; scale bar
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.design_asset_mode}
              onChange={(e) =>
                onSettingsChange({ design_asset_mode: e.target.checked })
              }
            />
            Design asset mode (transparent, rivers only)
          </label>
        </div>
      </section>

      {/* Export */}
      <section className="mt-auto border-t border-slate-800 pt-4">
        <h2 className="mb-2 text-sm font-semibold text-slate-100">Export</h2>
        <div className="space-y-2.5">
          <div className="flex gap-2">
            <div className="flex-1">
              <label htmlFor="export-format" className={labelClass}>
                Format
              </label>
              <select
                id="export-format"
                className={selectClass}
                value={exportSettings.export_format}
                onChange={(e) =>
                  onExportSettingsChange({
                    export_format: e.target.value as ExportFormat,
                  })
                }
              >
                {EXPORT_FORMATS.map((f) => (
                  <option
                    key={f}
                    value={f}
                    disabled={f === "pdf" && settings.design_asset_mode}
                  >
                    {f.toUpperCase()}
                    {f === "pdf" && settings.design_asset_mode
                      ? " (poster only)"
                      : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-[2]">
              <label htmlFor="export-size" className={labelClass}>
                Size
              </label>
              <select
                id="export-size"
                className={selectClass}
                value={exportSettings.export_size}
                onChange={(e) =>
                  onExportSettingsChange({
                    export_size: e.target.value as ExportSize,
                  })
                }
              >
                {EXPORT_SIZES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {exportSettings.export_size === "custom" && (
            <div className="flex gap-2">
              <div className="flex-1">
                <label htmlFor="custom-width" className={labelClass}>
                  Width (px)
                </label>
                <input
                  id="custom-width"
                  type="number"
                  min={1000}
                  max={9000}
                  className={inputClass}
                  value={exportSettings.custom_width ?? ""}
                  onChange={(e) =>
                    onExportSettingsChange({
                      custom_width: e.target.value
                        ? Number(e.target.value)
                        : null,
                    })
                  }
                />
              </div>
              <div className="flex-1">
                <label htmlFor="custom-height" className={labelClass}>
                  Height (px)
                </label>
                <input
                  id="custom-height"
                  type="number"
                  min={1000}
                  max={9000}
                  className={inputClass}
                  value={exportSettings.custom_height ?? ""}
                  onChange={(e) =>
                    onExportSettingsChange({
                      custom_height: e.target.value
                        ? Number(e.target.value)
                        : null,
                    })
                  }
                />
              </div>
            </div>
          )}

          <QAChecklist items={qaItems} />

          <button
            type="button"
            className="w-full rounded-md bg-sky-600 py-2 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
            disabled={exportDisabled || exporting}
            onClick={onExport}
          >
            {exporting ? "Exporting…" : "Generate Export"}
          </button>
        </div>
      </section>
    </div>
  );
}
