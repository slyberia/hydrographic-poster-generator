/** lib/studyArea.ts — the study-area presentation contract, in ONE place.
 *
 * These values used to be hardcoded inside components (map center/zoom in
 * MapView, coverage bbox in geocode). ARC-1 moves them out: the authoritative,
 * deployment-neutral source is the backend `GET /public/drone/config` endpoint
 * (see docs/DRONE_PUBLICATION_API.md). This module mirrors that contract and
 * carries the default (Region 4 pilot) so the internal console keeps working
 * synchronously; the Public Explorer (UX-8) hydrates the same shape from the
 * live endpoint.
 */

export interface StudyAreaConfig {
  /** Stable public identifier (matches the backend slug). */
  slug: string;
  displayName: string;
  /** Map center. Leaflet expects [lat, lng]. */
  center: { lat: number; lng: number };
  defaultZoom: number;
  minZoom: number;
  maxZoom: number;
  /** Coverage bounding box (EPSG:4326) used to bias place search. */
  bbox: { west: number; south: number; east: number; north: number };
  /** H3 resolution the grid was built at (mcda_grid.resolution). */
  h3Resolution: number;
}

/** Region 4 pilot — mirrors the seed in migration 010. */
export const DEFAULT_STUDY_AREA: StudyAreaConfig = {
  slug: "region-4-demerara-mahaica",
  displayName: "Region 4 · Demerara-Mahaica",
  center: { lat: 6.6, lng: -58.1 },
  defaultZoom: 10,
  minZoom: 1,
  maxZoom: 18,
  bbox: { west: -58.9, south: 6.0, east: -57.3, north: 7.3 },
  h3Resolution: 9,
};
