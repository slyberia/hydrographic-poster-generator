# Poster Phases 5 & 6 Completion Plan — Composition Hardening + UI Rollout (Revision 1)

> **Audience**: Claude Code, operating against `https://github.com/slyberia/hydrographic-poster-generator.git`
>
> **Scope**: The POSTER generator (studio) only — `frontend/src/**` (non-drone),
> `backend/tests/**` (parity tests only; no backend runtime changes), docs.
> **The drone console is out of scope** — do not touch `frontend/src/**/drone*`,
> `backend/app/services/drone_service.py`, or `backend/app/routers/drone.py`.
>
> **Branch**: create `claude/poster-phase-5-6-completion` from `origin/main`.
> If `docs/PHASE_5_6_COMPLETION_PLAN.md` and the Playwright setup
> (`frontend/playwright.config.ts`, `frontend/e2e/`, `@playwright/test` dev-dep)
> are not yet on `main` (they land with PR #13), pull them from
> `origin/claude/implementation-plan-review-9ibbph` (see kickoff prompt).
>
> **Status**: APPROVED (2026-07-18) — owner requested this plan to close out the
> ROADMAP's remaining poster phases.

---

## 0. Orientation — verified current state (2026-07-18)

The ROADMAP's Phase 3 (granular metadata) and Phase 4 (typography foundation)
are **already implemented** despite their 🟡/🔵 status:

- Six `show_*` checkboxes wired to `metadata_options` → API payload
  (`ControlPanel.tsx:~710`, `api.ts:152`, QA reads them in `qa.ts:124`).
- Font family / weight / tracking overrides wired to `typography_overrides`
  (`ControlPanel.tsx:~358-560`), preset change resets overrides.
- V1→V2 localStorage migration implemented and invoked on load
  (`lib/state_migration.ts`, `studio/page.tsx:69`).
- All three feature flags exist and are `true` (`lib/features.ts`).

What genuinely remains — and what this phase delivers:

1. **Parity audit** — preview vs. PNG/SVG/PDF export (§4).
2. **Resilience pass** — malformed geometry, backend failures, timeouts (§5).
3. **Feature-flag cleanup** — remove flags + dead legacy branches (§6).
4. **Accessibility audit** — keyboard/ARIA across the studio (§7).
5. **Deploy checklist** — prepared, owner-executed (§8).
6. **ROADMAP truth-up** — mark 3/4 complete, record this phase (§9).

Read first:

```
frontend/AGENTS.md                       — CRITICAL: read node_modules/next/dist/docs/
                                           before writing Next.js code
docs/ROADMAP.md                          — active phases 3-6 (stale statuses; see above)
frontend/src/app/studio/page.tsx         — studio state, localStorage load/save
frontend/src/components/ControlPanel.tsx — flags at ~358, ~710, ~780
frontend/src/components/InteractiveCanvas.tsx — drag/scale transforms → layout_overrides
frontend/src/lib/features.ts             — the three flags to remove
frontend/src/lib/api.ts                  — RenderRequest payload shape
frontend/src/lib/qa.ts                   — client QA checklist
backend/app/services/svg_renderer.py     — single renderer for preview AND export
backend/app/services/export_service.py   — CairoSVG conversions
backend/tests/test_golden.py             — existing fixture-based render tests
frontend/e2e/                            — Playwright infra (mock pattern to reuse)
```

## 1. Phase State File

Update `.agents/state/current_phase.json` before code edits (follow the Phase D
file's shape): `phase_id: "poster-phase-5-6-completion"`, branch as above,
allowed_paths = the files in §§4–9 plus the `.agents` pair, prohibited =
backend runtime changes, drone-path changes, schema changes, new runtime
dependencies, deployment execution.

## 2. Verification Commands File

`.agents/config/verification_commands_poster_56.json`:

```json
{
  "schema_version": 1,
  "commands": [
    { "name": "frontend_lint",  "command": ["npm", "run", "lint"],  "cwd": "frontend", "enabled": true },
    { "name": "frontend_build", "command": ["npm", "run", "build"], "cwd": "frontend", "enabled": true },
    { "name": "frontend_e2e",   "command": ["npm", "run", "test:e2e"], "cwd": "frontend", "enabled": true },
    { "name": "backend_tests",  "command": ["python", "-m", "pytest", "backend/tests", "-v"], "cwd": ".", "enabled": true }
  ],
  "note": "Poster 5+6: parity, resilience, flag cleanup, accessibility. Backend suite must stay green — no backend runtime edits are in scope (parity tests are additive)."
}
```

## 3. Settled Decisions (do not deviate)

- **3a. One renderer is the parity foundation.** Preview and export share
  `SVGRenderer` server-side, so SVG-level parity is assertable without a
  browser or DB using the golden-test fixtures. Canvas-vs-export parity is a
  *client transform* question: the only thing that can diverge is
  `InteractiveCanvas`'s transform math vs. the backend `layout_resolver`'s
  interpretation of `layout_overrides`.
- **3b. No new dependencies except none.** The accessibility checks use
  Playwright's built-in keyboard/ARIA assertions — no axe-core, no new
  packages. If a finding needs a tool this plan doesn't allow, record it,
  don't install it.
- **3c. Flag removal keeps payload back-compat.** Remove the three flags and
  their dead UI branches (legacy master metadata toggle path, non-flag
  typography path, gated layout editing). Do NOT remove legacy fields from the
  API payload types or the V1→V2 migration — old saved states must keep
  loading.
- **3d. Deploy is owner-executed.** The sandbox has no GCP credentials. This
  phase produces a verified checklist (§8), not a deployment.
- **3e. E2E mocks follow the drone pattern.** Studio e2e tests use a
  network-layer mock module (`frontend/e2e/mockStudioBackend.ts`) mirroring
  `mockBackend.ts`, encoding the backend contract as pinned by backend tests.

## 4. Parity audit (ROADMAP Phase 5, item 1)

#### [NEW] `backend/tests/test_render_parity.py`
Fixture-based (no DB), reusing the golden-test clip fixtures:
1. **SVG parity**: for a settings matrix (each metadata toggle off/on, a
   typography override set, a layout override set, design-asset mode), assert
   the SVG produced via the preview path and via `ExportService(format="svg")`
   are byte-identical.
2. **PNG/PDF structural parity**: assert CairoSVG conversion succeeds for each
   matrix entry, PNG dimensions match the requested export size exactly, and
   PDF page box matches. (Pixel-perfect raster diffing is NOT required — the
   shared renderer plus dimension checks is the contract; note this limit in
   the test docstring.)

#### [NEW] `frontend/e2e/studio-parity.spec.ts`
With a mocked `/preview` returning a fixture SVG:
1. Drag a layout element in `InteractiveCanvas`; assert the `layout_overrides`
   in the next request payload equal the transform the canvas displays
   (`getSVGScaler` math is the thing under test).
2. Toggle each metadata checkbox; assert the payload's `metadata_options`
   match the UI state exactly.
3. Set typography overrides; assert payload fidelity.

#### [MODIFY] `docs/ROADMAP.md` — record the parity method and its limit
(server-side renderer parity + client transform fidelity; one manual visual
pass on a live stack recommended before deploy, listed in §8's checklist).

## 5. Resilience pass (ROADMAP Phase 5, items 2–3)

#### [NEW] `frontend/e2e/studio-resilience.spec.ts`
Mock-driven failure injection; each case asserts (a) a visible, non-technical
error surface, (b) no crash/blank screen, (c) recovery once the mock heals:
- `/preview` returns 500 / times out (mock `route.abort`).
- `/preview` returns malformed SVG (truncated document).
- `/export` fails mid-download.
- localStorage contains V1 state → loads migrated, no data loss (asserts the
  migration path `studio/page.tsx:69` end to end).
- localStorage contains garbage JSON → falls back to defaults without crashing.

#### [MODIFY] client code where the tests find gaps
Expected touch points: `studio/page.tsx` (error boundaries / fetch guards),
`PreviewPane.tsx` (malformed-SVG handling), `api.ts` (timeout surfacing). Fix
minimally; every fix must have a failing-then-passing e2e case.

## 6. Feature-flag cleanup (ROADMAP Phase 6, item 1)

#### [MODIFY] `frontend/src/lib/features.ts` — delete the file (or empty it) once nothing imports it.
#### [MODIFY] `frontend/src/components/ControlPanel.tsx`
- Inline the `granular_metadata_controls` branch; delete the master-toggle
  fallback UI (~lines 745-763).
- Inline the `typography_customization` branch; delete the ungated fallback.
- Inline the `manual_layout_editing` gate.
- Keep `show_metadata` in types/migration per §3c.

Grep for remaining `FEATURE_FLAGS` references (`qa.ts`, `settings.ts`,
`studio/page.tsx`) and inline them all. `npm run build` is the tripwire.

## 7. Accessibility audit (ROADMAP Phase 6, item 2)

#### [NEW] `frontend/e2e/studio-a11y.spec.ts`
Keyboard/ARIA assertions (no new deps, §3b):
- Tab order traverses: geography picker → presets → typography → metadata
  checkboxes → export controls, with visible focus.
- Every form control has an accessible name (label/aria-label).
- Metadata checkboxes and export buttons operable via keyboard alone
  (Space/Enter), and the QA checklist status is exposed with `role="status"`.
- The preview pane's loading state is announced (aria-busy or live region).

#### [MODIFY] components where assertions fail — smallest change that passes
(add labels/roles/focus styles; no visual redesign).

Findings that need judgment (contrast ratios, screen-reader nuance) go in the
completion report as a list, not as speculative fixes.

## 8. Deploy checklist (ROADMAP Phase 6, item 3 — owner-executed)

#### [MODIFY] `docs/DEPLOYMENT.md` — append a "Final rollout checklist" section:
pre-deploy (backend tests, frontend build+e2e, one manual parity pass on live
stack), the `gcloud builds submit` invocation with the repo's `cloudbuild.yaml`
substitutions, post-deploy smoke (health endpoint, one preview, one export of
each format, QA statuses visible), and rollback (`gcloud run services
update-traffic` to previous revision). Verify every command against
`cloudbuild.yaml` as it exists — do not invent substitutions.

## 9. ROADMAP truth-up

#### [MODIFY] `docs/ROADMAP.md`
- Phase 3 → 🟢 Completed (UI + wiring + QA integration; cite files).
- Phase 4 → 🟢 Completed (family/weight/tracking overrides live).
- Phase 5 → 🟢 on completion of §§4–5, with the parity-method note.
- Phase 6 → 🟡 "code complete, deploy pending owner checklist (§8)".

## 10. What NOT to do

- No drone-path edits (frontend or backend). No backend runtime changes —
  `test_render_parity.py` is additive test code only.
- No new dependencies, runtime or dev (§3b). Playwright is already present.
- No visual redesign under the accessibility banner.
- No payload/migration field removal (§3c).
- No actual deployment, no Dockerfile/cloudbuild edits beyond docs.
- Do not "fix" the pre-existing Leaflet `clearRect` dev-console warning or the
  2 pre-existing async backend test failures — both are documented, unrelated.

## 11. Commit convention & verification

Commits: `Poster 5+6: <description>` with bullet body. Push to
`claude/poster-phase-5-6-completion`; open a draft PR to `main`.

All four verification commands (§2) must pass. Report per-section outcomes,
accessibility findings needing judgment, and the deploy checklist location in
the completion summary.
