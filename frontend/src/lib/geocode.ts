/** lib/geocode.ts — place-name lookup for the "is it safe to fly here?" search.
 *
 * Uses Photon (Komoot) — free, keyless, CORS-friendly, OSM-backed with
 * type-ahead. Results are biased to the Region-4 coverage bbox so a search
 * lands on the mapped area rather than a same-named place elsewhere. The
 * geocoder never touches our database; the coordinate → zone step is a
 * deterministic H3 lookup (see latLngToCellIndex) against the existing
 * /report endpoint.
 */

import { latLngToCell } from "h3-js";

import { DEFAULT_STUDY_AREA } from "@/lib/studyArea";

const PHOTON_URL = "https://photon.komoot.io/api/";

// Approximate bounding box of the study-area zoning coverage. Used only to
// *bias* Photon results; the authoritative coverage check is the /report lookup
// returning 404 for cells outside the grid. Sourced from the study-area config
// (see lib/studyArea.ts) rather than hardcoded here.
export const COVERAGE_BBOX = {
  minLon: DEFAULT_STUDY_AREA.bbox.west,
  minLat: DEFAULT_STUDY_AREA.bbox.south,
  maxLon: DEFAULT_STUDY_AREA.bbox.east,
  maxLat: DEFAULT_STUDY_AREA.bbox.north,
};

// H3 resolution the grid was built at (mcda_grid.resolution). Must match, or
// computed indexes won't line up with stored cell rows.
const GRID_RESOLUTION = DEFAULT_STUDY_AREA.h3Resolution;

export interface GeoResult {
  label: string;
  lat: number;
  lon: number;
}

/** Deterministic lat/lon → stored h3_index. h3-js v4 matches the Python h3 v4
 * indexes used at ingestion, so the string can be looked up directly. */
export function latLngToCellIndex(lat: number, lon: number): string {
  return latLngToCell(lat, lon, GRID_RESOLUTION);
}

function formatLabel(props: Record<string, unknown>): string {
  // Photon feature properties: name, street, city, state, country, etc.
  const parts = [props.name, props.city ?? props.county, props.state, props.country]
    .filter((p): p is string => typeof p === "string" && p.length > 0);
  // De-dupe consecutive repeats (name === city happens for settlements).
  return parts.filter((p, i) => p !== parts[i - 1]).join(", ");
}

/** Query Photon for up to `limit` candidates, biased to the coverage bbox.
 * Throws on network/HTTP failure; returns [] for a blank query. */
export async function geocode(query: string, limit = 5): Promise<GeoResult[]> {
  const q = query.trim();
  if (!q) return [];
  const { minLon, minLat, maxLon, maxLat } = COVERAGE_BBOX;
  const url =
    `${PHOTON_URL}?q=${encodeURIComponent(q)}&limit=${limit}` +
    `&bbox=${minLon},${minLat},${maxLon},${maxLat}` +
    `&lang=en`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Geocoder error ${res.status}`);
  const data = (await res.json()) as {
    features?: Array<{
      geometry?: { coordinates?: [number, number] };
      properties?: Record<string, unknown>;
    }>;
  };
  const out: GeoResult[] = [];
  for (const f of data.features ?? []) {
    const c = f.geometry?.coordinates;
    if (!c || c.length < 2) continue;
    // GeoJSON order is [lon, lat] — Leaflet and h3 want (lat, lon).
    out.push({ label: formatLabel(f.properties ?? {}), lon: c[0], lat: c[1] });
  }
  return out;
}
