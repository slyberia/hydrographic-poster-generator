import Image from "next/image";
import Link from "next/link";

import { DroneMark } from "@/components/brand/DroneIdentity";
import NumberBadge from "@/components/design/NumberBadge";
import DronePublicHeader from "@/components/drone/DronePublicHeader";
import ExecutiveOverviewMap from "@/components/ExecutiveOverviewMap";

const CHALLENGES = [
  ["01", "Fragmented data", "Spatial data is scattered across institutions, formats, and jurisdictions."],
  ["02", "Inconsistent policies", "Lack of aligned policies, standards, and authoritative governance."],
  ["03", "Limited access", "No broadly accessible platform to view, analyze, and understand constraints."],
] as const;

const WORKFLOW = [
  ["01", "Consolidate data", "Integrate authoritative datasets from multiple agencies and sources."],
  ["02", "Apply policies", "Configure rules, buffers, weights, and priorities for your objectives."],
  ["03", "Evaluate and classify", "Analyze each location and classify suitability across the map."],
  ["04", "Review and export", "Explore results, understand why, and export for reports and downstream use."],
] as const;

const MODEL_INPUTS = [
  ["01", "Population", "Built-up areas and the concentration of people."],
  ["02", "Sensitive sites", "Hospitals, schools, utilities, and other critical places."],
  ["03", "Environment", "Protected and environmentally sensitive areas."],
  ["04", "Airspace", "Airports, flight activity, and aviation-related constraints."],
] as const;

const CAPABILITIES = [
  ["Configurable policy-driven analysis", "Evaluate locations using configurable weights, buffers, thresholds, and criteria tailored to your goals.", "model", "Scenario controls"],
  ["Public, administrative, and analytical views", "Separate interfaces for the public, administrators, and analysts with role-based controls.", "admin", "Role-based workspace"],
  ["Interactive spatial classification", "Explore results on an interactive map with clear classification, layer control, and location insights.", "map", "Published map view"],
  ["Reporting and data export", "Generate reports and export data in common formats for planning, sharing, and GIS workflows.", "export", "Planning outputs"],
] as const;

const VALUE_ITEMS = [
  ["Shared data foundation", "A common analytical framework improves consistency across agencies, municipalities, NDCs, and programs."],
  ["Public transparency with administrative control", "Provide public access to understandable information while preserving control of data and policies."],
  ["Flexible deployment", "Deploy as a national platform, shared regional service, or separate jurisdictional instances."],
  ["Faster, consistent reviews", "Replace manual comparisons with a structured process that documents and explains results."],
] as const;

const APPLICATIONS = [
  ["Drone flight suitability", "Airspace screening and operational suitability for drone activities."],
  ["Municipal and regional planning", "Compare development areas against infrastructure and policy priorities."],
  ["Infrastructure siting", "Identify optimal locations for roads, utilities, and public facilities."],
  ["Development and zoning review", "Support consistent permitting and zoning with common rules."],
  ["Utility corridor planning", "Evaluate routes, service areas, assets, and constraint data."],
  ["Emergency and disaster planning", "Identify access, vulnerable areas, and priority intervention zones."],
  ["Environmental monitoring", "Assess land use, sensitive areas, and environmental changes."],
  ["Data modernization", "Consolidate fragmented data into a modern platform for public access."],
] as const;

const AUDIENCES = [
  ["Government ministries and agencies", "/posters/guyana-parchment.webp"],
  ["Regional Councils and NDCs", "/posters/guyana-obsidian.webp"],
  ["Civil aviation and public safety", "/drone/region-4-zoning.png"],
  ["Utilities and infrastructure operators", "/posters/guyana-abyss.webp"],
  ["Planning and engineering consultancies", "/posters/guyana-parchment.webp"],
  ["Developers and commercial drone operators", "/drone/region-4-zoning.png"],
  ["Environmental and emergency organizations", "/posters/guyana-obsidian.webp"],
] as const;

export default function DroneOverview() {
  return (
    <main className="overview-page hps-theme hps-theme--drone">
      <DronePublicHeader active="home" />

      <section className="overview-hero" aria-labelledby="overview-title">
        <div className="hero-copy">
          <h1 id="overview-title">Drone Zoning<br />Decision Support</h1>
          <p className="hero-kicker">Geospatial intelligence for informed planning</p>
          <p className="hero-description">
            A configurable, policy-driven platform that consolidates spatial data,
            evaluates operating suitability, and presents clear, explainable results
            through an interactive map.
          </p>
          <div className="hero-actions">
            <Link className="button button-gold" href="/drone/start">
              Explore Drone Zoning <span aria-hidden="true">↗</span>
            </Link>
            <a
              className="button button-outline"
              href="/downloads/guyana-drone-executive-overview.md"
              download
            >
              Download executive overview
            </a>
          </div>
        </div>
        <figure className="hero-screenshot">
          <ExecutiveOverviewMap />
          <figcaption>Published dissolved view · Region 4, Demerara–Mahaica</figcaption>
        </figure>
      </section>

      <section className="section split-section challenge-section" aria-labelledby="challenge-title">
        <div className="section-intro">
          <h2 id="challenge-title">The planning challenge</h2>
          <p>Guyana lacks a centralized, accessible way to combine relevant spatial datasets and evaluate drone operating suitability.</p>
          <p>Fragmented data, inconsistent policies, and limited accessibility make it difficult to make informed, consistent decisions across jurisdictions.</p>
        </div>
        <div className="challenge-grid">
          {CHALLENGES.map(([number, title, text]) => (
            <article className="info-card" key={title}>
              <NumberBadge>{number}</NumberBadge>
              <div><h3>{title}</h3><p>{text}</p></div>
            </article>
          ))}
        </div>
      </section>

      <section className="section split-section solution-section" aria-labelledby="solution-title">
        <div className="section-intro">
          <h2 id="solution-title">The HPS solution</h2>
          <p>Our platform brings fragmented spatial data together in a common, policy-driven engine. It evaluates locations against regulatory constraints, infrastructure, and user-defined priorities—delivering clear, explainable results through an intuitive interface.</p>
          <a className="text-link" href="#workflow">Learn how it works →</a>
        </div>
        <ol className="workflow" id="workflow">
          {WORKFLOW.map(([number, title, text]) => (
            <li key={number}>
              <NumberBadge>{number}</NumberBadge>
              <h3>{title}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="section pilot-section" aria-labelledby="pilot-framework-title">
        <div className="pilot-copy">
          <div className="section-intro">
            <h2 id="pilot-framework-title">Pilot decision framework</h2>
            <p>The Region 4 pilot divides the study area into small cells, evaluates planning factors, and classifies each cell from Suitable to Prohibited.</p>
          </div>
          <div>
            <p>Selecting a location reveals its score, primary reason, factor contributions, hard constraints, and data confidence.</p>
            <p>Sensitivity analysis tests whether modest changes to factor weights alter the classification, helping analysts distinguish stable conclusions from areas that deserve closer review.</p>
          </div>
        </div>
        <div className="pilot-constraint-grid" aria-label="Model input groups">
          {MODEL_INPUTS.map(([number, title, text]) => (
            <article key={title}>
              <NumberBadge>{number}</NumberBadge>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section capabilities-section" aria-labelledby="capabilities-title">
        <h2 id="capabilities-title">Core platform capabilities</h2>
        <div className="capability-grid">
          {CAPABILITIES.map(([title, text, kind, label]) => (
            <article className="capability-card" key={title}>
              <div className={`capability-visual ${kind}`}>
                <Image src="/drone/region-4-zoning.png" alt="" fill sizes="(max-width: 720px) 100vw, 25vw" />
                <span className="capability-label">{label}</span>
              </div>
              <h3>{title}</h3>
              <p>{text}</p>
              {kind === "export" ? <span className="status-note">PDF and GeoJSON exports are planned for a future release.</span> : null}
            </article>
          ))}
        </div>
      </section>

      <section className="section value-section" aria-labelledby="value-title">
        <div>
          <h2 id="value-title">Operational value</h2>
          {VALUE_ITEMS.map(([title, text]) => (
            <article className="value-item" key={title}>
              <span aria-hidden="true">✧</span><div><h3>{title}</h3><p>{text}</p></div>
            </article>
          ))}
        </div>
        <div>
          <h2>Applications beyond Drone Zoning</h2>
          <div className="application-grid">
            {APPLICATIONS.map(([title, text]) => (
              <article key={title}><span aria-hidden="true">◌</span><div><h3>{title}</h3><p>{text}</p></div></article>
            ))}
          </div>
        </div>
      </section>

      <section className="section audiences-section" aria-labelledby="audiences-title">
        <h2 id="audiences-title">Who it serves</h2>
        <div className="audience-grid">
          {AUDIENCES.map(([audience, image]) => (
            <div className="audience-card" key={audience}>
              <span className="audience-image"><Image src={image} alt="" fill sizes="(max-width: 720px) 100vw, 15vw" /></span>
              <span aria-hidden="true">⌁</span>
              <strong>{audience}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="section overview-limit" aria-labelledby="decision-support-title">
        <div>
          <p className="overline">Important limitation</p>
          <h2 id="decision-support-title">Guidance is not authorization</h2>
        </div>
        <div>
          <p>This tool supports planning decisions. It does not replace permission from the aviation authority or account for every live operational condition, including temporary restrictions, weather, aircraft condition, and operator qualifications.</p>
          <Link className="text-link" href="/drone/start">Choose the appropriate application view →</Link>
        </div>
      </section>

      <section className="overview-cta">
        <div className="cta-intro">
          <DroneMark />
          <div><p className="overline">Region 4 pilot</p><p>We are working with partners to validate data, refine policies, and demonstrate the platform’s value to inform future regional and national deployment.</p></div>
        </div>
        <nav aria-label="Drone Zoning actions">
          <Link href="/drone/start">Choose a view</Link>
          <Link href="/drone/explore">Explore published map</Link>
          <Link href="/drone/console">Open planning console</Link>
          <a href="/downloads/guyana-drone-executive-overview.md" download>Download overview</a>
          <a href="mailto:info@hpsgeospatial.com">Contact HPS Geospatial</a>
        </nav>
      </section>
    </main>
  );
}
