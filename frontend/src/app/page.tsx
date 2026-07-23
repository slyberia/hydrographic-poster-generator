import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import PlatformHeader from "@/components/PlatformHeader";

export const metadata: Metadata = {
  title: "Hydro Platform — Cartography and Drone Zoning",
  description:
    "One platform for two geospatial tools: the Hydrographic Poster Generator for print-ready river cartography, and Drone Zoning Decision Support for Region 4 planning guidance.",
};

const PRODUCTS = [
  {
    key: "poster",
    eyebrow: "Cartographic output",
    title: "Hydrographic Poster Generator",
    summary:
      "Clip a supported geography, choose a visual protocol, and generate print-ready poster cartography from the HydroRIVERS network.",
    image: "/posters/guyana-abyss.webp",
    imageAlt:
      "Generated Guyana river network poster using the Abyss palette",
    imageClass: "object-cover object-top",
    primary: { href: "/poster", label: "Explore the Poster Generator" },
    secondary: { href: "/studio", label: "Open the Studio" },
    accent: "#0868cf",
  },
  {
    key: "drone",
    eyebrow: "Decision support",
    title: "Drone Zoning Decision Support",
    summary:
      "Examine where drone operations face identified constraints across Region 4, understand each classification, and test how planning assumptions change the result.",
    image: "/drone/region-4-zoning.png",
    imageAlt:
      "Region 4 drone zoning output showing classified cells around Georgetown",
    imageClass: "object-cover object-center",
    primary: { href: "/drone", label: "Explore Drone Zoning" },
    secondary: { href: "/drone/methodology", label: "Read the methodology" },
    accent: "#0f766e",
  },
] as const;

export default function PlatformLandingPage() {
  return (
    <main className="flex min-h-screen flex-col bg-[var(--ui-page)] text-[var(--ui-text)]">
      <PlatformHeader current="platform" />

      <section className="border-b border-[var(--ui-border)] bg-[var(--ui-panel)] px-5 pb-6 pt-8 sm:px-8 sm:pb-8 sm:pt-10">
        <div className="mx-auto max-w-6xl">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[var(--ui-action)]">
            One platform, two geospatial tools
          </p>
          <h1
            className="max-w-[20ch] text-[2rem] font-semibold leading-[1.06] text-[var(--ui-text)] sm:text-[2.75rem]"
            style={{
              fontFamily: "var(--font-playfair), 'Playfair Display', serif",
            }}
          >
            Turn spatial data into clear, defensible output.
          </h1>
          <p className="mt-4 max-w-[46rem] text-[0.95rem] leading-relaxed text-[var(--ui-text-muted)] sm:text-base">
            Hydro brings together print-ready river cartography and drone-zoning
            decision support. Both tools start from real data and end in output
            you can use — a finished poster, or an explainable planning view.
          </p>
        </div>
      </section>

      <section
        className="flex-1 px-5 py-8 sm:px-8 sm:py-10"
        aria-label="Platform products"
      >
        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2 lg:gap-8">
          {PRODUCTS.map((product) => (
            <article
              key={product.key}
              className="flex flex-col overflow-hidden rounded-xl border border-[var(--ui-border)] bg-[var(--ui-panel)] shadow-sm"
            >
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-[var(--ui-surface)]">
                <Image
                  src={product.image}
                  alt={product.imageAlt}
                  fill
                  priority
                  sizes="(max-width: 767px) 100vw, 50vw"
                  className={product.imageClass}
                />
              </div>
              <div className="flex flex-1 flex-col p-6 sm:p-8">
                <p
                  className="mb-3 text-xs font-bold uppercase tracking-wide"
                  style={{ color: product.accent }}
                >
                  {product.eyebrow}
                </p>
                <h2
                  className="mb-3 text-2xl font-semibold text-[var(--ui-text)] sm:text-3xl"
                  style={{
                    fontFamily:
                      "var(--font-playfair), 'Playfair Display', serif",
                  }}
                >
                  {product.title}
                </h2>
                <p className="mb-6 flex-1 text-[0.95rem] leading-relaxed text-[var(--ui-text-muted)]">
                  {product.summary}
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href={product.primary.href}
                    className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--ui-action)] px-5 py-2.5 text-sm font-semibold text-[var(--ui-text-inverse)] shadow-sm transition-colors duration-200 hover:bg-[var(--ui-action-hover)]"
                  >
                    {product.primary.label}
                  </Link>
                  <Link
                    href={product.secondary.href}
                    className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--ui-border-strong)] px-5 py-2.5 text-sm font-semibold text-[var(--ui-text)] transition-colors duration-200 hover:bg-[var(--ui-surface)]"
                  >
                    {product.secondary.label}
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t border-[var(--ui-border)] bg-[var(--ui-panel)] px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 text-sm text-[var(--ui-text-muted)] sm:flex-row sm:items-center sm:justify-between">
          <span className="font-semibold text-[var(--ui-text)]">
            Hydro Platform
          </span>
          <span>
            Hydrographic Poster Generator · Drone Zoning Decision Support
            (Region 4 pilot)
          </span>
        </div>
      </footer>
    </main>
  );
}
