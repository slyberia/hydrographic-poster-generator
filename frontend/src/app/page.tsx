import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import PlatformHeader from "@/components/PlatformHeader";
import ExecutiveOverviewMap from "@/components/ExecutiveOverviewMap";
import "@/styles/hps-platform-phase3.css";

export const metadata: Metadata = {
  title: "HPS Geospatial — Spatial systems and decision support",
  description: "HPS Geospatial brings together Drone Zoning Decision Support and the Hydrographic Poster Generator.",
};

const PRODUCTS = [
  { key: "drone", eyebrow: "Decision support", title: "Drone Zoning", summary: "A configurable, policy-driven platform for evaluating operating suitability and explaining spatial decisions across Region 4.", image: "/drone/region-4-zoning.png", imageAlt: "Published Region 4 drone zoning map", href: "/drone/start", linkLabel: "Explore Drone Zoning" },
  { key: "poster", eyebrow: "Spatial systems", title: "Hydrographic Poster Generator", summary: "Generate print-ready river cartography from supported HydroRIVERS geographies with a repeatable composition and export workflow.", image: "/posters/guyana-abyss.webp", imageAlt: "Guyana river-network poster in the Abyss palette", href: "/poster", linkLabel: "Open Poster Generator" },
  { key: "docs", eyebrow: "System library", title: "Documentation", summary: "Understand the software stack, architecture, operating model, and implementation status behind the HPS portal and its products.", image: "/hps/hps-lockup-horizontal.svg", imageAlt: "HPS Geospatial lockup", href: "/docs", linkLabel: "Browse Documentation" },
] as const;

export default function PlatformLandingPage() {
  return (
    <main className="hps-portal hps-theme hps-theme--platform">
      <PlatformHeader current="platform" />
      <section className="hps-hero" aria-labelledby="portal-title">
        <div className="hps-hero__inner">
          <div>
            <p className="hps-hero__eyebrow">HPS Geospatial / spatial systems / decision support</p>
            <h1 id="portal-title">Connecting Form and Function.</h1>
            <p className="hps-hero__copy">A spatial data toolbox for coordinating &amp; communicating—from drone-zoning decisions to hydrology visualizations.</p>
            <div className="hps-actions">
              <Link className="hps-button hps-button--gold" href="/drone/start">Explore Drone Zoning</Link>
              <Link className="hps-button hps-button--outline" href="/poster">Explore poster generator</Link>
            </div>
          </div>
          <div className="hps-hero__visual hps-hero__map">
            <ExecutiveOverviewMap variant="platform" />
          </div>
        </div>
      </section>
      <section className="hps-section hps-section--bordered" aria-labelledby="products-title">
        <div className="hps-section__heading">
          <p className="hps-section__eyebrow">The HPS platform</p>
          <h2 className="hps-section__title" id="products-title">One parent system, two working applications.</h2>
          <p className="hps-section__copy">HPS Geospatial provides the shared foundation. Choose a product, a working view, or the system library to move from spatial information to a usable output.</p>
        </div>
        <div className="hps-card-grid">
          {PRODUCTS.map((product) => (
            <Link className={`hps-card hps-card--${product.key}`} href={product.href} key={product.key}>
              <Image className="hps-card__image" src={product.image} alt={product.imageAlt} width={900} height={500} />
              <div className="hps-card__body">
                <p className="hps-card__eyebrow">{product.eyebrow}</p>
                <h3>{product.title}</h3>
                <p>{product.summary}</p>
                <span className="hps-card__action">{product.linkLabel} <span aria-hidden="true">→</span></span>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <footer className="hps-footer"><div className="hps-footer__inner"><span>HPS Geospatial · Region 4 pilot</span><Link href="/docs">Documentation</Link></div></footer>
    </main>
  );
}
