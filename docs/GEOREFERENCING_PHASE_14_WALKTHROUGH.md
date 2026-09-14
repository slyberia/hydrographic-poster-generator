# Phase 14 — Studio to Georeferencer

## Result and authorization

Implemented on `codex/georef-phase-14` from `f7c9875a8a1582205543d0ea8abcdbe91ab71eb0` (PR #77).
On 2026-09-13 the user approved Phase 14 and explicitly authorized use of that approval for the human gates required to complete it. The baseline review records that advance authorization; it does not claim separate human inspection of the generated report.

Implementation and local verification are complete. Publication is a draft PR for review. Nothing has been merged or deployed by this phase.

## User workflow

1. Studio waits for saved settings, geographies and presets before enabling selections or preview/export. Loading failures offer Retry. An accessible native dialog appears on the first visit in a browser session and can be reopened from Studio guide; Escape and keyboard navigation work.
2. **Open in Georeferencer** generates a PNG using the current composition and export dimensions without starting a download. Existing downloads remain available. A completed raster export can also be transferred from its verification action.
3. IndexedDB transports the blob, filename, poster ID, provenance, creation time and expiry. The URL carries only a random token and expiry hint. One read/write transaction replaces the record with a consumed tombstone before the receiving page gets the image.
4. The Georeferencer populates the image and metadata, then waits for Analyze alignment. Missing, consumed, expired, malformed and unavailable transfers offer regeneration or manual upload. Replacing a transferred image clears its associated metadata. Refreshing a consumed link requires a new transfer or manual upload.
5. Results offer Alignment evidence and Geographic Inspection tabs, keyboard tab navigation, a responsive 440–900 px map, existing lazy river/name layers, basemap controls, attribution, and downloads. Provenance verification is displayed separately from alignment evidence.

## Architecture and dependency inventory

The reference search is retained locally in `work/phase14-references.json`; its initial console encoding failure was resolved by running Python with UTF-8 enabled.

| Boundary | Producers and consumers | State and compatibility |
| --- | --- | --- |
| Export | Existing export router produces final raster and additive X-Studio-Provenance header; triggerExport and Studio consume it | Existing body, filename and X-Poster-ID remain; no schema migration |
| Browser transfer | Studio produces, studioHandoff owns storage, Georeferencer consumes | New isolated IndexedDB v1 store; no changes to saved poster-settings schema; legacy poster-ID/manual paths remain |
| Provenance | Export hashes final bytes; existing immutable manifest record anchors them; recovery compares against the server record | Hash stored in the existing generator JSON field; optional RecoveryOptions field; response status additive |
| Upload | Admission middleware, bounded form route and raster worker enforce limits before domain processing | Existing multipart image/options contract and recovery algorithm preserved |
| Results | Shared GeorefResults/GeorefMap consume native and recovery responses | Older responses without viewers or provenance retain explicit unavailable states |
| UI | Existing shared tokens/buttons, Studio readiness component, shared result components | Existing route/backend boundaries preserved |

There is one authoritative export request model and one existing canonical renderer. Recovery workers receive a snapshot of the loaded rules registry, including database overrides, so isolation does not substitute defaults for runtime configuration. No business logic moved into the client.

### Browser storage limits

Transfers expire after five minutes. At most three records of up to 25 MiB each are retained. Consumption removes blob and provenance bytes atomically, leaving a small expiry-bound tombstone. Cleanup runs on creation/consumption, route entry, and every 30 seconds/on focus while Studio is mounted. Closed/suspended browsers cannot run cleanup: expired bytes are deleted on the next cleanup opportunity, not by a guaranteed background erasure service. Browser storage can be unavailable; the download/manual path remains usable.

### Upload limits and temporary handling

- Actual PNG/JPEG/TIFF allowlist; declared MIME must agree (generic octet-stream/absent MIME remains supported).
- Complete request: 26 MiB before multipart parsing, including chunked requests. File: 25 MiB; one file and one options field. Options and embedded metadata: 64 KiB.
- Decoded image: 40 million pixels, maximum side 9000 px, single frame. Malformed/truncated and decompression-bomb inputs are rejected.
- Per process: two admitted upload requests; token bucket capacity 30, replenished at one request per two seconds, with 429/Retry-After. Worker admission independently remains bounded at two even after client cancellation.
- Upload body deadline 30 seconds; application-stage deadline 120 seconds; child decode deadline 20 seconds and recovery deadline 85 seconds. Child timeouts kill and reap the worker. A cancelled request can leave bounded worker cleanup running until its stage deadline.
- Workers use unique private temporary directories and fixed internal names. Client filenames never become server paths and never enter logs. Worker input/output is removed after completion, failure or timeout. Abrupt host/process termination remains an operating-system cleanup concern.
- On Linux, each child additionally has a 3 GiB address-space ceiling. Windows uses byte, pixel, concurrency and killable wall-time limits. These workers provide resource isolation, not an OS security sandbox.

Limits are per application process, not a distributed or per-user quota. Public edge/global rate limiting and workload sizing require a separate deployment review.

### Provenance meaning

The manifest binds poster ID, configuration/reference/transform hash, final artifact SHA-256, renderer version, source version and issuance time. Recovery fetches the existing server manifest and compares both the supplied envelope and actual uploaded bytes. A mismatch is rejected. The digest record works across workers without a new signing secret or database migration.

This is tamper evidence verified against a server record, **not a portable digital signature**. Removing metadata does not establish integrity: manual/legacy recovery remains available and reports no verified Studio provenance. Provenance never replaces content validation or alignment checks, and it makes no ownership, surveyed-accuracy or legal-policy claim.

## Verification and evidence

The locked baseline is `.agents/state/baselines/georef-studio-georef-integration/baseline_approved.json`: 246 backend tests passed, three existing skips; TypeScript and lint passed. Original unapproved evidence is preserved.

The final machine-readable comparison is `.agents/state/verifications/georef-studio-georef-integration/post_edit_verification.json`. It checks full backend tests, TypeScript, lint, baseline differences and allowed paths. Additional browser results are recorded in `browser_review.md` beside it.

New backend regression coverage exercises types, misleading MIME, bytes/dimensions/pixels/frames/metadata, malformed input, request/body/worker timeouts, admission and multipart limits, cleanup, unchanged multipart schema, export digest persistence, field/byte tampering, and actual recovery through the verified transfer path.

Browser coverage exercises direct transfer with no download, preload without file-picker input, consumed/reopen states, expiry and malformed-record cleanup, missing/unavailable storage, concurrent tabs, manual fallback, bootstrap failure/retry, guide keyboard access, existing Studio accessibility/composition/persistence/download flows, result retention after errors, tab navigation, mobile width, map sizing and lazy name loading.

The local integration fixture `backend/tests/fixtures/georef_phase14_server.py` uses the real export, validation, provenance, worker and recovery code with synthetic river geometry and in-memory metadata persistence. Geography/preset/preview responses in the browser remain deterministic fixtures. It is not production or live-database verification.

Reproduce from the checkout:

1. Run the configured georef Python interpreter with `backend/tests/fixtures/georef_phase14_server.py` (localhost:8000).
2. From frontend set `PHASE14_INTEGRATION=1` and run the repository-pinned Playwright CLI with `e2e/georef-handoff-integration.spec.ts`, `e2e/studio-handoff.spec.ts`, the existing four Studio suites, and the georef names/placement suites.
3. Run `python .agents/scripts/post_edit_verification.py`.

Visual evidence: `work/phase14-studio-guide.png`, `work/phase14-inspection-desktop.png`, `work/phase14-inspection-mobile.png`, and `work/phase14-real-recovery.png`. Inspected desktop/mobile captures confirm readable controls, tab hierarchy, map size and no page-width overflow. No new baseline screenshots were captured before editing; the automated baseline and prior phase's documented UI are the before-state evidence.

### Failures investigated

- New worker initially lacked package lookup and loaded presets: fixed its working directory and explicit registry snapshot; real existing recovery tests pass.
- An oversized test parameter produced an excessive generated pytest ID: replaced it with a concise explicit ID.
- Chromium initially failed with sandbox `spawn EPERM`: rerun with authorized browser process access.
- New error assertion matched Next's route announcer as well as the form alert: scoped the assertion to the form.
- Prior Studio test expected the replaced poster-ID link: updated it to assert transfer and image preload.
- Synthetic integration fixture initially bound repository stub methods incorrectly: corrected only the fixture; real export/recovery flow passed.

No unexpected failure required a recovery-algorithm, country, ETL, database, deployment or legal-policy change.

## Scope, exit criteria and rollback

The seven Phase 14 deliverables are implemented: direct transfer; automatic preload and recovery states; upload defenses; tamper-evident provenance; bootstrap/readiness UX; tabbed enlarged inspection; and shared visual treatment with staged workspace architecture. Final reports provide pass/fail evidence. Program status is implementation complete, draft review pending.

No country artifacts, ETL, recovery algorithms, canonical GeoParquet schema, runtime scraping, database schema or production configuration changed. Full consolidation and advanced analytical scoring remain follow-on scopes. No new policy routes or legal text were invented.

Rollback by reverting the Phase 14 feature commit or restoring the prior release through the normal approved release process. Existing request fields, downloads, schemas and saved settings require no migration. Old frontends ignore the new export header; new frontends accept exports without it. During backend rollback, already-created handoffs with the optional new field can require regeneration or manual upload. Clear the `hydro-studio-handoff-v1` browser database to discard pending transfers if rolling back; it holds no durable user settings.

## Recommended paths forward

First review the draft PR and run a staging deployment with realistic poster sizes and target worker memory; evaluate distributed ingress limits and operational cleanup. Production deployment remains separate.

Next, consider a shared workspace shell and shared input/session controller while keeping Studio/export and Georeferencer/recovery contracts independent. Extract shared orchestration only after cross-route tests prove parity. A portable signing-key lifecycle is a separate option if offline third-party provenance verification becomes a requirement. Advanced map analytics and full application consolidation need their own scoped approval and evidence.
