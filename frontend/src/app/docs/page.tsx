"use client";

import dynamic from "next/dynamic";
import "swagger-ui-react/swagger-ui.css";
import PosterHeader from "@/components/PosterHeader";

const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-[var(--ui-page)] text-[var(--ui-text)] font-sans">
      <PosterHeader current="docs" />
      <div className="max-w-6xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-12 border-b border-[var(--ui-border)] pb-6">
          <h1 className="text-3xl font-bold text-[var(--ui-text)] mb-2">API Documentation & Glossary</h1>
          <p className="text-[var(--ui-text-muted)]">
            Reference for the Hydrographic Poster Generator FastAPI backend.
          </p>
        </div>

        <section className="mb-16">
          <h2 className="text-2xl font-semibold text-[var(--ui-text)] mb-6">Glossary</h2>
          <div className="bg-[var(--ui-panel)] border border-[var(--ui-border)] rounded-lg p-4 sm:p-6 overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--ui-border)] text-[var(--ui-text)]">
                  <th className="py-3 px-4 font-medium">Term</th>
                  <th className="py-3 px-4 font-medium">Definition</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--ui-border)] text-[var(--ui-text-muted)]">
                <tr>
                  <td className="py-4 px-4 font-medium text-[var(--ui-text)] align-top">Display Class</td>
                  <td className="py-4 px-4">Cartographic rank assigned to a river segment (e.g., major, primary, secondary, minor) determining its stroke width and color in the rendering engine.</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 font-medium text-[var(--ui-text)] align-top">Stream Order</td>
                  <td className="py-4 px-4">A numerical measure of the branching complexity of a river network. Higher orders indicate larger rivers (e.g., the Amazon).</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 font-medium text-[var(--ui-text)] align-top">Upstream Area</td>
                  <td className="py-4 px-4">The total catchment area (in km²) that drains into a specific river segment. Used in sensitivity algorithms for filtering small tributaries.</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 font-medium text-[var(--ui-text)] align-top">Projection Distortion</td>
                  <td className="py-4 px-4">The stretching effect that occurs when rendering lat/lon coordinates natively. The backend uses EPSG:3857 (Web Mercator) to maintain local shape.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-2xl font-semibold text-[var(--ui-text)] mb-6">FAQ</h2>
          <div className="space-y-6">
            <div className="bg-[var(--ui-panel)] border border-[var(--ui-border)] rounded-lg p-6">
              <h3 className="text-lg font-medium text-[var(--ui-text)] mb-2">How are geometries repaired?</h3>
              <p className="text-[var(--ui-text-muted)]">
                During the clipping process, PostGIS runs <code>ST_MakeValid</code> to fix self-intersecting or malformed river polygons. If more than 5% of a map&apos;s features required active repair, a confidence warning is automatically attached to the export metadata.
              </p>
            </div>
            <div className="bg-[var(--ui-panel)] border border-[var(--ui-border)] rounded-lg p-6">
              <h3 className="text-lg font-medium text-[var(--ui-text)] mb-2">What is Design Asset Mode?</h3>
              <p className="text-[var(--ui-text-muted)]">
                Enabling Design Asset Mode strips all background colors, metadata, scale bars, and legends from the generated SVG. The result is a pure vector network on a transparent background, ready for importing into design software like Illustrator.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-[var(--ui-text)] mb-6">Interactive API Schema</h2>
          <div className="bg-[var(--ui-panel)] border border-[var(--ui-border)] rounded-lg p-4 overflow-hidden">
            <SwaggerUI url={`${API_BASE}/openapi.json`} />
          </div>
        </section>
      </div>
    </div>
  );
}
