"use client";

import { useEffect, useState } from "react";
import PosterHeader from "@/components/PosterHeader";

export default function AboutPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[var(--ui-page)] text-[var(--ui-text)] font-sans pb-32">
      <PosterHeader current="about" />

      {/* ── Asymmetric Layout Container ── */}
      <div className="relative z-10 max-w-[1400px] mx-auto px-6 sm:px-12 pt-24 flex flex-col gap-32">
        
        {/* ── Hero / The Engine ── */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24 items-center animate-fade-in">
          <div className="lg:col-span-7 flex flex-col gap-6">
            <h1 
              className="font-semibold leading-[1.1] tracking-tight text-[var(--ui-text)]"
              style={{ 
                fontFamily: "var(--font-playfair), 'Playfair Display', serif",
                fontSize: "clamp(3rem, 6vw, 5.5rem)"
              }}
            >
              The Architecture of Aesthetics.
            </h1>
            <p 
              className="text-[var(--ui-text-muted)] font-light leading-relaxed max-w-[65ch]"
              style={{ fontSize: "clamp(1.125rem, 2vw, 1.5rem)" }}
            >
              This isn&apos;t just a design tool. It&apos;s a lens into the unique intersection of rigorous geographic information systems (GIS) and minimalist cartographic art.
            </p>
          </div>
          <div className="lg:col-span-5 relative">
            {/* Abstract visual reference to a database/rendering engine */}
            <div className="w-full aspect-square rounded-full border border-[var(--ui-border)] bg-[var(--ui-surface)] flex items-center justify-center relative overflow-hidden">
              <div className="text-[10px] text-[var(--ui-text-muted)] uppercase tracking-[0.2em] font-mono opacity-70">
                POSTGIS_GEOM_CLIP
              </div>
              <div className="absolute top-1/2 left-0 w-full h-[1px] bg-[var(--ui-border)]" />
              <div className="absolute left-1/2 top-0 h-full w-[1px] bg-[var(--ui-border)]" />
            </div>
          </div>
        </section>

        {/* ── The Data & PostGIS Backbone ── */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24 items-start">
          <div className="lg:col-span-4 lg:col-start-2 pt-4">
            <h2 
              className="font-medium text-[var(--ui-text)] tracking-tight"
              style={{ 
                fontFamily: "var(--font-playfair), 'Playfair Display', serif",
                fontSize: "clamp(2rem, 3vw, 2.5rem)"
              }}
            >
              PostgreSQL <br/> Backbone
            </h2>
          </div>
          <div className="lg:col-span-6 flex flex-col gap-8">
            <p className="text-lg leading-relaxed text-[var(--ui-text)]">
              Behind the glassmorphic controls lies a heavy-duty spatial engine. We use PostgreSQL and PostGIS to query and dynamically clip the massive <span className="text-[var(--ui-text)] font-medium">HydroRIVERS dataset</span> — mapping over 32 million kilometers of global river networks.
            </p>
            <p className="text-[var(--ui-text-muted)] leading-relaxed">
              When you select a geography, the engine isn&apos;t just loading a static image. It is executing complex spatial intersections in real-time, calculating upstream areas, and assigning cartographic display classes to raw geometric data before translating it into vector art.
            </p>
          </div>
        </section>

        {/* ── Best Uses ── */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24 items-center">
           <div className="lg:col-span-4 lg:col-start-2 pt-4">
            <h2 
              className="font-medium text-[var(--ui-text)] tracking-tight"
              style={{ 
                fontFamily: "var(--font-playfair), 'Playfair Display', serif",
                fontSize: "clamp(2rem, 3vw, 2.5rem)"
              }}
            >
              Best Uses
            </h2>
          </div>
          <div className="lg:col-span-6 flex flex-col gap-12">
            <div className="flex flex-col gap-3">
              <h3 className="text-xl text-[var(--ui-text)] font-medium">Cartographic Posters</h3>
              <p className="text-[var(--ui-text-muted)] leading-relaxed">
                Export high-resolution PDF or PNG posters for physical printing or digital display. The rigid typographic rules ensure the output always feels like a gallery piece.
              </p>
            </div>
            
            <div className="flex flex-col gap-3">
              <h3 className="text-xl text-[var(--ui-text)] font-medium">Design Assets</h3>
              <p className="text-[var(--ui-text-muted)] leading-relaxed">
                Switch to &quot;Design Asset Mode&quot; to strip away the background, text, and metadata. Export the raw, transparent SVG river network to incorporate real spatial data into your own Adobe Illustrator or Figma workflows.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="text-xl text-[var(--ui-text)] font-medium">Data Visualization</h3>
              <p className="text-[var(--ui-text-muted)] leading-relaxed">
                Communicate the density, scale, and beauty of watersheds and river basins instantly, without the steep learning curve of traditional GIS software.
              </p>
            </div>
          </div>
        </section>

        {/* ── Limitations & Philosophy ── */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24 items-start">
           <div className="lg:col-span-4 lg:col-start-2 pt-4">
            <h2 
              className="font-medium text-[var(--ui-text)] tracking-tight"
              style={{ 
                fontFamily: "var(--font-playfair), 'Playfair Display', serif",
                fontSize: "clamp(2rem, 3vw, 2.5rem)"
              }}
            >
              Intentional <br/> Constraints
            </h2>
          </div>
          <div className="lg:col-span-6 flex flex-col gap-8">
            <p className="text-lg leading-relaxed text-[var(--ui-text)]">
              This is a protocol-driven generator, not a full-fledged GIS viewer. The limitations are a feature, not a bug.
            </p>
            <p className="text-[var(--ui-text-muted)] leading-relaxed">
              We intentionally omitted custom data uploads, manual shapefile styling, and unrestricted layout editing. By constraining customization to curated color palettes, specific typography scales, and density presets, we ensure that every generated output adheres to a strict, high-end aesthetic standard.
            </p>
          </div>
        </section>

      </div>
    </main>
  );
}
