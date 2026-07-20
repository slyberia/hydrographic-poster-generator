"use client";

/** components/drone/LoadingBar.tsx — ETA "trickle" progress bar.
 *
 * We can't report true progress: run loading is a single network fetch, and
 * the sensitivity sweep now commits atomically (see docs/DB_IO_OPTIMIZATION.md
 * R3/R4), so there is no incremental signal. Instead the bar eases toward ~92%
 * over the expected duration and snaps to 100% the moment the work actually
 * finishes — honest about "working / done" without faking a percentage.
 *
 * All setState happens inside rAF/timeout callbacks (never synchronously in the
 * effect body) to satisfy react-hooks/set-state-in-effect.
 */

import { useEffect, useRef, useState } from "react";

export default function LoadingBar(props: {
  active: boolean;
  /** Expected duration in ms; the bar approaches ~92% over this window. */
  etaMs?: number;
  label?: string;
}) {
  const etaMs = props.etaMs ?? 4000;
  const [pct, setPct] = useState(0);
  const [visible, setVisible] = useState(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (props.active) {
      const start = performance.now();
      const tick = (now: number) => {
        const elapsed = now - start;
        // Asymptotic ease toward 92%: fast at first, never quite arriving.
        const target = 92 * (1 - Math.exp(-elapsed / (etaMs * 0.6)));
        setVisible(true);
        setPct(target);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
    }
    // Finishing: snap to 100 (next frame), then fade out.
    const snap = requestAnimationFrame(() => setPct(100));
    const hide = setTimeout(() => {
      setVisible(false);
      setPct(0);
    }, 400);
    return () => {
      cancelAnimationFrame(snap);
      clearTimeout(hide);
    };
  }, [props.active, etaMs]);

  if (!visible) return null;
  return (
    <div className="loadingbar" role="progressbar" aria-label={props.label ?? "Loading"}
         aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
      <div className="loadingbar-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}
