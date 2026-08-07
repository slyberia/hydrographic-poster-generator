import "./executive-overview.css";

const challenges = [
  ["01", "Fragmented data", "Spatial data is scattered across institutions, formats, and jurisdictions."],
  ["02", "Inconsistent policies", "Lack of aligned policies, standards, and authoritative governance."],
  ["03", "Limited access", "No broadly accessible platform to view, analyze, and understand constraints."],
];

const capabilities = [
  ["Configurable policy-driven analysis", "Evaluate locations using configurable weights, buffers, thresholds, and criteria tailored to your goals.", "model"],
  ["Public, administrative, and analytical views", "Separate interfaces for the public, administrators, and analysts with role-based controls.", "admin"],
  ["Interactive spatial classification", "Explore results on an interactive map with clear classification, layer control, and location insights.", "map"],
  ["Reporting and data export", "Generate reports and export data in common formats for planning, sharing, and GIS workflows.", "export"],
];

const valueItems = [
  ["Shared data foundation", "A common analytical framework improves consistency across agencies, municipalities, NDCs, and programs."],
  ["Public transparency with administrative control", "Provide public access to understandable information while preserving control of data and policies."],
  ["Flexible deployment", "Deploy as a national platform, shared regional service, or separate jurisdictional instances."],
  ["Faster, consistent reviews", "Replace manual comparisons with a structured process that documents and explains results."],
];

const applications = [
  ["Drone flight suitability", "Airspace screening and operational suitability for drone activities."],
  ["Municipal & regional planning", "Compare development areas against infrastructure and policy priorities."],
  ["Infrastructure siting", "Identify optimal locations for roads, utilities, and public facilities."],
  ["Development & zoning review", "Support consistent permitting and zoning with common rules."],
  ["Utility corridor planning", "Evaluate routes, service areas, assets, and constraint data."],
  ["Emergency & disaster planning", "Identify access, vulnerable areas, and priority intervention zones."],
  ["Environmental monitoring", "Assess land use, sensitive areas, and environmental changes."],
  ["Data modernization", "Consolidate fragmented data into a modern platform for public access."],
];

const audiences = ["Government ministries & agencies", "Regional Councils & NDCs", "Civil aviation & public safety", "Utilities & infrastructure operators", "Planning & engineering consultancies", "Developers & commercial drone operators", "Environmental & emergency organizations"];

function ProductMark() {
  return <span className="product-mark" aria-hidden="true"><i /><i /><i /></span>;
}

export default function ExecutiveOverview() {
  return (
    <main className="overview-page">
      <header className="overview-header">
        <a href="/" className="brand-lockup" aria-label="HPS Geospatial home"><img src="/hps/hps-lockup-horizontal.svg" alt="HPS Geospatial — Spatial Systems · Decision Support" /></a>
        <div className="product-lockup"><ProductMark /><span><strong>DRONE ZONING</strong><small>REGION 4 PILOT</small></span></div>
      </header>

      <section className="overview-hero" aria-labelledby="overview-title">
        <div className="hero-copy">
          <p className="overline">HPS Geospatial platform</p>
          <h1 id="overview-title">Drone Zoning<br />Decision Support</h1>
          <p className="hero-kicker">Geospatial intelligence for informed planning</p>
          <p className="hero-description">A configurable, policy-driven platform that consolidates spatial data, evaluates operating suitability, and presents clear, explainable results through an interactive map.</p>
          <div className="hero-actions">
            <a className="button button-gold" href="/drone">Explore Drone Zoning <span>↗</span></a>
          <a className="button button-outline" href="/downloads/guyana-drone-executive-overview.md" download>▧&nbsp; Download executive overview</a>
          </div>
        </div>
        <figure className="hero-screenshot">
          <img src="/drone/region-4-zoning.png" alt="Drone Zoning analysis console showing a classified suitability map and selected-cell details" />
          <figcaption>Current pilot: Region 4, Demerara–Mahaica</figcaption>
        </figure>
      </section>

      <section className="section split-section challenge-section" aria-labelledby="challenge-title">
        <div className="section-intro"><h2 id="challenge-title">The planning challenge</h2><p>Guyana lacks a centralized, accessible way to combine relevant spatial datasets and evaluate drone operating suitability.</p><p>Fragmented data, inconsistent policies, and limited accessibility make it difficult to make informed, consistent decisions across jurisdictions.</p></div>
        <div className="challenge-grid">{challenges.map(([number, title, text]) => <article className="info-card" key={title}><span className="card-icon">{number}</span><div><h3>{title}</h3><p>{text}</p></div></article>)}</div>
      </section>

      <section className="section split-section solution-section" aria-labelledby="solution-title">
        <div className="section-intro"><h2 id="solution-title">The HPS solution</h2><p>Our platform brings fragmented spatial data together in a common, policy-driven engine. It evaluates locations against regulatory constraints, infrastructure, and user-defined priorities—delivering clear, explainable results through an intuitive interface.</p><a className="text-link" href="#workflow">Learn how it works&nbsp; →</a></div>
        <ol className="workflow" id="workflow">{[["01", "Consolidate data", "Integrate authoritative datasets from multiple agencies and sources."], ["02", "Apply policies", "Configure rules, buffers, weights, and priorities for your objectives."], ["03", "Evaluate & classify", "Analyze each location and classify suitability across the map."], ["04", "Review & export", "Explore results, understand why, and export for reports and downstream use."]].map(([number, title, text]) => <li key={number}><span className="step-number">{number}</span><h3>{title}</h3><p>{text}</p></li>)}</ol>
      </section>

      <section className="section capabilities-section" aria-labelledby="capabilities-title"><h2 id="capabilities-title">Core platform capabilities</h2><div className="capability-grid">{capabilities.map(([title, text, kind]) => <article className="capability-card" key={title}><div className={`capability-visual ${kind}`}><img src="/drone/region-4-zoning.png" alt="" /></div><h3>{title}</h3><p>{text}</p>{kind === "export" && <span className="status-note">PDF & GeoJSON exports are planned for the next release.</span>}</article>)}</div></section>

      <section className="section value-section" aria-labelledby="value-title"><div><h2 id="value-title">Operational value</h2>{valueItems.map(([title, text]) => <article className="value-item" key={title}><span>✧</span><div><h3>{title}</h3><p>{text}</p></div></article>)}</div><div><h2>Applications beyond Drone Zoning</h2><div className="application-grid">{applications.map(([title, text]) => <article key={title}><span>◌</span><div><h3>{title}</h3><p>{text}</p></div></article>)}</div></div></section>

      <section className="section audiences-section" aria-labelledby="audiences-title"><h2 id="audiences-title">Who it serves</h2><div className="audience-grid">{audiences.map((audience) => <div key={audience}><span>⌁</span><strong>{audience}</strong></div>)}</div></section>

      <section className="overview-cta"><div className="cta-intro"><ProductMark /><div><p className="overline">Region 4 pilot</p><p>We are working with partners to validate data, refine policies, and demonstrate the platform’s value to inform future regional and national deployment.</p></div></div><nav aria-label="Executive overview actions"><a href="/drone/console">Open planning console</a><a href="/drone/explore">Explore map</a><a href="/drone/methodology">Review methodology</a><a href="/downloads/guyana-drone-executive-overview.md" download>Download overview</a><a href="mailto:info@hpsgeospatial.com">Contact HPS Geospatial</a></nav></section>
    </main>
  );
}
