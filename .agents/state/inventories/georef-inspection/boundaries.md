# Inspection phase reference classification

Baseline: main merge commit 5395e3a. No runtime changes yet.

Post-implementation addendum: inspection uses existing ClippingService and repository
queries, with pure viewport clipping in georef_inspection. New route callers are
georefApi.inspectRivers and GeorefMap; route tests characterize read-only behavior,
invalid/missing inputs and changed source-ID selection. GeorefPlacement owns affine
SVG placement, tested separately from thumbnail generation. Naming is not implemented
because source acquisition and independent evaluation remain unresolved. Shapely's
unavailable dependency and the Leaflet mobile test mismatch were classified as direct
phase consequences; regression checks and details are in GEOREFERENCING_INSPECTION.md.

- Producers: `georef_validation.validate_raster` produces QC; `georef_recovery.recover_result` and `georef_service.native_result` produce processing outputs; router `encoded_result` produces the browser response.
- Consumers: `GeorefResults` is shared by Georeferencer and Studio. Both must retain old response compatibility; avoid page-specific interpretation of QC.
- API boundary: `frontend/src/lib/georefApi.ts` defines the result contract and downloads. Add viewer/evidence fields without removing legacy metrics.
- Persistence: existing manifest/run metadata stores JSON. Keep images ephemeral. Any production migration requires separate approval and is excluded from this phase.
- Tests: georef pipeline and recovery suites exercise validation and registration; routes cover response handling; browser integration covers both pages. Add affine overlay, absent evidence, attribute selection and ambiguous-name cases after baseline approval.
- Evaluation consumer: georef_benchmark reads QC and records independent transform errors; distinguish algorithm acceptance from benchmark acceptance.
- Irrelevant matches: six inventory self-references are generated metadata, not runtime dependencies.

Planned boundaries: QC evidence in the validation service; transform-aware result viewer in shared Georef components; bounded source queries behind repository layer; a separate name-matching service with source provenance and unknown/ambiguous outcomes.

Risks: rotated/sheared images must not be stretched into bounding boxes; tile-provider terms and attribution must be checked; named-river source and evaluation truth are not yet selected. No survey-accuracy claims. Preserve current API clients, current poster rendering and existing workspace authentication.

Rollback: remove optional viewer/name matching via feature control or source rollback; retain existing manifest/QC fields and metadata. No deployment is authorized by this phase preparation.
