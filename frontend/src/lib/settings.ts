import type { PosterSettings } from "@/components/ControlPanel";
import type { TypographyOverrides } from "./api";

/**
 * Updates a specific typography override field in the poster settings,
 * performing a copy, handling empty cleanups, and ensuring type safety.
 */
export function setTypographyOverride<K extends keyof TypographyOverrides>(
  settings: PosterSettings,
  key: K,
  value: TypographyOverrides[K] | undefined
): PosterSettings {
  const nextOverrides: TypographyOverrides = {
    ...settings.typography_overrides,
  };

  if (value === undefined || value === "") {
    delete nextOverrides[key];
  } else {
    nextOverrides[key] = value;
  }

  return {
    ...settings,
    typography_overrides: nextOverrides,
  };
}

/**
 * Clears all typography overrides in the settings.
 */
export function clearTypographyOverrides(settings: PosterSettings): PosterSettings {
  return {
    ...settings,
    typography_overrides: {},
  };
}
