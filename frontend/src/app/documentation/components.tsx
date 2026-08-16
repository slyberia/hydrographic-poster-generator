import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import "./docs.css";
import "./docs-phase8.css";

export type DocSystem = "Drone Platform" | "Poster Generator" | "HPS Portal" | "HPS Portal ecosystem";

export function Status({ children, tone = "current" }: { children: ReactNode; tone?: "current" | "planned" | "decision" }) {
  return <span className={`doc-status ${tone}`}>{children}</span>;
}

export function ArchitectureDiagram({ nodes, caption }: { nodes: Array<{ label: string; detail: string; tone?: string }>; caption: string }) {
  return <figure className="architecture-figure"><div className="architecture-flow">{nodes.map((node, index) => <div className="architecture-step" key={node.label}><div className={`architecture-node ${node.tone ?? ""}`}><strong>{node.label}</strong><span>{node.detail}</span></div>{index < nodes.length - 1 && <span className="architecture-arrow" aria-hidden="true">→</span>}</div>)}</div><figcaption>{caption}</figcaption></figure>;
}

export function StackTable({ rows }: { rows: Array<[string, string, string]> }) {
  return <div className="stack-table" role="table" aria-label="Software stack"><div className="stack-row stack-head" role="row"><strong>Layer</strong><strong>Technology</strong><strong>Role</strong></div>{rows.map(([layer, technology, role]) => <div className="stack-row" role="row" key={layer}><span>{layer}</span><strong>{technology}</strong><span>{role}</span></div>)}</div>;
}

export function DocPage({ system, eyebrow, title, summary, children }: { system: DocSystem; eyebrow: string; title: string; summary: string; children: ReactNode }) {
  const sections: Array<[DocSystem, string, string]> = [["Drone Platform", "Drone Platform", "/documentation/drone-platform"], ["Poster Generator", "Poster Generator", "/documentation/poster-generator"], ["HPS Portal", "HPS Portal", "/documentation/hps-portal"], ["HPS Portal ecosystem", "Ecosystem", "/documentation/ecosystem"]];
  return <main className="docs-page"><header className="docs-header"><Link href="/" className="docs-brand"><Image src="/hps/hps-lockup-horizontal.svg" alt="HPS Geospatial" width={320} height={64} priority /></Link><div className="docs-product"><span className="docs-product-mark" aria-hidden="true" /> <span>HPS SYSTEM LIBRARY</span></div></header><div className="docs-layout"><aside className="docs-sidebar"><p className="docs-sidebar-label">System documentation</p><nav aria-label="Documentation sections"><Link className={system === "HPS Portal" ? "active" : ""} href="/documentation">Library overview</Link>{sections.map(([key, label, href]) => <Link className={system === key ? "active" : ""} href={href} key={key}>{label}</Link>)}</nav><Link className="docs-back" href="/">← Return to platform</Link></aside><article className="docs-article"><div className="docs-hero"><p className="docs-eyebrow">{eyebrow}</p><h1>{title}</h1><p className="docs-summary">{summary}</p><div className="docs-meta"><Status>Current documentation</Status><span>Version 0.1 · 16 Aug 2026</span></div></div>{children}</article></div></main>;
}

export function DocSection({ number, title, children }: { number: string; title: string; children: ReactNode }) {
  return <section className="doc-section"><div className="doc-section-heading"><span>{number}</span><h2>{title}</h2></div>{children}</section>;
}

export function Note({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "important" }) {
  return <aside className={`doc-note ${tone}`}><strong>{tone === "important" ? "Decision point" : "Documentation note"}</strong><p>{children}</p></aside>;
}
