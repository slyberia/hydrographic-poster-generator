"use client";

/** components/drone/GeoSearch.tsx — "is it safe to fly here?" location search.
 *
 * Debounced Photon autocomplete; selecting a result hands the parent a
 * lat/lon + computed h3_index so it can fly the map there and pull the cell's
 * zoning report. Frontend-only: geocoding hits Photon directly, the zone
 * lookup reuses the existing /report endpoint. */

import { useEffect, useRef, useState } from "react";
import { geocode, GeoResult, latLngToCellIndex } from "@/lib/geocode";

const DEBOUNCE_MS = 300;

export default function GeoSearch(props: {
  onPick: (pick: { lat: number; lon: number; h3: string; label: string }) => void;
  disabled?: boolean;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seqRef = useRef(0);

  useEffect(() => {
    const query = q.trim();
    const seq = ++seqRef.current;
    // All state updates live inside the timeout callback (never synchronous in
    // the effect body) per react-hooks/set-state-in-effect.
    const t = setTimeout(async () => {
      if (query.length < 3) {
        setResults([]);
        setError(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await geocode(query);
        if (seq !== seqRef.current) return; // stale response
        setResults(res);
        setOpen(true);
        setError(res.length === 0 ? "No matches." : null);
      } catch {
        if (seq !== seqRef.current) return;
        setError("Location search unavailable.");
      } finally {
        if (seq === seqRef.current) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [q]);

  function pick(r: GeoResult) {
    props.onPick({ lat: r.lat, lon: r.lon, h3: latLngToCellIndex(r.lat, r.lon), label: r.label });
    setQ(r.label);
    setOpen(false);
  }

  return (
    <section aria-label="Find a location" className="geosearch">
      <p className="sectionlabel">Check a location</p>
      <div className="geosearch-box">
        <input
          type="search"
          role="combobox"
          placeholder="Search a place — is it safe to fly?"
          value={q}
          disabled={props.disabled}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          aria-autocomplete="list"
          aria-controls="geosearch-listbox"
          aria-expanded={open}
        />
        {open && results.length > 0 && (
          <ul className="geosearch-list" id="geosearch-listbox" role="listbox">
            {results.map((r, i) => (
              <li key={`${r.lat},${r.lon},${i}`} role="option" aria-selected={false}>
                <button type="button" className="geosearch-opt" onClick={() => pick(r)}>
                  {r.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {loading && <p className="statusline">Searching…</p>}
      {error && <p className="statusline">{error}</p>}
    </section>
  );
}
