/** Full plain-language methodology shared with the console's first-visit guide. */

import Link from "next/link";
import DronePublicHeader from "@/components/drone/DronePublicHeader";
import { GUIDE_TOPICS, GUIDE_INTRO } from "@/lib/droneGuide";

export default function DroneMethodologyPage() {
  return (
    <div className="drone-console guide-page-root">
      <DronePublicHeader active="methodology" />
      <main className="guide-page">
        <header className="guide-page-head">
          <p className="drone-eyebrow">Region 4 pilot methodology</p>
          <h1>How the zoning model works</h1>
          <p className="guide-intro">{GUIDE_INTRO}</p>
        </header>

        {GUIDE_TOPICS.map((topic) => (
          <section className="guide-page-topic" key={topic.id} id={topic.id}>
            <h2>{topic.title}</h2>
            <p className="guide-summary">{topic.summary}</p>
            <ul className="guide-points">
              {topic.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
            <div className="guide-methodology">
              <span className="guide-methodology-label">Method</span>
              <p>{topic.detail}</p>
            </div>
          </section>
        ))}

        <aside className="methodology-notice" aria-labelledby="methodology-limit">
          <h2 id="methodology-limit">Decision support, not flight authorization</h2>
          <p>
            The zoning model identifies planning constraints in the available data.
            It does not account for every live condition and does not replace approval
            from the relevant aviation authority.
          </p>
        </aside>

        <footer className="guide-page-foot">
          <Link href="/drone/console" className="btn guide-back-btn">
            Open the Planning Console
          </Link>
        </footer>
      </main>
    </div>
  );
}
