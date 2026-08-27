import { ArchitectureDiagram, DocPage, DocSection, Note, StackTable, Status } from "../components";

export default function HpsPortalDocumentation() {
  return (
    <DocPage system="HPS Portal" eyebrow="System documentation · platform shell" title="HPS Portal" summary="The branded public access and discovery layer for HPS Geospatial, its documentation, project context, and the Hydrographic Poster Generator.">
      <DocSection number="01" title="System purpose">
        <div className="doc-grid">
          <article className="doc-card"><h3>One front door</h3><p>Give visitors a clear, trusted place to discover HPS products, documentation, and contact paths.</p></article>
          <article className="doc-card"><h3>Product hierarchy</h3><p>Make HPS Geospatial the parent identity while keeping the Poster Generator visually distinct.</p></article>
          <article className="doc-card"><h3>Navigation layer</h3><p>Route users to the right public surface without duplicating workflows that belong inside the product.</p></article>
        </div>
      </DocSection>
      <DocSection number="02" title="Architecture">
        <ArchitectureDiagram nodes={[{ label: "Visitor", detail: "Public user" }, { label: "HPS Portal", detail: "Brand · navigation · content" }, { label: "Product routes", detail: "Poster · Docs" }, { label: "Shared services", detail: "Assets · analytics", tone: "data" }]} caption="The Portal is a discovery and access layer; product-specific data and workflows remain owned by the systems they describe." />
        <Note>Restricted workspaces use separate authenticated entry points and do not form part of the public product catalog.</Note>
      </DocSection>
      <DocSection number="03" title="Current stack">
        <StackTable rows={[["Web shell", "Next.js", "Portal landing, navigation, and content routes"], ["Content", "Repository-authored", "Product descriptions and documentation"], ["Assets", "HPS design system", "Logos, product marks, screenshots, and editorial imagery"], ["Product", "Poster Generator", "Public composition and export workflow"]]} />
      </DocSection>
      <DocSection number="04" title="Portal responsibilities">
        <div className="doc-grid">
          <article className="doc-card"><Status>Current</Status><h3>Discover</h3><p>Explain what the public HPS product does and who it serves.</p></article>
          <article className="doc-card"><Status>Current</Status><h3>Orient</h3><p>Provide system documentation, status, and ownership context.</p></article>
          <article className="doc-card"><Status>Current</Status><h3>Connect</h3><p>Offer access links, downloads, and pathways into the Poster Generator.</p></article>
        </div>
      </DocSection>
    </DocPage>
  );
}
