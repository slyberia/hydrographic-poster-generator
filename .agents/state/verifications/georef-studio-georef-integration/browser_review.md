# Phase 14 browser review

Date: 2026-09-13
Branch: `codex/georef-phase-14`
Baseline: `f7c9875a8a1582205543d0ea8abcdbe91ab71eb0`

## Automated result

Command from `frontend/`:

```powershell
$env:PHASE14_INTEGRATION='1'; node node_modules/@playwright/test/cli.js test e2e/georef-handoff-integration.spec.ts e2e/studio-handoff.spec.ts e2e/studio-workspace.spec.ts e2e/studio-a11y.spec.ts e2e/studio-parity.spec.ts e2e/studio-resilience.spec.ts e2e/georef-names.spec.ts e2e/georef-placement.spec.ts --workers=2
```

Result: **33 passed, 0 failed**.

The repaired stored-expired and stored-malformed handoff tests both pass. The expired fixture now includes the production `expires` URL hint, so route-entry cleanup may remove the expired record while the receiving page still reports `expired`; the assertion continues to verify that the stored raster bytes are gone.

The real integration test passed through the local Phase 14 fixture server: PNG export, no-download browser handoff, server-record provenance verification, recovery, and GeoTIFF download. The fixture uses synthetic geometry and in-memory metadata persistence; this is not production or live-database evidence.

## UI and interaction review

Previously captured and visually inspected evidence remains:

- `work/phase14-studio-guide.png`
- `work/phase14-inspection-desktop.png`
- `work/phase14-inspection-mobile.png`
- `work/phase14-real-recovery.png`

These captures cover the accessible Studio guide, desktop and mobile inspection workspace, map sizing, tab hierarchy, readable controls, and the real local recovery flow. No new baseline screenshots were available before implementation; the prior phase walkthrough and locked automated baseline are the before-state evidence.

The resilience test intentionally logs a JSON parse warning while loading garbage localStorage and then confirms that defaults recover without a crash. No browser test reported a failure.

## Scope and limitations

Browser verification is local only. It does not establish production deployment behavior, distributed ingress limits, live database behavior, surveyed accuracy, or a portable digital signature. Those remain outside Phase 14 and require separately approved follow-up work.
