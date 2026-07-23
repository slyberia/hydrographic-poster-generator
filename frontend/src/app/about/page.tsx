import Image from "next/image";
import Link from "next/link";

import PosterHeader from "@/components/PosterHeader";

const PROCESS_STEPS = [
  {
    number: "01",
    title: "Boundary selection",
    description:
      "Choose a supported country or administrative area from the geography registry.",
    detail: "Input: geoBoundaries geometry",
  },
  {
    number: "02",
    title: "PostGIS clipping",
    description:
      "Intersect HydroRIVERS line geometries with the selected boundary and retain the relevant network.",
    detail: "Operation: spatial intersection",
  },
  {
    number: "03",
    title: "Network classification",
    description:
      "Apply the selected density rules and translate source hierarchy into a restrained visual system.",
    detail: "Result: display classes",
  },
  {
    number: "04",
    title: "SVG composition",
    description:
      "Combine the classified network with typography, legend, scale, orientation, and source details.",
    detail: "Renderer: shared preview/export path",
  },
  {
    number: "05",
    title: "Export",
    description:
      "Render the reviewed composition for print, digital display, or continued vector design work.",
    detail: "Formats: SVG, PNG, PDF",
  },
];

const USE_CASES = [
  {
    title: "Cartographic posters",
    description:
      "Create high-resolution compositions for print or digital display without rebuilding the spatial workflow in desktop GIS software.",
  },
  {
    title: "Vector design assets",
    description:
      "Export a transparent river network as SVG or PNG for use inside a broader design composition.",
  },
  {
    title: "Spatial communication",
    description:
      "Show the density and hierarchy of a river network through a consistent, readable visual protocol.",
  },
];

const CONSTRAINTS = [
  "No custom dataset uploads in the current product.",
  "No unrestricted cartographic styling or full GIS toolset.",
  "No global runtime dataset; current coverage is regional.",
  "Design assets use SVG or PNG, while poster exports also support PDF.",
];

export default function AboutPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[var(--ui-page)] text-[var(--ui-text)]">
      <PosterHeader current="about" />

      <section className="border-b border-[var(--ui-border)] bg-[var(--ui-panel)] px-5 py-16 sm:px-8 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-6xl">
          <p className="mb-5 text-xs font-bold uppercase text-[#b4234f]">
            About Hydro Poster
          </p>
          <h1
            className="max-w-[14ch] text-4xl font-semibold leading-[1.05] text-[var(--ui-text)] sm:text-5xl lg:text-6xl"
            style={{
              fontFamily: "var(--font-playfair), 'Playfair Display', serif",
            }}
          >
            River data, composed for print.
          </h1>
          <p className="mt-7 max-w-3xl text-lg leading-relaxed text-[var(--ui-text-muted)] sm:text-xl">
            Hydro Poster turns a professional GIS workflow into a constrained
            creative tool. It clips real hydrographic data to a selected place,
            applies a consistent cartographic hierarchy, and produces a finished
            poster or reusable vector asset.
          </p>

          <dl className="mt-12 grid border-t border-[var(--ui-border-strong)] sm:grid-cols-3">
            <div className="border-b border-[var(--ui-border)] py-5 sm:border-b-0 sm:border-r sm:pr-6">
              <dt className="text-xs font-bold uppercase text-[var(--ui-text-muted)]">
                Runtime coverage
              </dt>
              <dd className="mt-2 text-sm font-medium text-[var(--ui-text)]">
                South America and North/Central America
              </dd>
            </div>
            <div className="border-b border-[var(--ui-border)] py-5 sm:border-b-0 sm:border-r sm:px-6">
              <dt className="text-xs font-bold uppercase text-[var(--ui-text-muted)]">
                Spatial sources
              </dt>
              <dd className="mt-2 text-sm font-medium text-[var(--ui-text)]">
                HydroRIVERS v1.0 and geoBoundaries
              </dd>
            </div>
            <div className="py-5 sm:pl-6">
              <dt className="text-xs font-bold uppercase text-[var(--ui-text-muted)]">
                Output
              </dt>
              <dd className="mt-2 text-sm font-medium text-[var(--ui-text)]">
                Print posters and transparent design assets
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8 lg:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 max-w-3xl">
            <p className="mb-3 text-xs font-bold uppercase text-[#a94b08]">
              From boundary to finished artwork
            </p>
            <h2
              className="text-3xl font-semibold text-[var(--ui-text)] sm:text-4xl"
              style={{
                fontFamily: "var(--font-playfair), 'Playfair Display', serif",
              }}
            >
              A visible result backed by a spatial pipeline.
            </h2>
            <p className="mt-5 leading-relaxed text-[var(--ui-text-muted)]">
              The interface presents a short creative workflow. Underneath it,
              each render moves through five explicit stages.
            </p>
          </div>

          <ol className="grid gap-8 md:grid-cols-2 lg:grid-cols-5 lg:gap-0">
            {PROCESS_STEPS.map((step) => (
              <li
                key={step.number}
                className="border-t border-[var(--ui-border-strong)] pt-4 lg:px-4 lg:first:pl-0 lg:last:pr-0"
              >
                <p className="mb-6 font-mono text-xs font-semibold text-[var(--ui-action)]">
                  {step.number}
                </p>
                <h3 className="text-base font-semibold text-[var(--ui-text)]">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-[var(--ui-text-muted)]">
                  {step.description}
                </p>
                <p className="mt-5 border-l-2 border-[var(--ui-border-strong)] pl-3 font-mono text-[11px] leading-relaxed text-[var(--ui-text-muted)]">
                  {step.detail}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-y border-[var(--ui-border)] bg-[#172033] px-5 py-20 text-white sm:px-8 lg:py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,25rem)] lg:gap-20">
          <div>
            <p className="mb-3 text-xs font-bold uppercase text-[#9dc8ff]">
              One source, two working modes
            </p>
            <h2
              className="max-w-[15ch] text-3xl font-semibold sm:text-4xl"
              style={{
                fontFamily: "var(--font-playfair), 'Playfair Display', serif",
              }}
            >
              Finished composition or reusable geometry.
            </h2>
            <div className="mt-8 grid gap-8 sm:grid-cols-2">
              <div className="border-t border-white/30 pt-4">
                <h3 className="font-semibold">Poster mode</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/70">
                  Preserves the complete composition, including typography,
                  cartographic elements, and source information.
                </p>
              </div>
              <div className="border-t border-white/30 pt-4">
                <h3 className="font-semibold">Design asset mode</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/70">
                  Removes the poster chrome and exports the river network on a
                  transparent background for continued design work.
                </p>
              </div>
            </div>
            <p className="mt-10 max-w-2xl text-sm leading-relaxed text-white/60">
              Preview and export use the same SVG renderer, so layout, type,
              color, and metadata choices follow the reviewed composition into
              the final file.
            </p>
          </div>

          <figure className="mx-auto w-full max-w-[22rem]">
            <Image
              src="/posters/guyana-parchment.webp"
              alt="Generated Guyana river network poster using the Parchment palette"
              width={600}
              height={900}
              sizes="(max-width: 1023px) 352px, 400px"
              loading="eager"
              className="h-auto w-full border border-white/20 shadow-2xl"
            />
            <figcaption className="mt-3 font-mono text-[11px] text-white/60">
              Guyana / balanced density / Parchment palette
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="bg-[var(--ui-panel)] px-5 py-20 sm:px-8 lg:py-24">
        <div className="mx-auto grid max-w-6xl gap-16 lg:grid-cols-2 lg:gap-24">
          <div>
            <p className="mb-3 text-xs font-bold uppercase text-[var(--ui-action)]">
              Where it fits
            </p>
            <h2
              className="text-3xl font-semibold text-[var(--ui-text)]"
              style={{
                fontFamily: "var(--font-playfair), 'Playfair Display', serif",
              }}
            >
              Useful outputs, without GIS overhead.
            </h2>
            <div className="mt-9 space-y-8">
              {USE_CASES.map((useCase) => (
                <div
                  key={useCase.title}
                  className="border-t border-[var(--ui-border)] pt-4"
                >
                  <h3 className="font-semibold text-[var(--ui-text)]">
                    {useCase.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--ui-text-muted)]">
                    {useCase.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-3 text-xs font-bold uppercase text-[#a94b08]">
              Intentional constraints
            </p>
            <h2
              className="text-3xl font-semibold text-[var(--ui-text)]"
              style={{
                fontFamily: "var(--font-playfair), 'Playfair Display', serif",
              }}
            >
              A generator, not a general-purpose GIS.
            </h2>
            <p className="mt-6 leading-relaxed text-[var(--ui-text-muted)]">
              The product narrows a complex cartographic process to the choices
              that materially shape the output. Presets protect consistency and
              make the result reproducible.
            </p>
            <ul className="mt-9 divide-y divide-[var(--ui-border)] border-y border-[var(--ui-border)]">
              {CONSTRAINTS.map((constraint) => (
                <li
                  key={constraint}
                  className="py-4 text-sm leading-relaxed text-[var(--ui-text)]"
                >
                  {constraint}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--ui-border)] bg-[var(--ui-surface)] px-5 py-16 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-7 sm:flex-row sm:items-center">
          <div>
            <h2
              className="text-2xl font-semibold text-[var(--ui-text)] sm:text-3xl"
              style={{
                fontFamily: "var(--font-playfair), 'Playfair Display', serif",
              }}
            >
              Build from the network.
            </h2>
            <p className="mt-2 text-sm text-[var(--ui-text-muted)]">
              Select a supported geography and review the rendered composition.
            </p>
          </div>
          <Link
            href="/studio"
            className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-lg bg-[var(--ui-action)] px-6 py-3 font-semibold text-[var(--ui-text-inverse)] transition-colors hover:bg-[var(--ui-action-hover)]"
          >
            Open the Studio
          </Link>
        </div>
      </section>
    </main>
  );
}
