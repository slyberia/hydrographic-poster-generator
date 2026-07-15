
import { MetadataOptions, TypographyOverrides, LayoutOverrides } from "./api";

// The shape of settings inside ControlPanel before Phase 2A
export interface LegacyPosterSettings {
  geography_id: string;
  density_preset: string;
  classification_preset: string;
  style?: Record<string, unknown>;
  palette?: string;
  typography: string;
  title: string;
  subtitle: string;
  design_asset_mode: boolean;
  show_legend: boolean;
  show_metadata: boolean;
}

// The new PosterSettings shape (which should match the exported PosterSettings from ControlPanel)
export interface PosterSettingsV2 extends LegacyPosterSettings {
  schema_version: 2;
  metadata_options: MetadataOptions;
  typography_overrides: TypographyOverrides;
  layout_overrides: LayoutOverrides;
}

export function migratePosterSettings(saved: unknown): PosterSettingsV2 {
  if (saved && typeof saved === "object" && "schema_version" in saved && saved.schema_version === 2) {
    return saved as PosterSettingsV2;
  }

  // Construct default V2 shape from the legacy one
  const legacy = (saved && typeof saved === "object") ? (saved as Record<string, unknown>) : {};
  return {
    ...(legacy as unknown as LegacyPosterSettings),
    schema_version: 2,
    metadata_options: {
      show_title: (legacy.show_metadata as boolean | undefined) ?? true,
      show_subtitle: (legacy.show_metadata as boolean | undefined) ?? true,
      show_legend: (legacy.show_legend as boolean | undefined) ?? true,
      show_north_arrow: (legacy.show_metadata as boolean | undefined) ?? true,
      show_scale_bar: (legacy.show_metadata as boolean | undefined) ?? true,
      show_data_credits: (legacy.show_metadata as boolean | undefined) ?? true,
    },
    typography_overrides: {},
    layout_overrides: {},
  };
}
