import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import PosterHeader from "@/components/PosterHeader";

export const metadata: Metadata = {
  title: "Hydrographic Poster Generator",
  description:
    "Turn HydroRIVERS data into print-ready cartography. Select a geography, choose a visual protocol, and generate a poster from the underlying river network.",
};

const POSTERS = [
  {
    src: "/posters/guyana-abyss.webp",
    palette: "Abyss",
    tone: "Dark",
    description: "Cool blue hierarchy on deep navy.",
  },
  {
    src: "/posters/guyana-parchment.webp",
    palette: "Parchment",
    tone: "Light",
    description: "Fine blue linework on warm paper.",
  },
  {
    src: "/posters/guyana-obsidian.webp",
    palette: "Obsidian",
    tone: "Dark",
    description: "High-contrast rivers on near black.",
  },
];

const PROCESS_STEPS = [
  {
    number: "01",
    title: "Clip a boundary",
    description:
      "Choose a supported geography. PostGIS clips the HydroRIVERS network to its exact boundary.",
    src: "/posters/guyana-abyss.webp",
    imageClass: "object-cover object-[50%_48%] scale-[1.7]",
  },
  {
    number: "02",
    title: "Classify the network",
    description:
      "Density rules sort rivers into a restrained visual hierarchy, from primary channels to minor tributaries.",
    src: "/posters/guyana-abyss.webp",
    imageClass: "object-cover object-[50%_50%] scale-[2.1]",
  },
  {
    number: "03",
    title: "Compose the poster",
    description:
      "Typography, legend, north arrow, scale, and source details are placed through a consistent poster protocol.",
    src: "/posters/guyana-abyss.webp",
    imageClass: "object-cover object-top",
  },
  {
    number: "04",
    title: "Render for use",
    description:
      "Review the finished composition, then export it for print or continue working with the vector design asset.",
    src: "/posters/guyana-obsidian.webp",
    imageClass: "object-cover object-bottom",
  },
];

export default function PosterLandingPage() {
  return (
    <main className="min-h-screen bg-[var(--ui-page)] text-[var(--ui-text)]">
      <PosterHeader current="home" />

      <section className="relative w-full overflow-hidden border-b border-[var(--ui-border)] bg-[#e6edf2]">
        <div className="relative mx-auto min-h-[680px] w-full max-w-[90rem] px-5 sm:px-8 lg:min-h-[720px] lg:px-12">
          <div className="relative z-20 max-w-[35rem] pt-12 sm:pt-16 lg:flex lg:min-h-[720px] lg:flex-col lg:justify-center lg:pt-0">
            <p className="mb-5 text-xs font-bold uppercase text-[#b4234f]">
              Live data. Deliberate composition.
            </p>
            <h1
              className="mb-6 max-w-[12ch] text-[2.85rem] font-semibold leading-[1.03] text-[var(--ui-text)] sm:text-[3.5rem] lg:text-[4.25rem]"
              style={{
                fontFamily: "var(--font-playfair), 'Playfair Display', serif",
              }}
            >
              Hydrographic Poster Generator
            </h1>
            <p className="mb-8 max-w-[34rem] text-base leading-relaxed text-[var(--ui-text-muted)] sm:text-lg">
              Turn HydroRIVERS data into print-ready cartography. Select a
              geography, choose a visual protocol, and generate a poster from
              the underlying river network.
            </p>
            <div>
              <Link
                href="/studio"
                className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[var(--ui-action)] px-6 py-3 text-base font-semibold text-[var(--ui-text-inverse)] shadow-sm transition-colors duration-200 hover:bg-[var(--ui-action-hover)]"
              >
                Create a poster
              </Link>
            </div>
          </div>

          <div className="relative mt-5 h-[290px] lg:absolute lg:inset-y-0 lg:left-[50%] lg:right-0 lg:mt-0 lg:h-auto">
            <Image
              src="/posters/guyana-parchment.webp"
              alt=""
              width={600}
              height={900}
              loading="eager"
              className="absolute bottom-3 left-[3%] h-[220px] w-auto border border-white shadow-lg sm:left-[15%] sm:h-[245px] lg:left-auto lg:right-[2%] lg:top-[12%] lg:h-[76%]"
            />
            <Image
              src="/posters/guyana-obsidian.webp"
              alt=""
              width={600}
              height={900}
              loading="eager"
              className="absolute bottom-3 right-[3%] h-[220px] w-auto border border-white/20 shadow-lg sm:right-[15%] sm:h-[245px] lg:right-[31%] lg:top-[18%] lg:h-[68%]"
            />
            <Image
              src="/posters/guyana-abyss.webp"
              alt="Generated Guyana river network poster using the Abyss palette"
              width={600}
              height={900}
              priority
              className="absolute bottom-0 left-1/2 z-10 h-[285px] w-auto -translate-x-1/2 border border-white/20 shadow-2xl lg:left-[4%] lg:top-[6%] lg:h-[88%] lg:translate-x-0"
            />
          </div>
        </div>
      </section>

      <section className="bg-[var(--ui-panel)] px-5 py-20 sm:px-8 lg:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 max-w-2xl">
            <p className="mb-3 text-xs font-bold uppercase text-[var(--ui-action)]">
              One geography, three treatments
            </p>
            <h2
              className="mb-4 text-3xl font-semibold text-[var(--ui-text)] sm:text-4xl"
              style={{
                fontFamily: "var(--font-playfair), 'Playfair Display', serif",
              }}
            >
              The data stays fixed. The visual protocol changes.
            </h2>
            <p className="leading-relaxed text-[var(--ui-text-muted)]">
              Each example below was generated from the same Guyana river
              network using a current application palette.
            </p>
          </div>

          <div className="-mx-5 flex snap-x gap-4 overflow-x-auto px-5 pb-4 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0 lg:gap-8">
            {POSTERS.map((poster) => (
              <figure
                key={poster.palette}
                className="w-[15rem] shrink-0 snap-start overflow-hidden rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface-muted)] sm:w-auto"
              >
                <Image
                  src={poster.src}
                  alt={`Guyana river network poster in the ${poster.palette} palette`}
                  width={600}
                  height={900}
                  loading="eager"
                  className="h-auto w-full"
                />
                <figcaption className="border-t border-[var(--ui-border)] p-2 sm:p-4">
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                    <span className="text-xs font-semibold text-[var(--ui-text)] sm:text-base">
                      {poster.palette}
                    </span>
                    <span className="text-[0.625rem] uppercase text-[var(--ui-text-muted)] sm:text-xs">
                      {poster.tone}
                    </span>
                  </div>
                  <p className="mt-2 hidden text-sm leading-relaxed text-[var(--ui-text-muted)] sm:block">
                    {poster.description}
                  </p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-[var(--ui-border)] bg-[var(--ui-surface)] px-5 py-20 sm:px-8 lg:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 max-w-2xl">
            <p className="mb-3 text-xs font-bold uppercase text-[#a94b08]">
              From spatial data to finished artwork
            </p>
            <h2
              className="text-3xl font-semibold text-[var(--ui-text)] sm:text-4xl"
              style={{
                fontFamily: "var(--font-playfair), 'Playfair Display', serif",
              }}
            >
              A constrained workflow with a clear result.
            </h2>
          </div>

          <ol className="grid gap-10 md:grid-cols-2 lg:grid-cols-4 lg:gap-0">
            {PROCESS_STEPS.map((step) => (
              <li
                key={step.number}
                className="border-t border-[var(--ui-border-strong)] pt-4 lg:px-5 lg:first:pl-0 lg:last:pr-0"
              >
                <div className="relative mb-5 aspect-[4/3] overflow-hidden rounded-lg bg-[var(--ui-panel)]">
                  <Image
                    src={step.src}
                    alt=""
                    fill
                    loading="eager"
                    sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 25vw"
                    className={step.imageClass}
                  />
                </div>
                <p className="mb-2 text-xs font-bold text-[var(--ui-action)]">
                  {step.number}
                </p>
                <h3 className="mb-2 text-lg font-semibold text-[var(--ui-text)]">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-[var(--ui-text-muted)]">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </main>
  );
}
