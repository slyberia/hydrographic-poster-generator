import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import DronePublicHeader from "@/components/drone/DronePublicHeader";

export const metadata: Metadata = {
  title: "Drone Zoning Decision Support",
  description:
    "A Region 4 pilot for examining drone zoning constraints, model sensitivity, and location-level guidance.",
};

const CONSTRAINTS = [
  ["Population", "Built-up areas and the concentration of people."],
  ["Sensitive sites", "Hospitals, schools, utilities, and other critical places."],
  ["Environment", "Protected and environmentally sensitive areas."],
  ["Airspace", "Airports, flight activity, and aviation-related constraints."],
];

export default function DroneLandingPage() {
  return (
    <div className="drone-console drone-public">
      <DronePublicHeader active="home" />
      <main>
        <section className="drone-hero" aria-labelledby="drone-title">
          <Image
            src="/drone/region-4-zoning.png"
            alt="Region 4 drone zoning output showing classified cells around Georgetown"
            fill
            priority
            sizes="100vw"
            className="drone-hero-image"
          />
          <div className="drone-hero-shade" />
          <div className="drone-hero-content">
            <p className="drone-eyebrow">Geospatial decision support for NDC planning</p>
            <h1 id="drone-title">Drone Zoning Decision Support</h1>
            <p className="drone-hero-summary">
              Examine where drone operations face identified constraints, understand
              why an area received its classification, and test how planning
              assumptions change the result.
            </p>
            <div className="drone-hero-actions">
              <Link href="/drone/console" className="drone-primary-link">
                Open Planning Console
              </Link>
              <Link href="/drone/methodology" className="drone-secondary-link">
                Review Methodology
              </Link>
            </div>
            <p className="drone-hero-caption">
              Current pilot: Region 4, Demerara-Mahaica, Guyana
            </p>
          </div>
        </section>

        <section className="drone-entry-band" aria-labelledby="product-surfaces">
          <div className="drone-public-inner">
            <header className="drone-section-heading">
              <p className="drone-eyebrow">Two product surfaces</p>
              <h2 id="product-surfaces">The right level of detail for each audience</h2>
            </header>
            <div className="drone-entry-grid">
              <article>
                <p className="drone-entry-status drone-entry-status-live">Authorized</p>
                <h3>Planning Console</h3>
                <p>
                  Internal workspace for NDC analysts to run scenarios, adjust factor
                  weights, inspect cells, review sensitivity, and export the current
                  map view.
                </p>
                <Link href="/drone/console">Open the console</Link>
              </article>
              <article>
                <p className="drone-entry-status drone-entry-status-live">Public</p>
                <h3>Public Explorer</h3>
                <p>
                  A simplified published-result map for checking a location,
                  understanding its classification, and viewing approved public
                  guidance without model controls.
                </p>
                <Link href="/drone/explore">Open the Explorer</Link>
              </article>
            </div>
          </div>
        </section>

        <section className="drone-purpose-band" aria-labelledby="planning-purpose">
          <div className="drone-public-inner drone-purpose-layout">
            <header className="drone-section-heading">
              <p className="drone-eyebrow">Planning purpose</p>
              <h2 id="planning-purpose">Turn separate constraints into an explainable view</h2>
            </header>
            <div className="drone-purpose-copy">
              <p>
                The pilot divides the study area into small cells, evaluates six
                planning factors, and classifies each cell from Suitable to
                Prohibited. Selecting a cell reveals its score, primary reason,
                factor contributions, hard constraints, and data confidence.
              </p>
              <p>
                Sensitivity analysis then tests whether modest changes to factor
                weights alter the classification, helping analysts distinguish stable
                conclusions from areas that deserve closer review.
              </p>
            </div>
          </div>
        </section>

        <section className="drone-constraints-band" aria-labelledby="constraints-title">
          <div className="drone-public-inner">
            <header className="drone-section-heading">
              <p className="drone-eyebrow">Model inputs</p>
              <h2 id="constraints-title">What the pilot considers</h2>
            </header>
            <div className="drone-constraint-grid">
              {CONSTRAINTS.map(([title, description], index) => (
                <article key={title}>
                  <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="drone-limit-band" aria-labelledby="decision-support">
          <div className="drone-public-inner drone-limit-layout">
            <div>
              <p className="drone-eyebrow">Important limitation</p>
              <h2 id="decision-support">Guidance is not authorization</h2>
            </div>
            <div>
              <p>
                This tool supports planning decisions. It does not replace permission
                from the aviation authority or account for every live operational
                condition, including temporary restrictions, weather, aircraft
                condition, and operator qualifications.
              </p>
              <Link href="/drone/methodology">Read how classifications are calculated</Link>
            </div>
          </div>
        </section>
      </main>
      <footer className="drone-public-footer">
        <span>Drone Zoning Decision Support</span>
        <span>Region 4 decision-support prototype</span>
      </footer>
    </div>
  );
}
