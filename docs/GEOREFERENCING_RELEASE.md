# Georeferencing release — 2026-09-06

## Scope and approval

Release source: `086827c7e55985ac5c66df1a33404e5be80acb85`, on `codex/georef-release`, based on main `7919ffc`. The user approved calibration, tests, commits and deployment, then explicitly approved the release phase record and aggregate test evidence. Existing authenticated drone workspace routes are preserved. No main-branch merge is included.

## Verification

- Backend: 211 passed, 3 skipped (two require configured live geography IDs; one unsupported asset/PDF combination).
- Frontend: full lint, TypeScript and production build passed. Build required network access for existing Google Fonts.
- Native and Recovery browser integration: 2 passed on the integrated release candidate, including real source processing, TIFF download, QC overlay, mobile width, console checks and retaining a successful result after an invalid request. Database persistence is mocked in this local browser harness; this is not production verification.
- Procedural calibration: 40/40 Recovery recipes and 5/5 Native variants passed across Jamaica and Belize. Provisional thresholds only; not global or surveyed accuracy. Worst recipe p95 independent error was 6.84 uploaded-image pixels.
- Post-edit verification passed, with no out-of-scope changes. Human acceptance is of aggregate command results, not a per-test-identity baseline.

## Release and rollback

Use the existing `hydro-poster-generator-trigger` / `cloudbuild.yaml` in project `gen-lang-client-0377032917` for `hydro-backend` and `hydro-frontend`, region `us-central1`. Deploy the release branch without changing secrets, auth behavior, or merging main. Capture previous revisions before running the build. If validation fails, stop rollout and seek approval to restore traffic to the captured prior revisions. Retain the additive metadata schema; do not drop tables on rollback.

Production exit criteria remain pending: successful pipeline, schema readiness, Native export and metadata retrieval, Recovery output and persisted GCP verification, and private drone-route checks. Do not describe the release as verified in production until those checks finish.
