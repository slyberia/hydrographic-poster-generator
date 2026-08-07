import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import PlatformHeader from "@/components/PlatformHeader";

export const metadata: Metadata = {
  title: "HPS Geospatial — Spatial systems and decision support",
  description: "HPS Geospatial brings together Drone Zoning Decision Support and the Hydrographic Poster Generator.",
};

const PRODUCTS = [
  { key: "drone", eyebrow: "Decision support", title: "Drone Zoning", summary: "A configurable, policy-driven platform for evaluating operating suitability and explaining spatial decisions across Region 4.", image: "/drone/region-4-zoning.png", href: "/drone", linkLabel: "Open Drone Zoning" },
  { key: "poster", eyebrow: "Spatial systems", title: "Hydrographic Poster Generator", summary: "Generate print-ready river cartography from supported HydroRIVERS geographies with a repeatable composition and export workflow.", image: "/posters/guyana-abyss.webp", href: "/poster", linkLabel: "Open Poster Generator" },
  { key: "docs", eyebrow: "System library", title: "Documentation", summary: "Understand the software stack, architecture, operating model, and implementation status behind the HPS portal and its products.", image: "/hps/hps-lockup-horizontal.svg", href: "/docs", linkLabel: "Browse Documentation" },
] as const;

export default function PlatformLandingPage() {
  return (
    <main className="hps-portal">
      <PlatformHeader current="platform" />
      <section className="hps-hero" aria-labelledby="portal-title">
        <div className="hps-hero__inner">
          <div>
            <p className="hps-hero__eyebrow">HPS Geospatial / spatial systems / decision support</p>
            <h1 id="portal-title">Turn spatial data into clear, defensible output.</h1>
            <p className="hps-hero__copy">A focused family of tools for planning, communicating, and acting on spatial information—from a finished hydrographic poster to an explainable drone-zoning decision.</p>
            <div className="hps-actions">
              <Link className="hps-button hps-button--gold" href="/drone">Explore the platform</Link>
              <Link className="hps-button hps-button--outline" href="/executive-overview">View executive overview</Link>
            </div>
          </div>
          <div className="hps-hero__visual" role="img" aria-label="Drone zoning map preview for the Region 4 pilot" />
        </div>
      </section>
      <section className="hps-section hps-section--bordered" aria-labelledby="products-title">
        <div className="hps-section__heading">
          <p className="hps-section__eyebrow">The HPS platform</p>
          <h2 className="hps-section__title" id="products-title">One parent system, two working applications.</h2>
          <p className="hps-section__copy">HPS Geospatial provides the shared foundation. Each product has a distinct purpose, workflow, and audience, with documentation tying the system together.</p>
        </div>
        <div className="hps-card-grid">
          {PRODUCTS.map((product) => (
            <article className="hps-card" key={product.key}>
              <Image className="hps-card__image" src={product.image} alt="" width={900} height={500} />
              <div className="hps-card__body">
                <p className="hps-card__eyebrow">{product.eyebrow}</p>
                <h3>{product.title}</h3>
                <p>{product.summary}</p>
                <Link href={product.href}>{product.linkLabel} →</Link>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="hps-section hps-section--bordered" aria-labelledby="value-title">
        <div className="hps-section__heading">
          <p className="hps-section__eyebrow">Designed for informed planning</p>
          <h2 className="hps-section__title" id="value-title">From fragmented data to a shared decision surface.</h2>
        </div>
        <div className="hps-statband" aria-label="Platform principles">
          <div className="hps-stat"><strong>01</strong><span>Consolidate authoritative spatial inputs.</span></div>
          <div className="hps-stat"><strong>02</strong><span>Apply transparent rules and priorities.</span></div>
          <div className="hps-stat"><strong>03</strong><span>Explain the result and export the work.</span></div>
        </div>
      </section>
      <footer className="hps-footer"><div className="hps-footer__inner"><span>HPS Geospatial · Region 4 pilot</span><Link href="/docs">Documentation</Link></div></footer>
    </main>
  );
}
