# Georeferencing program closeout

## Decision and authority

The bounded program closeout audit is complete with documented limitations. Phase 7 through Phase 14 implementation/closeout PRs are merged. This final audit is prepared for its own PR review and merge; operational release approval remains separate.

Baseline: `b790c7f20ec53b704016f438df974f76e510ea8f` (PR #78). Branch: `codex/georef-program-closeout`. The final commit is the commit containing this report and the associated evidence.

On 2026-09-14 the user granted blanket authorization to complete this phase and apply that authorization to phase gates. The approved baseline and this scoped evidence/limitations review use that advance authorization. They do not assert separate human inspection of each generated report. No application, country artifact, database, secret, or deployment configuration changes are part of this closeout.

## Final inventory

The machine-readable source is `backend/app/data/river_names/country_registry.json`. Fresh audit evidence is `.agents/state/verifications/georef-program-closeout/inventory_audit.json`, including full artifact SHA-256 values, byte sizes, profile/manifest fingerprints, counts, per-country review decisions, and missing-source targets.

There are **26 registered countries/territories: 5 verified, 10 partial, 10 unavailable, and 1 legacy passed (Guyana)**. There are **22 packaged artifacts and 4 intentionally withheld artifacts**. The 21-country Phase 12 batch reconciles to 4 verified, 7 partial, 10 unavailable, 17 packaged, and 4 withheld. The five earlier countries were retained unchanged.

These are bounded river-name evaluation outcomes, not a list of national Recovery guarantees. `verified` means the selected targets met that evaluation's criteria; it does not mean national completeness or surveyed positional accuracy. An unavailable country can have a packaged artifact recording an unsuccessful bounded evaluation. A withheld entry has no runtime naming manifest and the optional names request returns not evaluated. Availability of names does not govern the base map or Recovery algorithm.

| Country/territory | Recorded status | Packaged artifact | Missing-source targets or limitation |
| --- | --- | --- | --- |
| Antigua and Barbuda | unavailable | withheld | authoritative profile documents no named perennial river systems for this bounded evaluation |
| Belize | partial | yes | Rio Hondo |
| The Bahamas | unavailable | withheld | authoritative profile documents no named perennial river systems for this bounded evaluation |
| Barbados | unavailable | withheld | authoritative profile documents no named perennial river systems for this bounded evaluation |
| Costa Rica | verified | yes | See bounded target evaluation |
| Cuba | verified | yes | See bounded target evaluation |
| Dominica | unavailable | yes | See bounded target evaluation |
| Dominican Republic | verified | yes | See bounded target evaluation |
| Ecuador | verified | yes | See bounded target evaluation |
| Grenada | unavailable | yes | Pearls River, Saint John River, Saint Mark River, Saint Patrick River |
| Guatemala | partial | yes | Samatala River, Usumacinta River |
| French Guiana | partial | yes | Oyapock River |
| Guyana | passed | yes | Legacy provenance/summary review flag |
| Honduras | partial | yes | Ulua River |
| Haiti | verified | yes | See bounded target evaluation |
| Jamaica | partial | yes | Montego River |
| Saint Kitts and Nevis | unavailable | yes | College Street Ghaut |
| Saint Lucia | unavailable | yes | Mabouya River |
| Nicaragua | partial | yes | Prin zapolka River, San Juan River |
| Panama | partial | yes | See bounded target evaluation |
| Paraguay | unavailable | withheld | runtime HydroRIVERS clip is unavailable for the registered geography |
| El Salvador | partial | yes | Grande de San Miguel River, Jiboa River |
| Suriname | partial | yes | Coppename River, Corantijn River, Nickerie River, Saramacca River |
| Trinidad and Tobago | unavailable | yes | North Oropouche River |
| Uruguay | partial | yes | Negro River, San Jose River, Santa Lucia Chico River, Santa Lucia River |
| Saint Vincent and the Grenadines | unavailable | yes | Buccament River, Rabacca River, Richmond River, Wallilabou River |

Targets listed as missing-source remain `not_evaluated`, including Rio Hondo, Montego River and four Suriname targets. Other failures and partial outcomes remain in the original evaluations. Source objects, OSM display segments, and indexed HydroRIVERS reach associations are different counts and must not be added or substituted for one another. Matched, ambiguous, unnamed-in-source, and not-evaluated states are preserved.

Guyana's schema-v1 `passed` outcome is intentionally retained. The existing review service returns `review_required` because independent-reference and target-summary fields are absent. Phase 12 explicitly accepted that legacy limitation and broad portal-level references; this audit preserves that decision and does not improve the underlying source evidence.

## Artifact and delivery verification

For all 22 packaged artifacts the audit recomputes byte SHA-256 and length and compares them with the manifest and content-addressed filename. It also checks feature and reach counts, naming-state counts, registry/profile/manifest geography and status consistency, batch publication decisions, and loading through the real packaged runtime service. All pass. Four missing manifests match documented withholding decisions; no unregistered manifest or duplicate registered geography was found.

The committed derived JSON artifacts are the runtime naming inventory. The GeoParquet writer, reader, and Python round-trip tests exist, and Phase 8A records a Guyana bakeoff. No per-country `.parquet` files are committed. This is not evidence of a deployed regional GeoParquet catalog. R interoperability was documented at the schema level; no R consumer execution evidence was found. The MVT bakeoff is one z0 tile, not a complete PMTiles archive. Those limits qualify the foundation's closeout.

The runtime serves checksum-checked packaged JSON at `/georef/river-names/{slug}/{dataset_version}`. The audit additionally verifies byte size. Generic delivery helpers also validate both checksum and size, but the current river-name loader itself checks SHA-256. Immutable dataset responses use one-year caching; manifest responses use short-lived caching.

With `GEOREF_ARTIFACT_CDN_BASE_URL` unset, manifests advertise the local API route. With it configured, the router constructs `river-names/{manifest.country}/{dataset_version}.json` (country display name, URL-encoded; not the slug). An operator publishing objects must use exactly that advertised path and verify bytes and browser CORS behavior.

The frontend fetches the advertised URL directly. It does **not** automatically retry the local route on CDN failure. The packaged route remains available, but returning normal clients to it requires an operator-approved configuration change and refreshed manifests. A preconfigured CDN outage should therefore show an optional-layer error, not be described as seamless failover.

## Benchmark evidence and boundaries

The retained Guyana report is `.agents/state/verifications/georef-recovery-calibration/guyana-benchmark.json`. It records 6,635 source features, 9/9 supported transformations recovered, one unsupported-perspective case rejected, zero false accepts/rejects in those recorded cases, and accepted-case independent p95 error of 0.7418100412733598 uploaded-image pixels. The audit fingerprints the retained report and lists every case.

The report does **not** contain a wrong-source case. Wrong-source rejection has regression-test coverage; the report's zero false accepts must not be read as a regional wrong-source benchmark result.

`docs/GEOREFERENCING_RELEASE.md` retains historical Jamaica/Belize evidence of 40/40 Recovery recipes and a worst recipe p95 error of 6.84 uploaded-image pixels. The older MVP documents Jamaica procedural results. These are historical prose records, not newly rerun current-format Belize and Jamaica reports. The original Phase 7 three-country requirement is not fully backed by comparable retained reports. Phase 7's merged closeout is acknowledged with that limitation; no missing result is manufactured.

Thresholds remain provisional. Source-network agreement, transform registration error, surveyed absolute accuracy, and physical capture validation remain separate. Neither surveyed control nor a field-photo/scan benchmark has been established by this program closeout.

## Reconciled phase history

| Phase | Merged evidence | Closeout interpretation |
| --- | --- | --- |
| 7 calibration | #67, `fe5decf` | Benchmark implementation and Guyana report; regional evidence limits above |
| 8 delivery | #68, `a2ec098` | Packaged/optional-CDN contract; publication and operational failover not demonstrated |
| 8A GeoParquet | #69, `863d52b` | Writer/reader and Python validation; R and complete tiled delivery remain unverified |
| 9 Caribbean | #70, `f2c95af` | Bounded Jamaica increment; later batch handled in Phase 12 |
| 10 Central America | #71/#72, `aa3c1ff` | Costa Rica increment and closeout; later batch handled in Phase 12 |
| 11 South America | #73/#74, `f1994be` | Suriname increment and closeout; later batch handled in Phase 12 |
| 12 country ETL | #75, `ed027f4` | 21 additional evaluated outcomes, including four withheld |
| 13 UI polish | #76/#77, `f7c9875` | Workflow and inspection UX closeout |
| 14 integration | #78, `b790c7f` | Studio handoff, upload limits, server-manifest provenance and inspection tabs |

The roadmap now reconciles those merged phases as closed. Original walkthroughs remain historical snapshots, including their then-pending merge wording and then-unevaluated country lists. This report supersedes those administrative inventory statements without changing historical evidence. `docs/CLOSEOUT_PLAN.md` is an older Cloud Run audit plan and is not this program's closeout procedure.

## Verification and process

The Execution Core lifecycle supplied the phase gate, baseline comparison, evidence classification and scope review. The Architecture skill guided examination of the shared delivery, provenance, and storage boundaries; no architecture or public contracts changed.

A clean baseline at the merged Phase 14 commit produced **266 passed, 3 skipped** (269 total cases); TypeScript and frontend lint passed. The skips are two database-populated geography fixtures and the PNG/SVG-only design-asset contract case. This corrects earlier Phase 14 chat/PR summaries that incorrectly reported 269 passed plus 3 skips. The committed Phase 14 stdout also reports 266 passed and 3 skipped.

The final post-edit report is `.agents/state/verifications/georef-program-closeout/post_edit_verification.json`. Post-edit results: 266 passed, 3 skipped; TypeScript and lint exit 0; no new, changed, or ambiguous failures and no out-of-scope paths. The inventory audit and its repeatability/failure-detection checks are recorded beside it. The same backend, TypeScript and lint commands passed after the documentation/audit changes.

Prior Phase 14 browser review records 33/33 passing cases, including local export → handoff → provenance verification → recovery → GeoTIFF download. Its integration server used synthetic geometry and in-memory metadata. No UI or runtime behavior changed here, so that browser suite is referenced as historical evidence rather than needlessly rerun or presented as production validation.

Dependency classification: registry/profile/ETL scripts produce inventory; country review and river-name services consume it; manifests and content-addressed JSON are persisted copies; optional CDN URLs and browser fetches are delivery consumers; backend tests are regression consumers; docs/roadmap are administrative consumers. The literal-search helper initially returned no matches because excluding a directory called `work` also excluded this checkout's ancestor. An explicit scoped `rg` search corrected the inventory; results/classification are retained in `reference_review.md`.

## Operational fallback and rollback

1. For an expired, consumed, or unavailable browser transfer, regenerate in Studio or download a raster and upload it manually. Browser transfer data expires after five minutes and is cleaned at the next opportunity; a closed browser does not guarantee immediate erasure.
2. For an optional naming-layer error, retain the result and base map, retry the layer, and inspect the advertised URL. Check the packaged route's status, SHA-256, and byte size against the manifest. An unavailable/withheld country is an explicit outcome, not a reason to invent a name.
3. For CDN recovery, an operator may separately approve disabling the CDN base setting, then refresh/revalidate manifests to advertise packaged URLs. Test the actual published display-name object paths, CORS, and cache headers before re-enabling the CDN.
4. For a release rollback, an operator selects the last known-good deployed revision and follows the normal approved release procedure. This task did not inspect live revision/traffic state and cannot name a current production rollback target.
5. To roll back only this closeout, revert its commit through review; runtime and country data are unchanged. To roll back Phase 14, use the prior release through the approved process, preserve existing API/manual paths, and discard pending `hydro-studio-handoff-v1` entries if necessary. It contains no durable poster settings. No database migration is required.

Server-manifest provenance is verified tamper evidence, not a portable signature. Upload limits are per process; distributed ingress quotas, realistic worker-memory sizing, abrupt-termination cleanup and production readiness need release verification.

## Exit criteria and residual work

| Closeout criterion | Result |
| --- | --- |
| Inventory reconciled, including partial/unavailable/withheld outcomes | Pass |
| Packaged manifests/hashes/counts and runtime loading checked | Pass |
| Benchmark evidence consolidated and missing coverage stated | Pass with documented limits |
| GeoParquet/delivery claims reconciled with retained evidence | Pass with documented limits |
| Fallback, rollback, authorization, scope and verification recorded | Pass |
| Historical phase statuses reconciled with merged history | Pass |
| Production deployment/field accuracy/comparable three-country benchmark | Outside this audit; not established |
| Final closeout PR merge | Pending human review/merge |

The closeout records the delivered program and its accepted limitations under the user's advance authorization. It does not silently convert original unmet validation ambitions into successful tests.

Recommended follow-ups, in order: review and merge this closeout PR; run a separately scoped release-readiness check with realistic image sizes and actual delivery paths; if broader validation is needed, retain comparable Belize/Jamaica and wrong-source benchmarks, execute R consumer checks, and measure complete tiled delivery. Country improvements or shared-workspace consolidation can then be scoped from evidence. No further phase starts automatically.
