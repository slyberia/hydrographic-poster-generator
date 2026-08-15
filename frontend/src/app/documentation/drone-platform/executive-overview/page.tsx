import Link from "next/link";
import "./executive-overview-reader.css";

const sections = [
  ["challenge", "The planning challenge"],
  ["solution", "The HPS solution"],
  ["capabilities", "Core capabilities"],
  ["value", "Operational value"],
  ["next", "Pilot status and next steps"],
];

export default function ExecutiveOverviewReader() {
  return (
    <main className="brief-reader">
      <header className="brief-reader__header">
        <div className="brief-reader__header-inner">
          <Link className="brief-reader__logo" href="/" aria-label="HPS Geospatial home">
            <img src="/hps/hps-lockup-horizontal.svg" alt="HPS Geospatial" />
          </Link>
          <nav className="brief-reader__nav" aria-label="Document navigation">
            <Link href="/drone">Overview page</Link>
            <Link href="/drone">Drone Zoning</Link>
            <Link href="/drone/methodology">Methodology</Link>
            <Link href="/docs">Documentation</Link>
          </nav>
        </div>
      </header>

      <section className="brief-reader__masthead" aria-labelledby="brief-title">
        <div className="brief-reader__masthead-inner">
          <p className="brief-reader__eyebrow">Executive Overview / Condensed brief</p>
          <h1 id="brief-title">Drone Zoning Decision Support</h1>
          <p className="brief-reader__dek">
            A configurable, policy-driven platform that consolidates spatial
            data, evaluates operating suitability, and presents clear,
            explainable results through an interactive map.
          </p>
          <div className="brief-reader__meta">
            <span>HPS Geospatial</span>
            <span>Region 4 pilot</span>
            <span>Web reader</span>
          </div>
        </div>
      </section>

      <div className="brief-reader__layout">
        <aside className="brief-reader__toc" aria-label="Executive overview contents">
          <h2>On this brief</h2>
          <ul>
            {sections.map(([id, label]) => <li key={id}><a href={`#${id}`}>{label}</a></li>)}
          </ul>
        </aside>

        <article className="brief-reader__content">
          <div className="brief-reader__status">
            This is the condensed Executive Overview. It explains the platform,
            current pilot framing, and intended value. A longer methodology
            report—with data provenance, rule definitions, weights, thresholds,
            validation, and governance detail—is planned as a separate document.
          </div>

          <section className="brief-reader__section" id="challenge">
            <h2>The planning challenge</h2>
            <p>
              Guyana lacks a centralized, accessible way to combine relevant
              spatial datasets and evaluate drone operating suitability.
              Fragmented data, inconsistent policies, and limited accessibility
              make it difficult to make informed, consistent decisions across
              jurisdictions.
            </p>
            <div className="brief-reader__grid">
              {[
                ["Fragmented data", "Spatial data is scattered across institutions, formats, and jurisdictions."],
                ["Inconsistent policies", "Policies, standards, and authoritative governance are not consistently aligned."],
                ["Limited access", "There is no broadly accessible platform to view, analyze, and understand constraints."],
              ].map(([title, text]) => <div className="brief-reader__card" key={title}><h3>{title}</h3><p>{text}</p></div>)}
            </div>
          </section>

          <section className="brief-reader__section" id="solution">
            <h2>The HPS solution</h2>
            <p>
              HPS brings fragmented spatial data together in a common,
              policy-driven engine. It evaluates locations against regulatory
              constraints, infrastructure, and user-defined priorities,
              delivering clear and explainable results through an intuitive
              interface.
            </p>
            <div className="brief-reader__steps">
              {[
                ["01", "Consolidate data", "Integrate authoritative datasets from multiple agencies and sources."],
                ["02", "Apply policies", "Configure rules, buffers, weights, and priorities for the objective."],
                ["03", "Evaluate and classify", "Analyze each location and classify suitability across the map."],
                ["04", "Review and export", "Explore results, understand why, and prepare downstream outputs."],
              ].map(([number, title, text]) => <div className="brief-reader__step" key={number}><strong>{number}</strong><h3>{title}</h3><p>{text}</p></div>)}
            </div>
          </section>

          <section className="brief-reader__section" id="capabilities">
            <h2>Core platform capabilities</h2>
            <div className="brief-reader__grid">
              {[
                ["Configurable policy-driven analysis", "Evaluate locations using configurable weights, buffers, thresholds, and criteria tailored to the objective."],
                ["Public, administrative, and analytical views", "Separate interfaces for the public, administrators, and analysts with role-based controls."],
                ["Interactive spatial classification", "Explore results on an interactive map with clear classification, layer control, and location insights."],
                ["Reporting and data export", "Generate reports and prepare data for planning, sharing, and GIS workflows. PDF and GeoJSON exports are planned for a future release."],
              ].map(([title, text]) => <div className="brief-reader__card" key={title}><h3>{title}</h3><p>{text}</p></div>)}
            </div>
          </section>

          <section className="brief-reader__section" id="value">
            <h2>Operational value</h2>
            <p>
              The platform is intended to create a shared analytical
              foundation, improve public transparency while preserving
              administrative control, support flexible deployment, and make
              reviews faster and more consistent.
            </p>
            <h3>Applications beyond Drone Zoning</h3>
            <ul>
              <li>Municipal and regional planning</li>
              <li>Infrastructure and utility corridor siting</li>
              <li>Emergency and disaster planning</li>
              <li>Environmental monitoring</li>
              <li>Development and zoning review</li>
              <li>Data modernization and public access</li>
            </ul>
          </section>

          <section className="brief-reader__section" id="next">
            <h2>Pilot status and next steps</h2>
            <p>
              The Region 4 pilot is being used to validate data, refine
              policies, and demonstrate the platform’s value to inform future
              regional and national deployment.
            </p>
            <p>
              The next documentation layer should provide the methodology
              behind the brief: source datasets, spatial coverage, suitability
              classes, rule and weight definitions, buffers and thresholds,
              validation approach, known limitations, and governance decisions.
            </p>
            <p>
              Use the live platform to inspect current map behavior, and use
              the dedicated methodology page for the implementation status of
              the current rules.
            </p>
            <Link href="/drone/methodology">Review current methodology →</Link>
          </section>
        </article>
      </div>

      <footer className="brief-reader__footer">
        <div className="brief-reader__footer-inner">
          <span>HPS Geospatial · Region 4 pilot</span>
          <Link href="/drone">Return to Drone Zoning overview</Link>
        </div>
      </footer>
    </main>
  );
}
