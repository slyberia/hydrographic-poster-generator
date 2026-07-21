"use client";

/** app/drone/guide/page.tsx — the full plain-language guide for the zoning
 * console. Same content as the first-visit dialog (lib/droneGuide), but the
 * methodology is shown in full here rather than tucked behind a disclosure. */

import Link from "next/link";
import { useEffect, useState } from "react";
import { GUIDE_TOPICS, GUIDE_INTRO } from "@/lib/droneGuide";

export default function DroneGuidePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="drone-console guide-page-root">
      <div className="guide-page">
        <header className="guide-page-head">
          <Link href="/drone" className="guide-back">
            ← Back to console
          </Link>
          <h1>Guide: how the zoning console works</h1>
          <p className="guide-intro">{GUIDE_INTRO}</p>
        </header>

        {GUIDE_TOPICS.map((topic) => (
          <section className="guide-page-topic" key={topic.id} id={topic.id}>
            <h2>{topic.title}</h2>
            <p className="guide-summary">{topic.summary}</p>
            <ul className="guide-points">
              {topic.points.map((pt, i) => (
                <li key={i}>{pt}</li>
              ))}
            </ul>
            <div className="guide-methodology">
              <span className="guide-methodology-label">How it works</span>
              <p>{topic.detail}</p>
            </div>
          </section>
        ))}

        <footer className="guide-page-foot">
          <Link href="/drone" className="btn guide-back-btn">
            Back to the console
          </Link>
        </footer>
      </div>
    </div>
  );
}
