"use client";

/** lib/useSensitivity.ts — sensitivity sweep lifecycle for the drone console.
 *
 * idle → running → complete | failed | stalled, per PHASE_D_FRONTEND_PLAN.md §3b:
 * 5 s status polls while running, hard client cutoff one minute past the
 * backend's 15-minute staleness rule, volatility fetched exactly once on
 * completion. Resets on run switch and cleans up its interval on unmount.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { droneApi as api, SensitivityStatus, VolatilityRecord } from "@/lib/droneApi";

const POLL_MS = 5_000;
const STALL_CUTOFF_MS = 16 * 60_000;

export type SweepPhase = "idle" | "running" | "complete" | "failed" | "stalled";

export interface SensitivityState {
  phase: SweepPhase;
  status: SensitivityStatus | null;
  volatilityByH3: Map<string, VolatilityRecord> | null;
  error: string | null;
}

const IDLE: SensitivityState = {
  phase: "idle",
  status: null,
  volatilityByH3: null,
  error: null,
};

export function useSensitivity(runId: string | null) {
  const [state, setState] = useState<SensitivityState>(IDLE);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const runRef = useRef(runId);

  const stopPolling = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    stopPolling();
    setState(IDLE);
  }, [stopPolling]);

  // Run switch (or deselect) abandons any in-flight sweep tracking.
  useEffect(() => {
    if (runRef.current !== runId) {
      runRef.current = runId;
      reset();
    }
  }, [runId, reset]);

  useEffect(() => stopPolling, [stopPolling]); // unmount cleanup

  const finishComplete = useCallback(
    async (forRun: string, status: SensitivityStatus) => {
      try {
        const records = await api.getVolatility(forRun, status.sweep_id);
        if (runRef.current !== forRun) return;
        setState({
          phase: "complete",
          status,
          volatilityByH3: new Map(records.map((r) => [r.h3_index, r])),
          error: null,
        });
      } catch (e) {
        if (runRef.current !== forRun) return;
        setState({ phase: "failed", status, volatilityByH3: null, error: String(e) });
      }
    },
    []
  );

  const trigger = useCallback(
    async (delta: number) => {
      if (!runId) return;
      const forRun = runId;
      stopPolling();
      setState({ ...IDLE, phase: "running" });
      const startedAt = Date.now();

      let initial: SensitivityStatus;
      try {
        initial = await api.triggerSensitivity(forRun, delta);
      } catch (e) {
        if (runRef.current === forRun) {
          setState({ phase: "failed", status: null, volatilityByH3: null, error: String(e) });
        }
        return;
      }
      if (runRef.current !== forRun) return;

      if (initial.status === "complete") {
        await finishComplete(forRun, initial);
        return;
      }
      if (initial.status === "failed") {
        setState({ phase: "failed", status: initial, volatilityByH3: null, error: null });
        return;
      }
      setState({ phase: "running", status: initial, volatilityByH3: null, error: null });

      timerRef.current = setInterval(async () => {
        if (runRef.current !== forRun) {
          stopPolling();
          return;
        }
        if (Date.now() - startedAt > STALL_CUTOFF_MS) {
          stopPolling();
          setState((s) => ({ ...s, phase: "stalled", error: "Sweep stalled — see server logs." }));
          return;
        }
        try {
          const status = await api.getSensitivityStatus(forRun, initial.sweep_id);
          if (runRef.current !== forRun) return;
          if (status.status === "complete") {
            stopPolling();
            await finishComplete(forRun, status);
          } else if (status.status === "failed") {
            stopPolling();
            setState({ phase: "failed", status, volatilityByH3: null, error: null });
          } else {
            setState({ phase: "running", status, volatilityByH3: null, error: null });
          }
        } catch {
          // Transient poll failure: keep polling until the stall cutoff decides.
        }
      }, POLL_MS);
    },
    [runId, stopPolling, finishComplete]
  );

  return { ...state, trigger, reset };
}
