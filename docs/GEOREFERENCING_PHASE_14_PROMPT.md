# Draft Phase 14 prompt: Studio–Georeferencer integration and inspection workspace

This is a draft execution prompt only. Do not begin implementation until the
phase has an approved baseline, isolated branch, allowed-file scope, and human
approval recorded in `.agents/state/current_phase.json`.

## Prompt

Begin Phase 14, `georef-studio-georef-integration`, from the finalized `main`
that contains the closed Phase 13 UI polish. Inspect the current Studio,
Georeferencer, API contracts, browser state behavior, and existing test
harnesses before editing. Establish and obtain approval for a clean baseline.

Implement the smallest coherent Studio–Georeferencer integration and
inspection-workspace slice:

1. After a successful Studio export response, expose an immediate “Open in
   Georeferencer” action without requiring a user download. Use a short-lived,
   single-use IndexedDB handoff containing the generated poster blob, poster
   ID, manifest/provenance metadata, creation time, and expiry time. Do not put
   image bytes in a URL or persist raw images server-side for this slice.
2. Have the Georeferencer automatically populate the transferred image and
   metadata. Preserve manual upload for external images, older posters, and
   expired or unavailable handoffs. Make consumed, expired, malformed, and
   missing handoffs explicit and recoverable.
3. Add authoritative backend upload defenses: allowlisted actual content
   types, byte and decoded-pixel limits, malformed-image rejection,
   decompression/resource safeguards, safe temporary handling, request
   timeouts, rate/concurrency controls, sanitized names, and no raw bytes in
   logs. Add regression coverage for malformed, oversized, misleading, and
   resource-exhausting inputs. Client checks are supplementary only.
4. Add a tamper-evident Studio provenance manifest or signature containing the
   poster ID, configuration/artifact hash, renderer version, source version,
   and issuance metadata. Treat embedded metadata as removable and never use
   it as the sole security boundary.
5. Gate Studio selections until geography and preset bootstrap is ready. Add
   an accessible first-visit/reopenable readiness dialog with workflow
   guidance, current release notes, temporary-processing/privacy information,
   and explicit accuracy limitations. Do not invent legal policy text; add
   links only where approved policy routes exist.
6. Make Geographic Inspection a first-class responsive tab, enlarge the map,
   and preserve lazy-loaded rivers, names, basemap behavior, selected-feature
   details, attribution, and accuracy disclaimers. Do not add analytical
   scoring or surveyed-accuracy claims in this phase.
7. Use shared visual tokens and components to improve Studio/Georeferencer
   parity. Document a staged unified-workspace architecture while keeping
   route, backend, and compatibility boundaries intact.

## Required verification

- Browser tests for direct handoff, preload without upload, expiry/consumption,
  refresh/reopen behavior, manual-upload fallback, and failure recovery.
- Backend security tests for file type, size, dimensions, malformed content,
  metadata, timeout, and resource-limit cases.
- Studio bootstrap/loading/dialog tests, including keyboard access and
  disabled selection controls before readiness.
- Responsive tab and enlarged-map tests, including lazy-load and disclaimer
  behavior.
- Full repository verification against the approved baseline, changed-file
  scope review, and a phase walkthrough with rollback and unresolved risks.

## Explicit exclusions

Do not change country coverage, ETL, recovery algorithms, canonical GeoParquet
schema, production deployment, database schema, runtime scraping, or legal
policy claims. Advanced map analytics and full application consolidation are
follow-on scopes unless separately approved.
