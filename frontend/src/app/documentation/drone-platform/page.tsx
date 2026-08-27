import {
  ArchitectureDiagram,
  DocPage,
  DocSection,
  Note,
  StackTable,
  Status,
} from "../components";

const STACK_ROWS: Array<[string, string, string]> = [
  ["Authenticated workspace UI", "Next.js 16 · React 19 · Leaflet", "Overview, published-map review, dashboard, and role-aware planning workflows"],
  ["Application API", "FastAPI · Python", "Run lifecycle, analysis, reports, reference layers, publication, and exports"],
  ["Analytical record", "Supabase PostgreSQL · PostGIS", "Authoritative model inputs, geometries, run results, and spatial processing"],
  ["Authentication", "Supabase Auth", "Planning Console sessions and viewer, analyst, and administrator roles"],
  ["Published artifacts", "Supabase Storage", "Immutable dissolved, cell, and clipped-cell GeoJSON with a run manifest"],
  ["Hosting", "Google Cloud Run", "Separately containerized frontend and backend services"],
];

export default function DronePlatformDocumentation() {
  return (
    <DocPage
      system="Drone Platform"
      eyebrow="System documentation · Region 4 pilot"
      title="Drone Zoning Platform"
      summary="A map-integrated planning system that combines authoritative analytical records with published, explainable zoning outputs and contextual reference layers."
    >
      <DocSection number="01" title="Purpose and operating boundary">
        <div className="doc-grid">
          <article className="doc-card">
            <h3>Viewer workspace</h3>
            <p>Present the approved dissolved zoning map, location-level explanations, pilot status, and contextual infrastructure or aviation reference layers to signed-in viewers.</p>
          </article>
          <article className="doc-card">
            <h3>Internal planning</h3>
            <p>Let authorized users inspect analytical cells, adjust provisional factor weights, compare sensitivity, govern model runs, and prepare outputs.</p>
          </article>
          <article className="doc-card">
            <h3>Current boundary</h3>
            <p>The implemented pilot covers Region 4, Demerara–Mahaica. It provides planning guidance, not aviation authorization or live operational clearance.</p>
          </article>
        </div>
        <Note>
          Contextual reference layers do not alter MCDA scoring unless a separately
          configured active analytical subtype explicitly says otherwise.
        </Note>
      </DocSection>

      <DocSection number="02" title="Architecture at a glance">
        <ArchitectureDiagram
          nodes={[
            { label: "Browser", detail: "Next.js · React · Leaflet" },
            { label: "FastAPI", detail: "Analysis · publication · exports" },
            { label: "PostGIS", detail: "Authoritative analytical record", tone: "data" },
            { label: "Storage", detail: "Published GeoJSON + manifest", tone: "future" },
          ]}
          caption="Draft and fresh analytical work remains database-backed; publishing creates immutable read-optimized artifacts for the viewer-authorized map."
        />
        <Note tone="important">
          PostgreSQL/PostGIS remains authoritative. Storage artifacts are a durable
          publication path, not a replacement analytical database.
        </Note>
      </DocSection>

      <DocSection number="03" title="Software and service stack">
        <StackTable rows={STACK_ROWS} />
      </DocSection>

      <DocSection number="04" title="Two deliberate data paths">
        <div className="doc-grid">
          <article className="doc-card">
            <Status>Published</Status>
            <h3>Fast published-map path</h3>
            <p>An approved run is materialized as dissolved, cell, and clipped-cell GeoJSON plus a manifest. Public pages prefer the dissolved artifact and cache retrieved layers in the browser session.</p>
          </article>
          <article className="doc-card">
            <Status>Internal</Status>
            <h3>Dynamic analytical path</h3>
            <p>Draft and freshly generated runs continue through the authenticated API and PostGIS so analysts can inspect current cells, scores, constraints, and sensitivity results.</p>
          </article>
          <article className="doc-card">
            <Status>Context</Status>
            <h3>Reference-layer path</h3>
            <p>Scale-dependent aviation and infrastructure layers load lazily from read-optimized endpoints and are cached per browser session to reduce map clutter and repeated requests.</p>
          </article>
        </div>
      </DocSection>

      <DocSection number="05" title="Run and publication lifecycle">
        <ol className="doc-grid">
          <li className="doc-card"><h3>1. Configure</h3><p>Authorized analysts select provisional factors, weights, and scenario settings.</p></li>
          <li className="doc-card"><h3>2. Analyze</h3><p>FastAPI coordinates PostGIS scoring and stores the run as the analytical record.</p></li>
          <li className="doc-card"><h3>3. Review</h3><p>Analysts inspect dissolved areas, cells, location reports, and sensitivity before approval.</p></li>
          <li className="doc-card"><h3>4. Approve</h3><p>An administrator advances a complete reviewed run through the controlled lifecycle.</p></li>
          <li className="doc-card"><h3>5. Publish</h3><p>The service materializes immutable GeoJSON artifacts, records their manifest, and updates the public pointer.</p></li>
          <li className="doc-card"><h3>6. Communicate</h3><p>The Published Map reads the approved dissolved layer; authorized users can export PNG, SVG, PDF, or GeoJSON outputs.</p></li>
        </ol>
      </DocSection>

      <DocSection number="06" title="Current implementation status">
        <div className="doc-grid">
          <article className="doc-card">
            <Status>Implemented</Status>
            <h3>Public experience</h3>
            <p>Workspace overview, two-view entry screen, dissolved-first Published Map, location guidance, pilot dashboard, and session-cached map layers.</p>
          </article>
          <article className="doc-card">
            <Status>Implemented</Status>
            <h3>Planning Console</h3>
            <p>Role-aware run controls, analytical cells, sensitivity review, publication lifecycle, reference layers, and PNG, SVG, PDF, or GeoJSON exports.</p>
          </article>
          <article className="doc-card">
            <Status tone="planned">Data dependent</Status>
            <h3>Deferred aviation geometry</h3>
            <p>Verified runway and safeguarding geometry remain unavailable and are labelled “Coming soon” in the layer controls rather than represented by unverified proxies.</p>
          </article>
        </div>
      </DocSection>

      <DocSection number="07" title="Related surfaces">
        <div className="doc-links">
          <a href="/workspace/drone">Read the Drone Zoning overview</a>
          <a href="/workspace/drone/start">Choose a workspace view</a>
          <a href="/workspace/drone/map">Open the Published Map</a>
          <a href="/workspace/drone/console">Open the Planning Console</a>
        </div>
      </DocSection>
    </DocPage>
  );
}
