"use client";

/** components/drone/GuideDialog.tsx — first-visit (and re-openable) explainer.
 *
 * Plain-language, layered: each topic shows a summary + points, with the
 * methodology behind a "More detail" disclosure. Links out to the fuller
 * /drone/methodology page. Content is shared via lib/droneGuide. */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { GUIDE_TOPICS, GUIDE_INTRO } from "@/lib/droneGuide";

export default function GuideDialog(props: { open: boolean; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Esc to close + focus the panel when it opens.
  useEffect(() => {
    if (!props.open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") props.onClose();
    };
    document.addEventListener("keydown", onKey);
    const t = window.setTimeout(() => panelRef.current?.focus(), 0);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
    };
  }, [props.open, props]);

  if (!mounted || !props.open) return null;

  return createPortal(
    <div className="guide-backdrop" onClick={props.onClose}>
      <div
        className="guide-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-title"
        tabIndex={-1}
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="closebtn" onClick={props.onClose} aria-label="Close">
          ✕
        </button>
        <h2 id="guide-title">How this console works</h2>
        <p className="guide-intro">{GUIDE_INTRO}</p>

        {GUIDE_TOPICS.map((topic) => (
          <section className="guide-topic" key={topic.id}>
            <h3>{topic.title}</h3>
            <p className="guide-summary">{topic.summary}</p>
            <ul className="guide-points">
              {topic.points.map((pt, i) => (
                <li key={i}>{pt}</li>
              ))}
            </ul>
            <details className="guide-detail">
              <summary>More detail</summary>
              <p>{topic.detail}</p>
            </details>
          </section>
        ))}

        <div className="guide-actions">
          <Link href="/drone/methodology" className="guide-link">
            Read the full methodology →
          </Link>
          <button className="btn" onClick={props.onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
