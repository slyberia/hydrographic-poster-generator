# Phase D: Zoning Framework & Frontend Map Integration — Remaining (Draft, Revision 1)

> **Audience**: Claude Code, operating against `https://github.com/slyberia/hydrographic-poster-generator.git`
>
> **Scope**: Frontend only — the drone console client (`frontend/src/**`). **No backend
> changes**: every endpoint this phase consumes already exists (Phase C, PR #13).
>
> **Branch**: `claude/implementation-plan-review-9ibbph` (session-bound), continuing
> the Phase C work on the same PR.
>
> **Status**: APPROVED (2026-07-18) — owner accepted all defaults. §9 resolutions:
> delta presets ±5/10/20% with ±10% default; "Constraint-locked (stable by
> definition)" legend copy stands; SensitivityPanel mounts below "Runs".
> Owner also asked about a dashboard for editing these values — resolved: factor
> weights are already editable in the rail, delta is a preset selector, and the
> volatility thresholds stay backend-owned by design (a config-table + admin
> endpoint is the future shape if tuning is ever needed; recorded in §8).

---

## 0. Orientation

Read these files first:

```
frontend/AGENTS.md                               — CRITICAL: this Next.js version has
                                                   breaking changes vs. training data;
                                                   read node_modules/next/dist/docs/
                                                   before writing any code
docs/PHASE_C_SENSITIVITY_PLAN.md                 — backend contract this phase consumes
backend/app/routers/drone.py                     — authoritative response shapes
frontend/src/lib/droneApi.ts                     — existing typed API client
frontend/src/app/drone/page.tsx                  — console state & wiring
frontend/src/components/drone/ControlRail.tsx    — rail: zones, weights, runs
frontend/src/components/drone/MapView.tsx        — Leaflet canvas, ~19.5k H3 cells
frontend/src/components/drone/ReportDrawer.tsx   — per-cell location report
```

### Current state (verified against the code, 2026-07-18)

Already wired end-to-end — do not rebuild:
- Factor weight editing → `PATCH /config/factors/{key}` → refresh.
- Run creation (blocking POST, ~7–10 s) → auto-select → GeoJSON render.
- Run sidebar (children now excluded server-side by Phase C `list_runs`).
- Zone strip with per-zone %, area.
- Cell click → `GET /runs/{id}/report/{h3}` → ReportDrawer.

Remaining (this phase):
1. **Sensitivity UI** — no client for the three Phase C endpoints; no trigger,
   progress, rankings, or volatility anywhere in the UI.
2. **Volatility map overlay** — MapView renders zones only.
3. **Zone visibility toggles** — ZoneStrip is display-only; the map cannot isolate
   zones.
4. **Report drawer stability block** — no per-cell volatility surfaced.
5. **Color-source duplication** — zone colors are defined three times (CSS vars in
   ControlRail and ReportDrawer, hex literals in MapView). One divergence bug
   waiting to happen.

---

## 1. Phase State File

Update `.agents/state/current_phase.json` before any edits:

```json
{
  "schema_version": 1,
  "phase_id": "drone-phase-d-frontend",
  "phase_name": "Drone Phase D: Zoning Framework & Frontend Map Integration (Remaining)",
  "status": "approved",
  "approved_by_human": true,
  "baseline_commit": "<HEAD at phase start>",
  "branch": "claude/implementation-plan-review-9ibbph",
  "protected_branches": [],
  "allowed_paths": [
    "frontend/src/lib/droneApi.ts",
    "frontend/src/lib/zoneTheme.ts",
    "frontend/src/lib/useSensitivity.ts",
    "frontend/src/app/drone/page.tsx",
    "frontend/src/components/drone/ControlRail.tsx",
    "frontend/src/components/drone/SensitivityPanel.tsx",
    "frontend/src/components/drone/MapView.tsx",
    "frontend/src/components/drone/ReportDrawer.tsx",
    "frontend/src/app/globals.css",
    ".agents/state/current_phase.json",
    ".agents/config/verification_commands_drone_d.json"
  ],
  "excluded_paths": [
    "backend/**",
    "db/**",
    "scripts/**",
    "frontend/src/components/!(drone)/**",
    "frontend/src/app/!(drone)/**"
  ],
  "approved_operations": [
    "sensitivity_ui_integration",
    "map_overlay_additions",
    "zone_toggle_controls",
    "report_drawer_extension",
    "color_theme_consolidation"
  ],
  "prohibited_operations": [
    "backend_modifications",
    "database_schema_changes",
    "dependency_additions",
    "deployment_changes"
  ],
  "verification_commands_file": ".agents/config/verification_commands_drone_d.json",
  "approved_baseline_file": ".agents/state/baselines/drone-phase-d-frontend/baseline_approved.json"
}
```

---

## 2. Verification Commands File

Create `.agents/config/verification_commands_drone_d.json`:

```json
{
  "schema_version": 1,
  "commands": [
    {
      "name": "frontend_lint",
      "command": ["npm", "run", "lint"],
      "cwd": "frontend",
      "enabled": true
    },
    {
      "name": "frontend_build",
      "command": ["npm", "run", "build"],
      "cwd": "frontend",
      "enabled": true
    },
    {
      "name": "backend_regression",
      "command": ["python", "-m", "pytest", "backend/tests/test_drone_sensitivity.py", "-v"],
      "cwd": ".",
      "enabled": true
    }
  ],
  "note": "Phase D: no frontend test framework exists in this repo (scripts are dev/build/start/lint only); verification is lint + production build + the manual QA script in plan §7. The backend suite runs as a no-regression tripwire — this phase must not touch backend files."
}
```

---

## 3. Design Decisions (settled — do not deviate)

### 3a. API client mirrors backend models exactly

`droneApi.ts` gains types that are field-for-field copies of the Pydantic models in
`backend/app/routers/drone.py` (`SensitivityStatus`, `SensitivitySummary`,
`SensitivityFactorRank`, `VolatilityRecord`) and three methods:

```ts
triggerSensitivity: (runId: string, delta?: number, label?: string) =>
  POST /runs/{runId}/sensitivity            → SensitivityStatus (202)
getSensitivityStatus: (runId: string, sweepId: string) =>
  GET  /runs/{runId}/sensitivity/{sweepId}  → SensitivityStatus
getVolatility: (runId: string, sweepId: string) =>
  GET  /runs/{runId}/sensitivity/{sweepId}/volatility → VolatilityRecord[]
```

The backend is the single source of truth for shapes. Do not add client-side
fields the backend does not send.

### 3b. Polling protocol

- Trigger returns 202 with `status: "running"`; the client polls the status
  endpoint every **5 seconds** while `status === "running"`.
- Polling stops on `complete` or `failed`, on run switch, and on unmount
  (interval cleanup is mandatory — a leaked interval polling a dead sweep is the
  classic bug here).
- Hard client-side cutoff at **16 minutes** (one minute past the backend's
  15-minute staleness rule, which the status GET itself enforces server-side).
  On cutoff, surface "sweep stalled — see server logs" and stop.
- On `complete`, fetch volatility once and cache it in state. Do not refetch
  volatility on every render or poll.

### 3c. Volatility overlay is a client-side join — no new geometry fetch

The volatility payload is deliberately thin (no geometry). The overlay joins
`VolatilityRecord.h3_index` → the already-loaded run GeoJSON features by
`properties.h3_index`, as a `Map<string, VolatilityRecord>` lookup.

- Map display mode toggle: **Zones | Volatility** (rail-level control).
- Volatility colors (defined once in `zoneTheme.ts`): LOW `#5da06f` (reuse
  suitable green), MEDIUM `#e5c95c`, HIGH `#b3362b`.
- Cells absent from the volatility payload (constraint-locked, NULL-score — see
  Phase C §3i) render neutral grey `#c8c8c8` with the legend label
  **"Constraint-locked (stable by definition)"**. They are not errors and must
  not be colored HIGH.
- Color by the backend's `volatility_category` string ONLY. Do not re-derive
  categories from `stddev` client-side — thresholds live in backend SQL alone
  (Phase C §3f), and duplicating them here is the exact drift this repo's plans
  keep legislating against.

### 3d. Zone visibility toggles are client-side restyles

ZoneStrip rows gain a visibility checkbox per zone. Toggling restyles the
existing Leaflet layer (`fillOpacity: 0, opacity: 0` for hidden zones) via
`layer.setStyle` — it does **not** refetch `GET /runs/{id}/geojson?zone=…` and
does **not** rebuild the layer (rebuilding 19.5k canvas features per toggle is
noticeable jank). The `?zone=` server filter stays unused by the console; note
it as serving external/API consumers.

### 3e. One color module

New `frontend/src/lib/zoneTheme.ts` exports:

```ts
ZONE_FILL:  Record<Zone, string>      // hex, for canvas paths
ZONE_CSS:   Record<Zone, string>      // var(--z-*) refs, for DOM
ZONE_LABELS: Record<Zone, string>
VOLATILITY_FILL: Record<"LOW"|"MEDIUM"|"HIGH", string>
CONSTRAINT_LOCKED_FILL: string
```

ControlRail, MapView, and ReportDrawer all import from it; their local copies
are deleted. The CSS custom properties in `globals.css` remain the DOM-side
source; `zoneTheme.ts` documents that its hex values must match them (canvas
cannot read CSS vars — same constraint MapView already notes).

### 3f. Sensitivity state lives in one hook

New `frontend/src/lib/useSensitivity.ts` encapsulates the whole lifecycle —
`idle → running → complete | failed | stalled` — exposing:

```ts
{ state, trigger(delta), status, volatilityByH3, reset }
```

`page.tsx` stays on plain `useState` for everything else (existing pattern; no
state-management library). The hook `reset()`s on run switch.

### 3g. Sweep discovery is per-session — accepted limitation

There is no "list sweeps for run" endpoint, so after a page reload or run
switch the client cannot rediscover a completed sweep; the panel resets to
idle. This is accepted: re-triggering is idempotent while a sweep is active,
and a completed sweep re-runs in ~90 s. A `GET /runs/{id}/sensitivity`
(latest-sweep lookup) is a reasonable **future backend addition** — record it
under Future Enhancements; do not build it in this phase.

### 3h. Report drawer stability block is a lookup, not a fetch

When (and only when) the active run has a completed sweep in memory, the drawer
shows a **Stability** block for the clicked cell from `volatilityByH3`:
category chip, stddev, zone flips out of `2 × N` possible. Constraint-locked
cells show "Constraint-locked — not affected by weight changes." No new
network call; no drawer change when no sweep has run.

### 3i. Delta selector

Fixed choices only: **±5% / ±10% (default) / ±20%**, mapping to `delta` 0.05 /
0.10 / 0.20 — all inside the backend's validated `[0.01, 0.50]` range. No free
numeric input (preset-driven controls are this repo's house style).

---

## 4. Implementation — file changes

#### [MODIFY] `frontend/src/lib/droneApi.ts`
Types + three methods per §3a. Note `triggerSensitivity` sends
`{ delta, label }` in the body (label optional).

#### [NEW] `frontend/src/lib/zoneTheme.ts`
Per §3e. Pure constants, no logic.

#### [NEW] `frontend/src/lib/useSensitivity.ts`
Per §3b/§3f. The only stateful logic in this phase; keep it dependency-free
(`useState`/`useEffect`/`useRef` + `droneApi`).

#### [NEW] `frontend/src/components/drone/SensitivityPanel.tsx`
Rail section, mounted below "Runs":
- idle: delta selector (§3i) + "Run sensitivity analysis" button (disabled
  when the active run isn't `complete`, or console `busy`).
- running: progress line "`{completed}/{total}` perturbation runs" + elapsed
  time; no cancel (backend has none; staleness is the safety net).
- complete: factor-ranking table (factor, direction, zone flips, MAD —
  sorted as delivered: flips desc, MAD desc), global summary line
  (`pct_cells_flipped`, `total_zone_flips`), and the **Zones | Volatility**
  display-mode toggle.
- failed/stalled: message + re-trigger button (idempotency makes this safe).

#### [MODIFY] `frontend/src/components/drone/ControlRail.tsx`
- Mount `SensitivityPanel` (props threaded from `page.tsx`).
- ZoneStrip rows gain visibility checkboxes (§3d) — `aria-pressed`, keyboard
  operable, and the strip bar dims hidden zones' segments.
- Colors/labels from `zoneTheme.ts`; delete local copies.

#### [MODIFY] `frontend/src/components/drone/MapView.tsx`
- New props: `displayMode: "zones" | "volatility"`, `volatilityByH3:
  Map<string, VolatilityRecord> | null`, `hiddenZones: Set<Zone>`.
- Style resolution goes through one `styleFor(feature)` function using
  `zoneTheme.ts`; mode/visibility changes call `layer.setStyle(styleFor)` on
  the existing layer — the layer is rebuilt only when `geojson` itself changes.
- Cell click behavior unchanged in both modes.

#### [MODIFY] `frontend/src/components/drone/ReportDrawer.tsx`
- Optional `volatility?: VolatilityRecord | null; totalPerturbations?: number`
  props → Stability block per §3h.
- Colors from `zoneTheme.ts`.

#### [MODIFY] `frontend/src/app/drone/page.tsx`
- Wire `useSensitivity(activeRun)`; thread panel props, map props, drawer
  lookup. `selectRun` also resets display mode to `"zones"` and clears hidden
  zones.

#### [MODIFY] `frontend/src/app/globals.css`
- Styles for the sensitivity panel, ranking table, volatility legend, zone
  visibility checkboxes. Follow the existing rail design language (hairlines,
  `--radius`, `sectionlabel`); no new design system.

---

## 5. What NOT to do

- **No backend changes** — not even "small" ones. The latest-sweep endpoint
  (§3g) goes in Future Enhancements, not in this diff.
- **No new npm dependencies.** No state library, no chart library (the ranking
  table is a table), no test framework (see §2 note), no Leaflet plugins.
- **No client-side re-derivation of volatility categories** from stddev.
- **No localStorage/sweep persistence** (§3g).
- **No poster-side frontend edits** (`ControlPanel.tsx`, `PreviewPane.tsx`,
  studio/about/docs pages are out of scope).
- **No layer rebuild on toggle** — restyle only (§3d).
- **Do not special-case sensitivity child runs in the sidebar** — the backend
  already filters them; if children appear, that's a backend bug to report,
  not to paper over.

---

## 6. Commit Convention

```
Phase D (frontend): <concise description>

- <bullet summary of changes>
```

Push to `claude/implementation-plan-review-9ibbph`. Do not merge into `main`.

---

## 7. Verification

Automated (must pass):

```bash
cd frontend && npm run lint && npm run build
python -m pytest backend/tests/test_drone_sensitivity.py -v   # no-regression tripwire
```

Manual QA script (run against local backend + DB, record results in the phase
completion report):

1. Load `/drone` → latest run renders; rail shows zone strip, weights, runs.
2. Trigger sensitivity at ±10% → panel shows running with progress advancing;
   sidebar does NOT fill with child runs.
3. Trigger again while running → same sweep resumes (no duplicate).
4. On completion → ranking table sorted by flips desc; summary line present.
5. Toggle Volatility mode → map recolors by category; constraint-locked cells
   grey; legend updates.
6. Click a cell in volatility mode → drawer shows Stability block; a
   constraint-locked cell shows the locked message.
7. Toggle zone visibility checkboxes in Zones mode → cells hide/show without
   layer rebuild jank; strip dims accordingly.
8. Switch runs mid-poll → polling stops, panel resets to idle, map returns to
   Zones mode.
9. Stop the backend, trigger → error surfaces in the status line; UI remains
   usable after backend returns.
10. `npm run build` output contains no new warnings attributable to this diff.

---

## 8. Future Enhancements (recorded, not implemented)

- `GET /runs/{run_id}/sensitivity` latest-sweep discovery endpoint (backend),
  enabling sweep rehydration after reload (§3g).
- Frontend unit-test framework (vitest) — worth adopting once client logic
  grows beyond `useSensitivity`; introducing it deserves its own decision, not
  a rider on this phase.
- Sweep cancellation endpoint + button.
- Volatility overlay opacity slider.
- Volatility-threshold tuning via backend config table + admin endpoint, if the
  0.15/0.40 calibration ever needs adjustment. Explicitly NOT a frontend-editable
  value — thresholds stay single-sourced in backend SQL (Phase C §3f).

---

## 9. Open Questions for Owner (answer before implementation)

1. **Delta choices** — are ±5/10/20% the right presets, or should ±10% be the
   only option for the pilot?
2. **Volatility legend copy** — is "Constraint-locked (stable by definition)"
   acceptable phrasing for GCAA-adjacent decision-support output, or should it
   defer to the report drawer's existing disclaimer language?
3. **Placement** — SensitivityPanel below "Runs" in the rail (proposed) vs. a
   separate collapsible section above it.
