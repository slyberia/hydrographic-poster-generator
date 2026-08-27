import type { Metadata } from "next";
import Link from "next/link";

import DronePublicHeader from "@/components/drone/DronePublicHeader";

export const metadata: Metadata = {
  title: "Choose a view — Drone Zoning",
  description: "Choose the read-only published-map experience or the analytical Drone Zoning Planning Console.",
};

const VIEWS = [
  {
    eyebrow: "Read-only view",
    title: "Published Map",
    description: "Inspect the current published zoning map, check a location, understand its classification, and read approved guidance without analytical controls.",
    details: ["Published dissolved zoning", "Location-level explanations", "Viewer access required"],
    href: "/workspace/drone/map",
    action: "Open Published Map",
  },
  {
    eyebrow: "Analytical view",
    title: "Planning Console",
    description: "Run and compare scenarios, adjust factor weights, inspect cells, review sensitivity, manage model runs, and prepare approved outputs.",
    details: ["Analytical cell detail", "Scenario and sensitivity controls", "Authorized users only"],
    href: "/workspace/drone/console",
    action: "Open Planning Console",
  },
] as const;

export default function DroneStartPage() {
  return (
    <main className="drone-public drone-start hps-theme hps-theme--drone">
      <DronePublicHeader active="start" />
      <section className="drone-start-hero" aria-labelledby="choose-view-title">
        <div className="drone-public-inner">
          <p className="drone-eyebrow">Enter Drone Zoning</p>
          <h1 id="choose-view-title">Choose the view that matches your task.</h1>
          <p>Both views use the same Region 4 decision-support framework. Choose the approved read-only result or the analytical workspace.</p>
        </div>
      </section>
      <section className="drone-start-options" aria-label="Available Drone Zoning views">
        <div className="drone-public-inner drone-start-grid">
          {VIEWS.map((view) => (
            <Link className="drone-start-card" href={view.href} key={view.title}>
              <p className="drone-entry-status drone-entry-status-live">{view.eyebrow}</p>
              <h2>{view.title}</h2>
              <p>{view.description}</p>
              <ul>
                {view.details.map((detail) => <li key={detail}>{detail}</li>)}
              </ul>
              <span>{view.action} <span aria-hidden="true">→</span></span>
            </Link>
          ))}
        </div>
      </section>
      <aside className="drone-start-guidance">
        <div className="drone-public-inner">
          <strong>Planning guidance is not flight authorization.</strong>
          <span>Operational approval and live aviation conditions remain outside this planning tool.</span>
          <Link href="/workspace/drone">Return to the Drone Zoning overview</Link>
        </div>
      </aside>
    </main>
  );
}
