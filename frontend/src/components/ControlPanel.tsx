"use client";

import { useRef, useState } from "react";

import {
  getGeographyChildren,
  type ExportFormat,
  type ExportSize,
  type GeographyDetail,
  type GeographyRegion,
  type PresetsResponse,
  type StyleSelection,
} from "@/lib/api";
import type { QAItem } from "@/lib/qa";
import QAChecklist from "./QAChecklist";
import ColorPickerPopover from "./ColorPickerPopover";

export interface PosterSettings {
  geography_id: string;
  density_preset: string;
  classification_preset: string;
  style?: StyleSelection;
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

interface ControlPanelProps {
  regions: GeographyRegion[];
  presets: PresetsResponse | null;
  settings: PosterSettings;
  onSettingsChange: (patch: Partial<PosterSettings>) => void;
  exportSettings: ExportSettings;
  onExportSettingsChange: (patch: Partial<ExportSettings>) => void;
  qaItems: QAItem[];
}

interface ActiveColorPickerState {
  key: string;
  rect: DOMRect;
}

export default function ControlPanel({
  regions,
  presets,
  settings,
  onSettingsChange,
  exportSettings,
  onExportSettingsChange,
  qaItems,
}: ControlPanelProps) {
  const [activeColorPicker, setActiveColorPicker] = useState<ActiveColorPickerState | null>(null);

  // Cascading geography picker state.
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
    <div className="flex h-full flex-col gap-5 overflow-y-auto px-5 py-4">
      {/* ── Geography ── */}
      <section className="animate-fade-in" style={{ animationDelay: "0.05s" }}>
        <h2 className="section-header mb-2.5">Geography</h2>
        <div className="space-y-2.5">
          <div>
            <label htmlFor="region" className="glass-label">
              Region
            </label>
            <select
              id="region"
              className="glass-select"
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
              <label htmlFor="country" className="glass-label">
                Country
              </label>
              <select
                id="country"
                className="glass-select"
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
              <label htmlFor="admin1" className="glass-label">
                State / Province
              </label>
              <select
                id="admin1"
                className="glass-select"
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
              <label htmlFor="admin2" className="glass-label">
                County / District
              </label>
              <select
                id="admin2"
                className="glass-select"
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

      {/* ── Style presets ── */}
      <section className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
        <h2 className="section-header mb-2.5">Style</h2>
        <div className="space-y-2.5">
          <div>
            <label htmlFor="density" className="glass-label">
              Density
            </label>
            <select
              id="density"
              className="glass-select"
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
            <label htmlFor="palette" className="glass-label">
              Theme / Palette
            </label>
            <select
              id="palette"
              className="glass-select"
              value={settings.style?.mode === "flag" ? "mode_flag" : `standard:${settings.style?.preset_id}`}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "mode_flag") {
                  // Switch to flag mode, select first available flag
                  const firstFlag = presets?.flags?.[0]?.id || "";
                  onSettingsChange({
                    style: {
                      schema_version: 2,
                      mode: "flag",
                      preset_id: firstFlag,
                      variant: settings.style?.variant || "light",
                      overrides: {},
                    },
                  });
                } else {
                  // Standard mode
                  const [mode, presetId] = val.split(":");
                  onSettingsChange({
                    style: {
                      schema_version: 2,
                      mode: "standard",
                      preset_id: presetId,
                      variant: settings.style?.variant,
                      overrides: {},
                    },
                  });
                }
              }}
            >
              {(presets?.palette ?? []).map((p) => (
                <option key={`standard:${p.id}`} value={`standard:${p.id}`}>
                  {p.name} ({p.type})
                </option>
              ))}
              <option value="mode_flag">Country Flags…</option>
            </select>
          </div>

          {settings.style?.mode === "flag" && (
            <div>
              <label htmlFor="country_flag" className="glass-label">
                Country
              </label>
              <select
                id="country_flag"
                className="glass-select"
                value={settings.style.preset_id}
                onChange={(e) => {
                  onSettingsChange({
                    style: {
                      ...settings.style!,
                      preset_id: e.target.value,
                      overrides: {}, // Clear custom colors when switching flags
                    },
                  });
                }}
              >
                {(presets?.flags ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {settings.style?.mode === "flag" && (
            <div>
              <label htmlFor="variant" className="glass-label">
                Variant
              </label>
              <select
                id="variant"
                className="glass-select"
                value={settings.style?.variant || "light"}
                onChange={(e) => onSettingsChange({
                  style: {
                    ...settings.style!,
                    variant: e.target.value as "light" | "dark",
                  }
                })}
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
          )}
          <div>
            <label htmlFor="typography" className="glass-label">
              Typography
            </label>
            <select
              id="typography"
              className="glass-select"
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

      {/* ── Custom Colors ── */}
      <section className="animate-fade-in" style={{ animationDelay: "0.12s" }}>
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="section-header !mb-0">Colors</h2>
          {settings.style?.overrides && Object.keys(settings.style.overrides).length > 0 && (
            <button
              onClick={() => onSettingsChange({ style: { ...settings.style!, overrides: {} } })}
              className="text-[10px] uppercase tracking-wider text-[var(--accent)] hover:text-[var(--foreground)] transition-colors"
            >
              Reset to Preset
            </button>
          )}
        </div>
        <div className="space-y-0.5">
          {(() => {
            let tokens: any = {};
            if (settings.style?.mode === "flag") {
                const currentFlag = presets?.flags.find(p => p.id === settings.style?.preset_id);
                tokens = currentFlag?.variants[settings.style?.variant || "light"];
            } else {
                const currentPalette = presets?.palette.find(p => p.id === settings.style?.preset_id);
                tokens = currentPalette?.tokens;
            }
            
            const custom = settings.style?.overrides || {};
            
            const handleColorChange = (key: string, value: string) => {
              onSettingsChange({ style: { ...settings.style!, overrides: { ...custom, [key]: value } } });
            };

            const handleColorCommit = (key: string, value: string) => {
              onSettingsChange({ style: { ...settings.style!, overrides: { ...custom, [key]: value } } });
            };

            const getColor = (key: string) => custom[key] ?? tokens?.[key] ?? "#000000";
            
            const activeColors = Array.from(new Set(Object.values(tokens || {}).map(c => String(c)))).filter(Boolean);

            return (
              <>
                {Object.keys(tokens || {}).map((key) => (
                  <div key={key} className="flex items-center justify-between group">
                    <label className="text-[11px] text-[var(--foreground-muted)] capitalize w-24">
                      {key.replace(/_/g, " ")}
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-[var(--foreground-muted)] w-16 opacity-0 group-hover:opacity-100 transition-opacity">
                        {getColor(key)}
                      </span>
                      <button
                        className="w-5 h-5 rounded-full border border-white/20 shadow-sm cursor-pointer"
                        style={{ backgroundColor: getColor(key) }}
                        title={`Customize ${key}`}
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setActiveColorPicker({ key, rect });
                        }}
                      />
                    </div>
                  </div>
                ))}
                
                {activeColorPicker && (
                  <ColorPickerPopover
                    label={activeColorPicker.key}
                    initialColor={getColor(activeColorPicker.key)}
                    activeColors={activeColors}
                    onChange={(color) => handleColorChange(activeColorPicker.key, color)}
                    onCommit={(color) => handleColorCommit(activeColorPicker.key, color)}
                    onClose={() => setActiveColorPicker(null)}
                    triggerRect={activeColorPicker.rect}
                  />
                )}
              </>
            );
          })()}
        </div>
      </section>

      {/* ── Poster text ── */}
      <section className="animate-fade-in" style={{ animationDelay: "0.15s" }}>
        <h2 className="section-header mb-2.5">Text</h2>
        <div className="space-y-2.5">
          <div>
            <label htmlFor="title" className="glass-label">
              Title
            </label>
            <input
              id="title"
              type="text"
              className="glass-input"
              value={settings.title}
              placeholder="FLOWING GUYANA"
              disabled={settings.design_asset_mode}
              onChange={(e) => onSettingsChange({ title: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="subtitle" className="glass-label">
              Subtitle
            </label>
            <input
              id="subtitle"
              type="text"
              className="glass-input"
              value={settings.subtitle}
              placeholder="River Network of Guyana"
              disabled={settings.design_asset_mode}
              onChange={(e) => onSettingsChange({ subtitle: e.target.value })}
            />
          </div>
        </div>
      </section>

      {/* ── Toggles ── */}
      <section className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
        <h2 className="section-header mb-2.5">Layers</h2>
        <div className="space-y-2 text-[13px] text-[var(--foreground)]">
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <input
              type="checkbox"
              className="glass-checkbox"
              checked={settings.show_legend}
              disabled={settings.design_asset_mode}
              onChange={(e) =>
                onSettingsChange({ show_legend: e.target.checked })
              }
            />
            <span className="transition-colors duration-200 group-hover:text-[var(--foreground)]">
              Legend
            </span>
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <input
              type="checkbox"
              className="glass-checkbox"
              checked={settings.show_metadata}
              disabled={settings.design_asset_mode}
              onChange={(e) =>
                onSettingsChange({ show_metadata: e.target.checked })
              }
            />
            <span className="transition-colors duration-200 group-hover:text-[var(--foreground)]">
              Metadata &amp; scale bar
            </span>
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <input
              type="checkbox"
              className="glass-checkbox"
              checked={settings.design_asset_mode}
              onChange={(e) =>
                onSettingsChange({ design_asset_mode: e.target.checked })
              }
            />
            <span className="transition-colors duration-200 group-hover:text-[var(--foreground)]">
              Design asset mode
            </span>
          </label>
        </div>
      </section>

      {/* ── Export ── */}
      <section
        className="mt-auto border-t border-white/[0.06] pt-4 animate-fade-in"
        style={{ animationDelay: "0.25s" }}
      >
        <h2 className="section-header mb-2.5">Export</h2>
        <div className="space-y-2.5">
          <div className="flex gap-2">
            <div className="flex-1">
              <label htmlFor="export-format" className="glass-label">
                Format
              </label>
              <select
                id="export-format"
                className="glass-select"
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
              <label htmlFor="export-size" className="glass-label">
                Size
              </label>
              <select
                id="export-size"
                className="glass-select"
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
                <label htmlFor="custom-width" className="glass-label">
                  Width (px)
                </label>
                <input
                  id="custom-width"
                  type="number"
                  min={1000}
                  max={9000}
                  className="glass-input"
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
                <label htmlFor="custom-height" className="glass-label">
                  Height (px)
                </label>
                <input
                  id="custom-height"
                  type="number"
                  min={1000}
                  max={9000}
                  className="glass-input"
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
        </div>
      </section>
    </div>
  );
}
