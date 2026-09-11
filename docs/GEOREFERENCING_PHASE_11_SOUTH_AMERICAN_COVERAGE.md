# Phase 11 closeout: South American country coverage

## Identity

- Phase: `georef-south-american-coverage`
- Implementation PR: #73
- Closeout branch: `codex/georef-phase-11-south-american-closeout`
- Merged implementation commit: `a4294829e55088a9f34693faa46dcc57f2bc7e23`
- Approved baseline commit: `aa3c1fff32bf42071a897cb0b8361b9bb8a493e8`
- Approved baseline artifact: `.agents/state/baselines/georef-south-american-coverage/baseline_approved.json`
- Deployment: none

## Scope completed

Phase 11 delivered the selected bounded Suriname increment. The target set
followed the Government of Suriname assessment and covered Marowijne,
Commewijne, Suriname, Saramacca, Coppename, Nickerie, and Corantijn Rivers.

Suriname is classified as `partial`:

- 3 of 7 targets passed;
- 397 reaches matched and 21 were ambiguous;
- 17 OSM display features and 418 indexed HydroRIVERS reaches were recorded;
- artifact size: 370,834 bytes; and
- SHA-256: `81d764e3de5c3a2272a2c3d5e2ed0228e9f0d2d2f2afe17ce74b44f6b02b3851`.

Saramacca, Coppename, Nickerie, and Corantijn produced no qualifying source
object in the bounded build. They remain explicitly unverified; no matches are
fabricated. The result is source-to-source evidence, not surveyed positional
accuracy or complete national coverage.

## Verification

- Targeted river-name tests: 8 passed.
- Approved baseline: 242 passed, 3 skipped; TypeScript and lint passed.
- Post-edit backend verification: passed with no failures.
- Post-edit TypeScript verification: passed.
- Post-edit frontend lint: passed.
- Approved-baseline comparison and changed-file scope: passed.

Expected skips concern unavailable database-populated geography fixtures and the
PNG/SVG-only design-asset contract case. OSM/Nominatim and the clip API were
build-time inputs only; runtime scraping, raw source dataset commits, database
migrations, production writes, and deployment were not introduced.

## Remaining inventory and risks

The South American database inventory also contains Ecuador, French Guiana,
Paraguay, and Uruguay. They were not selected for this bounded increment and
remain `not evaluated`, rather than being represented as failed or fabricated
coverage. Guyana was already covered and was not reworked.

## Rollback

Revert the Phase 11 implementation PR and this closeout commit, or remove the
Suriname packaged artifact and associated profile, tests, documentation, and
state records. No database or production state requires rollback.

## Exit criteria

- Selected Suriname profile, provenance, manifest, evaluation, and artifact: pass.
- Explicit partial outcome and limitations: pass.
- Full verification against approved baseline: pass.
- Documentation and rollback instructions: pass.
- Implementation merge: pass.
- Closeout review/merge: pending human action.

## Next action

Merge this closeout update. Then begin the final georeferencing program
closeout from the finalized `main`, record a final baseline, and consolidate
the supported, partial, unavailable, and not-evaluated country inventory.
