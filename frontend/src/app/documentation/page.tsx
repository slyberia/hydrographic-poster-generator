import Link from "next/link";

import { DocPage, DocSection, Note, Status } from "./components";

const SYSTEMS = [
  ["Drone Platform", "Decision-support system for published zoning, planning review, and reference context.", "/documentation/drone-platform"],
  ["Poster Generator", "Product overview, design boundaries, and its relationship to the HPS product family.", "/documentation/poster-generator"],
  ["HPS Portal", "Shared platform identity, entry points, and operating model.", "/documentation/hps-portal"],
  ["Ecosystem", "How the products relate while retaining clear ownership of their data and workflows.", "/documentation/ecosystem"],
] as const;

export default function DocumentationHomePage() {
  return <DocPage system="HPS Portal" eyebrow="HPS system library" title="Documentation with a clear home." summary="The HPS System Library explains the product family, its boundaries, and the relationships between its working applications. Product-specific operating documentation remains with each product.">
    <DocSection number="01" title="Choose the right documentation context"><div className="doc-grid">{SYSTEMS.map(([title, description, href]) => <Link className="doc-card" href={href} key={title}><h3>{title}</h3><p>{description}</p></Link>)}</div><Note>Use the System Library for shared architecture and product context. Use the Hydro Poster product documentation for Studio workflow and API integration details.</Note></DocSection>
    <DocSection number="02" title="Product documentation"><div className="doc-grid"><article className="doc-card"><Status>Current</Status><h3>Hydrographic Poster Generator</h3><p>The Studio and its rendering API are documented in a product-specific, editorial surface so operational guidance remains close to the tool.</p><p className="doc-links"><Link href="/docs">Open Hydro Poster documentation →</Link></p></article><article className="doc-card"><Status>Current</Status><h3>Drone Zoning</h3><p>The Drone Platform documentation describes the public map, planning console, data context, and decision-support boundaries.</p><p className="doc-links"><Link href="/documentation/drone-platform">Open Drone Platform documentation →</Link></p></article></div></DocSection>
  </DocPage>;
}
