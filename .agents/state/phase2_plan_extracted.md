<USER_REQUEST>
No. I've revised it already:
Below is the revised execution-ready plan. It consolidates overlapping work while preserving the dependency order required for compatibility, preview/export parity, and safe rollout.

# Phase 2: Layout, Metadata & Typography Redesign

## Goal

Introduce:

* Granular metadata visibility
* Typography customization
* Manual layout controls
* Accessible tooltips and explanatory UI
* Persistent frontend settings
* Preview/export parity

without breaking:

* Legacy `show_metadata`
* Existing typography presets
* Existing render requests
* Preview, export, or sensitivity routes
* Existing browser sessions and saved settings
* Design Asset Mode
* Existing Cloud Run deployments

Phase 2 is an umbrella milestone executed through four separately approved subphases.

Do not generate one broad `current_phase.json` for all Phase 2 work. Each subphase requires its own human-approved phase state, branch, baseline, allowed paths, and exit criteria.

---

# Core Invariants

These conditions must remain true throughout Phase 2:

1. Existing requests without new fields continue rendering identically.
2. Legacy `show_metadata` remains accepted during migration.
3. Existing `typography` presets remain accepted.
4. Preview and export use the same resolved style, typography, metadata, and layout configuration.
5. Low-level renderers do not interpret legacy and new API fields independently.
6. Frontend settings migration preserves unrelated saved settings.
7. Manual layout positions use profile-independent coordinates.
8. Typography changes trigger layout remeasurement and bounds validation.
9. Optional design assets cannot prevent the base map from rendering.
10. Every output-changing setting is represented in cache identity and export metadata where applicable.
11. Old frontend builds remain compatible with new backend revisions throughout rollout.
12. No subphase proceeds automatically into the next.

---

# Operational Execution Guide for Antigravity

## 1. Work One Subphase at a Time

Each Antigravity task must identify exactly one of:

* Phase 2A: Contracts, normalization, and state migration
* Phase 2B: Metadata and typography rendering
* Phase 2C: Layout and interaction
* Phase 2D: UI rollout, accessibility, and full integration

Approval of this umbrella plan does not authorize implementation of every subphase.

Before implementation, create a separate:

```text
.agents/state/current_phase.json
```

for the active subphase only.

---

## 2. Required Pre-Edit Sequence

Before editing:

1. Read `AGENTS.md`.
2. Load:

   * `.agents/skills/execution_core/SKILL.md`
   * `.agents/skills/architecture/SKILL.md`
3. Confirm the approved phase state.
4. Run `git_preflight.py`.
5. Inspect the actual code, tests, state, and API contracts.
6. Run `dependency_search.py` for every affected symbol.
7. Classify the resulting reference inventory.
8. Identify missing characterization tests.
9. Run `baseline_test.py`.
10. Present the baseline for human review.
11. Wait for human baseline approval.
12. Begin implementation only after approval.

---

## 3. Findings Must Be Classified

Before proposing edits, report:

### Confirmed facts

Supported directly by code, tests, logs, state, or runtime behavior.

### Assumptions requiring verification

Plausible but not yet proven.

### Risks

Potential effects on:

* API compatibility
* Persisted state
* Preview/export parity
* Cache behavior
* Design Asset Mode
* Mixed frontend/backend versions
* Browser accessibility
* Deployment sequencing

Do not describe an assumption as a root cause.

---

## 4. Unexpected-Failure Rule

If a new failure appears:

1. Stop implementation.
2. Capture the exact error and context.
3. Classify it as:

   * Direct consequence
   * Interface drift
   * Hidden pre-existing failure
   * Environmental failure
   * Unrelated defect
   * Unclassified
4. Search related call sites.
5. Update the dependency inventory.
6. Determine whether it is inside the approved subphase.
7. Use `unexpected_failure_report.md`.
8. Obtain human approval before expanding scope.

Do not patch the latest failing line merely because it is available and emotionally vulnerable.

---

## 5. Sub-Agent Delegation

Parallel sub-agents may perform read-only investigation for:

* Backend model consumers
* Renderer call sites
* Frontend state and persistence
* Existing metadata output
* Typography presets and fonts
* Interactive canvas behavior
* Export manifests and cache keys
* Test coverage

Use:

```text
enable_write_tools=false
```

Write-enabled delegation requires explicit human approval and non-overlapping file scope.

One primary agent integrates all findings.

---

## 6. Required Subphase Closeout

Every subphase must produce:

* Confirmed findings
* Assumptions verified or disproven
* Files changed
* Contracts changed
* Legacy behavior preserved
* Tests added
* Baseline comparison
* Browser evidence where relevant
* Remaining risks
* Rollback procedure
* Exit-criteria pass/fail
* Completed `phase_walkthrough.md`

Do not begin the next subphase automatically.

---

# Phase 2A: Contracts, Normalization & State Migration

## Objective

Define strict backend and frontend contracts before changing renderer behavior or user-facing controls.

This subphase consolidates:

* Backend domain models
* Compatibility normalization
* Frontend state schema
* Persisted-state migration
* Export/cache impact inventory

No new UI controls or layout interaction should be enabled yet.

---

## Backend Models

### `TypographyOverrides`

Create a strict model using the actual existing typography token names:

```python
class TypographyOverrides(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title_font_id: str | None = None
    title_size: float | None = None
    title_tracking: float | None = None
    title_weight: int | None = None

    subtitle_font_id: str | None = None
    subtitle_size: float | None = None
    subtitle_tracking: float | None = None
    subtitle_weight: int | None = None
```

The final fields must be based on the current typography preset model.

Do not use:

```python
Dict[str, str]
```

Validation must reject:

* Unknown keys
* Unsupported font IDs
* Non-finite numbers
* Out-of-range sizes
* Out-of-range tracking
* Unsupported weights

---

### `MetadataOptions`

Create a strict model based on metadata items that actually exist or are explicitly approved as new features:

```python
class MetadataOptions(BaseModel):
    model_config = ConfigDict(extra="forbid")

    show_data_source: bool = True
    show_boundary_source: bool = True
    show_projection: bool = True
    show_date: bool = True
    show_scale_bar: bool = True
    show_qa_warnings: bool = True
```

Do not add `show_north_arrow` unless Phase 2A confirms that:

* A north arrow already exists, or
* Its addition is explicitly included as new functionality.

---

### `ElementTransform`

Create a canonical layout model:

```python
class ElementTransform(BaseModel):
    model_config = ConfigDict(extra="forbid")

    offset_x: float = 0
    offset_y: float = 0
    scale: float = 1
```

Validation must define:

* Finite coordinate values
* Minimum and maximum scale
* Whether negative offsets are allowed
* Whether rotation is intentionally unsupported
* Whether all elements may be scaled

---

### `LayoutOverrides`

Create a typed structure using only renderer elements that actually exist:

```python
class LayoutOverrides(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: ElementTransform | None = None
    subtitle: ElementTransform | None = None
    legend: ElementTransform | None = None
    metadata: ElementTransform | None = None
```

Do not add `north_arrow`, `scale_bar`, or other independently movable elements until their actual renderer grouping and layout behavior are confirmed.

---

## RenderRequest Compatibility

Extend `RenderRequest` additively:

```python
show_metadata: bool | None = None
metadata_options: MetadataOptions | None = None

typography: str = "gallery_poster"
typography_overrides: TypographyOverrides | None = None

layout_overrides: LayoutOverrides | None = None
```

Do not remove or rename existing fields.

---

## Metadata Normalization Rules

Normalize legacy and new metadata fields into one internal configuration:

1. `show_metadata=False`, no granular options:

   * Disable every metadata component.

2. `show_metadata=True`, no granular options:

   * Preserve existing default behavior.

3. Only `metadata_options` supplied:

   * Use granular values.

4. Both supplied consistently:

   * Permit during migration.

5. Both supplied inconsistently:

   * Reject explicitly or use a documented precedence rule.
   * Prefer explicit rejection during migration unless existing clients require precedence.

6. Neither supplied:

   * Preserve current defaults.

Produce:

```python
ResolvedMetadataOptions
```

---

## Typography Normalization

Resolve:

```text
Typography preset
→ validated overrides
→ font availability validation
→ ResolvedTypography
```

Produce a strict:

```python
ResolvedTypography
```

The resolver owns:

* Preset lookup
* Override precedence
* Font validation
* Size validation
* Tracking validation
* Weight validation
* Fallback handling

`SVGRenderer` must not interpret raw typography API fields.

---

## Layout Normalization

Resolve:

```text
Default anchors
→ validated layout overrides
→ render-profile conversion
→ ResolvedLayout
```

The plan must explicitly choose one canonical coordinate system:

### Preferred option

Use SVG reference-canvas or `viewBox` units.

Benefits:

* Stable across preview and export
* Compatible with SVG transformation matrices
* Easier to compare visually
* Avoids storing browser pixels

Normalized percentage coordinates are acceptable only if the conversion rules are fully documented and tested.

Do not store raw CSS pixels.

---

## Frontend State Model

Use strict, separate settings:

```ts
type TypographyOverrides = {
  titleFontId?: string;
  titleSize?: number;
  titleTracking?: number;
  titleWeight?: number;

  subtitleFontId?: string;
  subtitleSize?: number;
  subtitleTracking?: number;
  subtitleWeight?: number;
};

type MetadataOptions = {
  showDataSource: boolean;
  showBoundarySource: boolean;
  showProjection: boolean;
  showDate: boolean;
  showScaleBar: boolean;
  showQaWarnings: boolean;
};

type ElementTransform = {
  offsetX: number;
  offsetY: number;
  scale: number;
};

type LayoutOverrides = {
  title?: ElementTransform;
  subtitle?: ElementTransform;
  legend?: ElementTransform;
  metadata?: ElementTransform;
};
```

Do not use generic dictionaries where a typed contract is possible.

---

## Persisted-State Migration

Before changing `PosterSettings`, inventory:

* Current storage key
* Current schema
* Read location
* Write location
* Default behavior
* Malformed JSON behavior
* Whether `transforms` already exists
* Whether style, typography, and metadata are already persisted

Create a versioned migration:

```text
Legacy PosterSettings
→ validation
→ PosterSettingsV2
→ preserve unrelated settings
→ safe defaults for missing fields
```

Requirements:

* Use a new versioned schema.
* Preserve the old storage key during migration.
* Do not delete legacy state automatically.
* Recover safely from malformed JSON.
* Do not reset unrelated settings.
* Test an old browser session.

---

## Export Manifest and Cache Inventory

Phase 2A must determine whether these output-changing settings are currently represented in:

* Export manifests
* Audit logs
* Cache keys
* Download filenames
* Saved render payloads

Do not necessarily modify those systems in Phase 2A unless required for contract compatibility, but record exact required changes for later subphases.

---

## Expected Files

Final scope must be based on repository inspection, but likely includes:

```text
backend/app/models/render_models.py
backend/app/models/typography_models.py
backend/app/models/layout_models.py
backend/app/services/rules_service.py
backend/app/services/*resolver*.py
frontend/src/lib/api.ts
frontend/src/app/studio/page.tsx
frontend state migration utilities
backend and frontend contract tests
```

Do not generate `current_phase.json` until the actual reference inventory confirms the file list.

---

## Phase 2A Verification

### Automated

Test:

* Legacy render request
* New typed models
* Unknown keys rejected
* Invalid size/tracking/scale rejected
* Legacy metadata normalization
* Granular metadata normalization
* Contradictory metadata fields
* Typography preset with no overrides
* Typography overrides
* Unsupported font
* Layout coordinate validation
* Frontend saved-state migration
* Malformed saved state
* Unrelated settings preserved

### Exit Criteria

* Strict contracts exist.
* Legacy requests remain valid.
* Normalization rules are tested.
* Frontend state migration is tested.
* No renderer behavior changes unexpectedly.
* Export/cache impact is documented.

---

# Phase 2B: Metadata & Typography Rendering

## Objective

Update the render pipeline to consume resolved metadata and typography objects.

This subphase consolidates metadata and typography because both are resolved presentation configuration consumed by the same rendering pipeline.

It does not include manual dragging or layout UI.

---

## Render Orchestration

The upstream flow must be:

```text
RenderRequest
→ compatibility normalization
→ typography resolver
→ metadata resolver
→ layout resolver
→ RenderService
→ SVGRenderer
```

`SVGRenderer` receives:

* `ResolvedTypography`
* `ResolvedMetadataOptions`
* `ResolvedLayout`
* `ResolvedStyle`
* Validated clipping data
* Explicit render profile

The renderer must not:

* Inspect legacy `show_metadata`
* Merge typography overrides
* Resolve font IDs
* Interpret raw dictionaries
* Choose compatibility precedence

---

## Metadata Renderer Restructure

Phase 0 found one combined metadata group.

Split it into explicit semantic groups based on actual output:

```xml
<g id="metadata">
  <g id="metadata-data-source">...</g>
  <g id="metadata-boundary-source">...</g>
  <g id="metadata-projection">...</g>
  <g id="metadata-date">...</g>
  <g id="metadata-qa-warnings">...</g>
  <g id="metadata-scale-bar">...</g>
</g>
```

Only create groups for features that actually exist or are approved additions.

Visibility must be controlled by `ResolvedMetadataOptions`.

The renderer should avoid leaving invalid gaps when one or more lines are hidden. Remaining items should reflow according to a defined layout rule.

---

## North Arrow Decision

Before implementation, explicitly classify the north arrow as:

* Existing functionality elsewhere
* New functionality approved for Phase 2B
* Deferred

Do not add a frontend toggle for a nonexistent renderer element.

---

## Typography Catalog

Create one authoritative allowlisted font catalog.

Each font entry should include:

```python
class FontDefinition(BaseModel):
    id: str
    display_name: str
    family: str
    fallback_stack: str
    supported_weights: list[int]
    preview_available: bool
    export_available: bool
```

The frontend consumes the catalog from the backend or a shared generated contract.

Do not maintain independent frontend and backend font lists.

---

## Font Availability

Exports must not require live Google Fonts access.

Acceptable approaches include:

* Packaged local font assets
* System fonts guaranteed in the export environment
* Embedded font data where licensing and payload size permit

Remote Google Font loading may supplement browser preview only if export-safe equivalents are available.

Define deterministic fallback behavior.

---

## Typography Layout Behavior

Typography changes must trigger:

* Text remeasurement
* Line wrapping
* Maximum line count
* Bounds checking
* Anchor preservation
* Collision detection where supported
* Clamping or explicit warning when text leaves valid bounds

Define:

* Title min/max size
* Subtitle min/max size
* Tracking range
* Weight range
* Maximum title length
* Maximum subtitle length
* Wrapping width
* Overflow behavior

---

## Preview, Export & Sensitivity Parity

All rendering routes must use the same resolved typography and metadata behavior.

Differences may come only from explicit render-profile settings.

Update export manifests and cache keys if Phase 2A established that typography or metadata settings are missing.

---

## Expected Files

Likely scope includes:

```text
backend/app/services/render_service.py
backend/app/services/svg_renderer.py
backend/app/services/rules_service.py
backend typography/font configuration
backend export manifest or cache logic where required
backend route and renderer tests
```

The actual allowed paths must be confirmed before phase-state approval.

---

## Phase 2B Verification

### Automated

Test:

* Legacy metadata behavior
* Every granular metadata combination
* Metadata reflow when lines are hidden
* QA-warning behavior
* Scale-bar visibility
* Existing typography preset rendering
* Each allowed font
* Override precedence
* Invalid font fallback or rejection
* Long title wrapping
* Long subtitle wrapping
* Preview/export parity
* Sensitivity route compatibility
* Design Asset Mode without metadata/text
* Cache-key differentiation
* Manifest reproducibility

### Visual

Capture representative renders for:

* Default legacy output
* Metadata partially hidden
* Metadata fully hidden
* Typography override
* Long title
* Design Asset Mode
* Preview versus export comparison

### Exit Criteria

* Renderer consumes resolved objects.
* Legacy behavior is preserved.
* Metadata elements are independently controlled.
* Font behavior is deterministic.
* Preview/export parity is demonstrated.
* No manual layout functionality is enabled yet.

---

# Phase 2C: Layout & Interaction

## Objective

Implement canonical manual layout behavior after typography and metadata rendering are stable.

This subphase includes:

* Backend layout application
* Interactive canvas behavior
* Numeric layout controls
* Preview/export persistence
* Bounds and reset behavior

Tooltips and broader UI polish remain in Phase 2D.

---

## Canonical Layout Flow

Use:

```text
PosterSettingsV2
→ layout_overrides in RenderRequest
→ layout resolver
→ ResolvedLayout
→ SVGRenderer
→ preview/export
```

The frontend preview and backend export must use the same logical transforms.

---

## Element Inventory

Before enabling movement, confirm:

* Which SVG groups exist
* Which groups have stable IDs
* Which are safe to move
* Which should move together
* Which have protected or fixed positions

Initial movable elements should be limited to confirmed groups such as:

* Title
* Subtitle
* Legend
* Combined metadata block

Do not expose independent movement for scale bar or metadata sub-elements until their composition behavior is proven.

---

## Pointer Interaction

Use Pointer Events rather than mouse-only handlers:

```text
pointerdown
→ setPointerCapture
→ convert client point to SVG coordinates
→ calculate transform from anchor
→ update local state
→ constrain
→ pointerup or pointercancel
→ commit
```

Convert browser coordinates through the SVG transformation matrix:

```ts
point.matrixTransform(svg.getScreenCTM()!.inverse())
```

Do not use raw `clientX`, `offsetX`, or CSS dimensions as persisted coordinates.

---

## Required Interaction Behavior

Implement:

* Pointer capture
* Mouse, touch, and stylus support
* Grab and grabbing cursor states
* Drag threshold
* Selection state
* Text-selection prevention
* Pointer cancellation
* Escape-to-cancel where practical
* Keyboard movement
* Reset position
* Bounds checking
* Scale min/max validation
* Optional snap behavior only if explicitly approved

---

## Typography/Layout Interaction

When typography or text content changes:

1. Preserve the semantic anchor.
2. Remeasure the text.
3. Recalculate bounds.
4. Clamp or warn when invalid.
5. Prevent silent off-canvas placement.
6. Recheck collision with Design Asset Mode.

---

## Design Asset Interaction

Define:

* Z-order
* Protected regions
* Allowed overlap behavior
* Whether warnings or hard constraints are used
* Graceful behavior when assets are missing

Optional assets must remain non-blocking.

---

## Numeric Layout Controls

Add X/Y/Scale controls only after the backend model and renderer path work.

Controls must:

* Reflect canonical coordinates
* Use validated ranges
* Provide reset
* Show modified state
* Avoid sending invalid partial transforms
* Commit predictably
* Preserve separate transforms per element

---

## Preview Request Behavior

Rapid dragging must not flood the backend.

Use:

```text
Pointer movement
→ local optimistic transform

Pointer release or numeric commit
→ backend preview request
```

Request management must prevent stale responses from replacing newer previews.

Retain the last successful map during loading or recoverable errors.

---

## Expected Files

Likely scope includes:

```text
backend/app/services/svg_renderer.py
backend/app/services/render_service.py
frontend/src/components/InteractiveCanvas.tsx
frontend/src/components/PreviewPane.tsx
frontend/src/components/ControlPanel.tsx
frontend/src/app/studio/page.tsx
frontend request/state management
frontend and backend layout tests
export/cache files if required
```

Do not approve the phase-state file until the actual data flow confirms the file list.

---

## Phase 2C Verification

### Automated

Test:

* Layout model validation
* ViewBox-coordinate persistence
* Preview/export transform parity
* Different render profiles
* Bounds enforcement
* Reset behavior
* Typography change after movement
* Metadata visibility after movement
* Design Asset Mode interactions
* Request sequencing
* Persisted transforms

### Browser

Test:

* Mouse drag
* Touch/pointer simulation
* Responsive scaling
* Browser zoom
* High-DPI display where available
* Keyboard movement
* Pointer cancellation
* Grab/grabbing cursor
* Last-preview retention
* Feature-disabled behavior
* Export confirmation

### Exit Criteria

* Manual transforms persist through export.
* Coordinates remain stable across display sizes.
* Typography and metadata changes do not corrupt layout.
* Design Asset Mode remains functional.
* Layout controls can be disabled independently.

---

# Phase 2D: UI Rollout, Accessibility & Full Integration

## Objective

Expose completed backend capabilities through accessible, comprehensible, feature-flagged UI.

This subphase consolidates:

* Typography controls
* Metadata controls
* Layout controls
* Tooltips and microcopy
* Feature flags
* Final persisted-state rollout
* Full end-to-end verification

---

## Typography UI

Add a dedicated section with:

* Title font
* Title size
* Title tracking
* Title weight, if supported
* Subtitle font
* Subtitle size
* Subtitle tracking
* Subtitle weight, if supported
* Reset to preset
* Modified-state indicator

Use the authoritative font catalog.

Do not hardcode a separate font list.

---

## Metadata UI

Replace the single control only after compatibility behavior is implemented.

Provide:

* Group-level metadata toggle where useful
* Individual controls for confirmed metadata items
* Clear precedence behavior
* Reset to defaults
* Accessible labels

Do not expose nonexistent items.

---

## Layout UI

Expose only confirmed movable groups.

Provide:

* Element selector
* X/Y controls
* Scale control where supported
* Reset selected element
* Reset all layout
* Bounds warning
* Collision warning where applicable
* Modified-state indicator

---

## Tooltips and Microcopy

Do not use hover-only CSS tooltips.

The reusable tooltip must support:

* Hover
* Keyboard focus
* Click/touch
* `aria-describedby`
* Escape-to-close
* Viewport-aware placement
* Focus restoration
* Adequate trigger size

Use visible microcopy for information required to operate a control.

Use tooltips for supplemental definitions.

---

## Feature Flags

Use separate flags for:

* Typography customization
* Granular metadata
* Manual layout
* New tooltip system

When disabled:

* Existing UI remains available.
* Legacy payloads remain valid.
* Existing saved state does not break.
* No unrelated feature must be rolled back.

---

## Error and Loading UX

The UI must distinguish:

* Validation errors
* Unsupported fonts
* Invalid layout
* Network failure
* Backend failure
* Recoverable preview failure

During loading or recoverable failure:

* Retain the last successful preview.
* Show a clear status.
* Avoid blanking the map.
* Allow retry where appropriate.

---

## Final Compatibility Matrix

Test:

| Frontend                         | Backend         | Expected behavior                |
| -------------------------------- | --------------- | -------------------------------- |
| Existing frontend                | Phase 2 backend | Legacy rendering continues       |
| New frontend, all flags disabled | Phase 2 backend | Previous UI and payload behavior |
| New frontend, metadata enabled   | Phase 2 backend | Granular metadata                |
| New frontend, typography enabled | Phase 2 backend | Deterministic typography         |
| New frontend, layout enabled     | Phase 2 backend | Preview/export transform parity  |
| Cached old browser session       | Phase 2 backend | Legacy request remains valid     |

---

## Phase 2D Verification

### Automated

Test:

* Frontend API typing
* State migration
* Control visibility
* Feature flags
* Tooltip keyboard behavior
* Metadata control behavior
* Typography control behavior
* Layout control behavior
* Invalid-value prevention
* Old saved state
* Malformed saved state

### Browser and End-to-End

Verify:

* Before/after screenshots
* Browser console
* Network requests
* Preview loading
* Recoverable errors
* Responsive sidebar
* Keyboard navigation
* Touch interaction
* Feature-disabled behavior
* Export preservation
* Design Asset Mode
* Old-session migration

### Exit Criteria

* All controls use canonical backend data.
* All UI features can be independently disabled.
* Accessibility checks pass.
* Existing users retain settings safely.
* Preview and export match.
* Final Phase 2 walkthrough is approved.

---

# Unified Backend Resolution Pipeline

By the end of Phase 2, rendering should follow:

```text
RenderRequest
→ legacy/new compatibility normalization
→ ResolvedStyle
→ ResolvedTypography
→ ResolvedMetadataOptions
→ ResolvedLayout
→ RenderProfile
→ RenderService
→ SVGRenderer
→ optional asset composition
→ response validation
→ export manifest/audit record
```

Routers must not independently reproduce this sequence.

---

# Unified Frontend State

The frontend should maintain versioned settings containing:

```ts
type PosterSettingsV2 = {
  schemaVersion: 2;

  // Existing settings preserved
  geographyId: string;
  densityPreset: string;
  classificationPreset: string;
  typography: string;
  showMetadata?: boolean;

  // New additive settings
  typographyOverrides?: TypographyOverrides;
  metadataOptions?: MetadataOptions;
  layoutOverrides?: LayoutOverrides;
};
```

Do not remove legacy fields during Phase 2 unless a separate deprecation phase is approved.

---

# Phase-State Requirements

Create one phase-state file per subphase.

Example IDs:

```text
phase-2a-contracts-state
phase-2b-metadata-typography-rendering
phase-2c-layout-interaction
phase-2d-ui-rollout
```

Each must specify:

* Exact branch
* Baseline commit
* Actual allowed paths
* Excluded paths
* Approved operations
* Prohibited operations
* Verification commands
* Approved baseline artifact

Do not pre-authorize files merely because they are likely to be edited.

---

# Deployment Sequence

1. Deploy Phase 2A backend compatibility changes without UI changes.
2. Verify existing frontend against the new backend.
3. Deploy Phase 2A frontend state migration without enabling controls.
4. Deploy Phase 2B rendering changes.
5. Verify legacy preview and export output.
6. Deploy Phase 2C layout implementation behind a disabled flag.
7. Deploy Phase 2D UI with all new flags disabled.
8. Enable one feature at a time.
9. Monitor:

   * Error rates
   * Preview latency
   * Export failures
   * SVG payload size
   * State-migration failures
   * Browser console errors
10. Retain previous Cloud Run revisions for rollback.

---

# Rollback Conditions

Rollback the active subphase if:

* Legacy requests begin failing.
* Existing saved settings become unreadable.
* Preview and export diverge.
* Typography differs materially between browser and export.
* Metadata flags affect the wrong groups.
* Manual positions do not survive export.
* Dragging changes with responsive scaling.
* Optional assets prevent base rendering.
* Old frontend builds become incompatible.
* Feature flags do not restore previous behavior.
* New test failures remain unresolved.
* Changed files exceed approved scope.

---

# Definition of Done

Phase 2 is complete only when:

* Strict typed contracts replace generic dictionaries.
* Legacy fields remain compatible.
* Metadata and typography are resolved before rendering.
* Layout uses a canonical coordinate system.
* Preview and export share one resolved pipeline.
* Frontend saved state migrates safely.
* Fonts are allowlisted and export-safe.
* Manual transforms persist across render profiles.
* Tooltips work with keyboard and touch.
* Feature flags isolate each user-facing capability.
* Design Asset Mode remains non-blocking.
* Cache keys and manifests represent output-changing settings.
* Every subphase has approved evidence, tests, walkthrough, and rollback instructions.

</USER_REQUEST>
<ADDITIONAL_METADATA>
The current local time is: 2026-07-15T14:42:26-04:00.
</ADDITIONAL_METADATA>Created At: 2026-07-15T19:15:53Z
Completed At: 2026-07-15T19:17:32Z

				The command failed with exit code: 1
				Output:
				Traceback (most recent call last):
  File "<string>", line 1, in <module>
    import json; [print(json.loads(line)['content']) for line in open(r'c:\Users\kyleg\.gemini\antigravity\brain\92ea24e5-873d-4cab-a65b-b43101e60182\.system_generated\logs\transcript_full.jsonl') if 'Phase 2 is an umbrella milestone executed through four separately approved subphases.' in json.loads(line).get('content', '')]
                                                                 ~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Python314\Lib\encodings\cp1252.py", line 23, in decode
    return codecs.charmap_decode(input,self.errors,decoding_table)[0]
           ~~~~~~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
UnicodeDecodeError: 'charmap' codec can't decode byte 0x9d in position 3128: character maps to <undefined>

Created At: 2026-07-15T19:17:39Z
Completed At: 2026-07-15T19:19:04Z

				The command failed with exit code: 1
				Output:
				Traceback (most recent call last):
  File "<string>", line 1, in <module>
    import json; [print(json.loads(line)['content']) for line in open(r'c:\Users\kyleg\.gemini\antigravity\brain\92ea24e5-873d-4cab-a65b-b43101e60182\.system_generated\logs\transcript_full.jsonl', encoding='utf-8') if 'Phase 2 is an umbrella milestone executed through four separately approved subphases.' in json.loads(line).get('content', '')]
                  ~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Python314\Lib\encodings\cp1252.py", line 19, in encode
    return codecs.charmap_encode(input,self.errors,encoding_table)[0]
           ~~~~~~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
UnicodeEncodeError: 'charmap' codec can't encode character '\u2192' in position 9387: character maps to <undefined>

Created At: 2026-07-15T19:19:13Z
Completed At: 2026-07-15T19:19:16Z

				The command failed with exit code: 1
				Output:
				Traceback (most recent call last):
  File "<string>", line 1, in <module>
    import json; f = open('scratch/phase2_plan_extracted.md', 'w', encoding='utf-8'); [f.write(json.loads(line)['content']) for line in open(r'c:\Users\kyleg\.gemini\antigravity\brain\92ea24e5-873d-4cab-a65b-b43101e60182\.system_generated\logs\transcript_full.jsonl', encoding='utf-8') if 'Phase 2 is an umbrella milestone executed through four separately approved subphases.' in json.loads(line).get('content', '')]; f.close()
                     ~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
FileNotFoundError: [Errno 2] No such file or directory: 'scratch/phase2_plan_extracted.md'

