import type { ReactNode } from "react";
import "./docs.css";

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
  return <main className="docs-page"><header className="docs-header"><a href="/" className="docs-brand"><img src="/hps/hps-lockup-horizontal.svg" alt="HPS Geospatial" /></a><div className="docs-product"><span className="docs-product-mark" aria-hidden="true" /> <span>HPS SYSTEM DOCUMENTATION</span></div></header><div className="docs-layout"><aside className="docs-sidebar"><p className="docs-sidebar-label">Documentation</p><nav aria-label="Documentation sections"><a className={system === "Drone Platform" ? "active" : ""} href="/documentation/drone-platform">Drone Platform</a><a className={system === "Poster Generator" ? "active" : ""} href="/documentation/poster-generator">Poster Generator</a><a className={system === "HPS Portal" ? "active" : ""} href="/documentation/hps-portal">HPS Portal</a><a className={system === "HPS Portal ecosystem" ? "active" : ""} href="/documentation/ecosystem">Ecosystem</a></nav><a className="docs-back" href="/">← Return to application</a></aside><article className="docs-article"><div className="docs-hero"><p className="docs-eyebrow">{eyebrow}</p><h1>{title}</h1><p className="docs-summary">{summary}</p><div className="docs-meta"><Status>Current documentation</Status><span>Version 0.1 · 06 Aug 2026</span></div></div>{children}</article></div></main>;
}

export function DocSection({ number, title, children }: { number: string; title: string; children: ReactNode }) {
  return <section className="doc-section"><div className="doc-section-heading"><span>{number}</span><h2>{title}</h2></div>{children}</section>;
}

export function Note({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "important" }) {
  return <aside className={`doc-note ${tone}`}><strong>{tone === "important" ? "Decision point" : "Documentation note"}</strong><p>{children}</p></aside>;
}
