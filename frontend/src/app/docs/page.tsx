"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import "swagger-ui-react/swagger-ui.css";

const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-200 p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12 flex items-center justify-between border-b border-neutral-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">API Documentation & Glossary</h1>
            <p className="text-neutral-400">
              Reference for the Hydrographic Poster Generator FastAPI backend.
            </p>
          </div>
          <Link
            href="/"
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-[var(--foreground)] rounded transition-colors"
          >
            &larr; Back to App
          </Link>
        </header>

        <section className="mb-16">
          <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-6">Glossary</h2>
          <div className="bg-neutral-800 rounded-lg p-6 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-700 text-neutral-300">
                  <th className="py-3 px-4 font-medium">Term</th>
                  <th className="py-3 px-4 font-medium">Definition</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-700 text-neutral-400">
                <tr>
                  <td className="py-4 px-4 font-medium text-neutral-200 align-top">Display Class</td>
                  <td className="py-4 px-4">Cartographic rank assigned to a river segment (e.g., major, primary, secondary, minor) determining its stroke width and color in the rendering engine.</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 font-medium text-neutral-200 align-top">Stream Order</td>
                  <td className="py-4 px-4">A numerical measure of the branching complexity of a river network. Higher orders indicate larger rivers (e.g., the Amazon).</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 font-medium text-neutral-200 align-top">Upstream Area</td>
                  <td className="py-4 px-4">The total catchment area (in km²) that drains into a specific river segment. Used in sensitivity algorithms for filtering small tributaries.</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 font-medium text-neutral-200 align-top">Projection Distortion</td>
                  <td className="py-4 px-4">The stretching effect that occurs when rendering lat/lon coordinates natively. The backend uses EPSG:3857 (Web Mercator) to maintain local shape.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-6">FAQ</h2>
          <div className="space-y-6">
            <div className="bg-neutral-800 rounded-lg p-6">
              <h3 className="text-lg font-medium text-[var(--foreground)] mb-2">How are geometries repaired?</h3>
              <p className="text-neutral-400">
                During the clipping process, PostGIS runs <code>ST_MakeValid</code> to fix self-intersecting or malformed river polygons. If more than 5% of a map's features required active repair, a confidence warning is automatically attached to the export metadata.
              </p>
            </div>
            <div className="bg-neutral-800 rounded-lg p-6">
              <h3 className="text-lg font-medium text-[var(--foreground)] mb-2">What is Design Asset Mode?</h3>
              <p className="text-neutral-400">
                Enabling Design Asset Mode strips all background colors, metadata, scale bars, and legends from the generated SVG. The result is a pure vector network on a transparent background, ready for importing into design software like Illustrator.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-6">Interactive API Schema</h2>
          <div className="bg-white rounded-lg p-4">
            <SwaggerUI url={`${API_BASE}/openapi.json`} />
          </div>
        </section>
      </div>
    </div>
  );
}
