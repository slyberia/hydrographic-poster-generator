import { ArchitectureDiagram, DocPage, DocSection, Note, Status } from "../components";

export default function EcosystemDocumentation() {
  return (
    <DocPage system="HPS Portal ecosystem" eyebrow="System documentation · platform view" title="HPS Portal Ecosystem" summary="A shared architecture view for the public HPS Geospatial surfaces: the Portal provides orientation while the Poster Generator owns its specialized workflow.">
      <DocSection number="01" title="Ecosystem model">
        <ArchitectureDiagram nodes={[{ label: "HPS Geospatial", detail: "Parent identity · standards" }, { label: "HPS Portal", detail: "Discovery · documentation · access" }, { label: "Poster Generator", detail: "Composition · visual outputs", tone: "data" }, { label: "Shared services", detail: "Assets · observability", tone: "future" }]} caption="The ecosystem shares a brand and platform foundation without collapsing product responsibilities." />
      </DocSection>
      <DocSection number="02" title="How the systems relate">
        <div className="doc-grid">
          <article className="doc-card"><h3>Portal → product</h3><p>The Portal directs users into the operational surface and provides shared context, documentation, and contact paths.</p></article>
          <article className="doc-card"><h3>Product → Portal</h3><p>The Poster Generator can publish status, documentation, outputs, or links back to the Portal without surrendering its core workflow.</p></article>
          <article className="doc-card"><h3>Shared foundation</h3><p>Brand tokens, navigation rules, and deployment conventions keep the public experience coherent.</p></article>
        </div>
        <Note tone="important">Data sharing and shared persistence should be introduced only where ownership and governance are explicit.</Note>
      </DocSection>
      <DocSection number="03" title="Cross-system principles">
        <ol className="doc-grid">
          <li className="doc-card"><h3>Clear ownership</h3><p>Each system owns its domain data, workflows, and implementation decisions.</p></li>
          <li className="doc-card"><h3>Explainable handoffs</h3><p>Preserve source, version, attribution, and status metadata when outputs move between systems.</p></li>
          <li className="doc-card"><h3>Shared design language</h3><p>Use HPS Geospatial tokens and logo rules while maintaining distinct product identities.</p></li>
          <li className="doc-card"><h3>Implemented vs proposed</h3><p>Label planned exports, integrations, and services until they are verified in production code.</p></li>
        </ol>
      </DocSection>
      <DocSection number="04" title="Shared stack candidates">
        <div className="doc-grid">
          <article className="doc-card"><Status>Available</Status><h3>HPS design system</h3><p>Corporate logo assets, color tokens, typography guidance, and product-brand rules.</p></article>
          <article className="doc-card"><Status tone="decision">To confirm</Status><h3>Identity and access</h3><p>Define access controls only for workspaces that require restricted operational data.</p></article>
          <article className="doc-card"><Status tone="planned">Planned</Status><h3>Artifact exchange</h3><p>Define a durable contract for posters, metadata, downloads, and versioned outputs.</p></article>
        </div>
      </DocSection>
    </DocPage>
  );
}
