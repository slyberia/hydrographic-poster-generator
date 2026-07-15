import { PosterSettings } from "@/components/ControlPanel";
import { MetadataOptions, TypographyOverrides, LayoutOverrides } from "./api";

// The shape of settings inside ControlPanel before Phase 2A
export interface LegacyPosterSettings {
  geography_id: string;
  density_preset: string;
  classification_preset: string;
  style?: any;
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

export function migratePosterSettings(saved: any): PosterSettingsV2 {
  if (saved && saved.schema_version === 2) {
    return saved as PosterSettingsV2;
  }

  // Construct default V2 shape from the legacy one
  return {
    ...saved,
    schema_version: 2,
    metadata_options: {
      show_title: saved?.show_metadata ?? true,
      show_subtitle: saved?.show_metadata ?? true,
      show_legend: saved?.show_legend ?? true,
      show_north_arrow: saved?.show_metadata ?? true,
      show_scale_bar: saved?.show_metadata ?? true,
      show_data_credits: saved?.show_metadata ?? true,
    },
    typography_overrides: {},
    layout_overrides: {},
  };
}
