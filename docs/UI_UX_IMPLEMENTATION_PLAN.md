# UI/UX Implementation Plan

> This document governs the active UI/UX improvement work. The production
> architecture plan is preserved in `docs/TRACK_A_IMPLEMENTATION_PLAN.md` but is
> paused. Do not activate Track A work unless the user explicitly requests it or
> an approved UI task cannot function without a specific architecture change.

## 1. Objective

Improve the visible product experience identified in the original audit:

- Make the design system coherent across routes.
- Show real product output instead of asking users to imagine it.
- Make the poster studio a canvas-first creative workspace.
- Present the drone tool as a deliberate product with clear public and internal
  surfaces.
- Improve responsive behavior and accessibility in proportion to each surface.

The goal is not to redesign the backend, complete every institutional feature, or
turn the project into a generalized platform before the interface is improved.

## 2. Product Direction

Use a simple public front door with deeper technical capability behind it:

- **Hydro Poster:** approachable poster generator backed by a credible spatial
  rendering system.
- **Drone Zoning:** decision-support product with an internal planning console and
  future public explorer/dashboard surfaces.
- **Shared experience:** consistent navigation, semantic UI tokens, typography,
  controls, focus behavior, and page rhythm.

Do not invent an umbrella brand during implementation. Use explicit product names
in navigation until naming is separately approved.

## 3. Support Tiers

- **Public pages:** fully responsive at phone, tablet, and desktop widths.
- **Poster studio:** full editing on desktop; compact controls on tablet; graceful
  phone presentation with a desktop-editing recommendation if full editing is not
  practical.
- **Drone public surfaces:** responsive at phone, tablet, and desktop widths.
- **Drone internal console:** full desktop experience, usable compact tablet
  experience, and a graceful phone limitation rather than forced feature parity.

Accessibility is required independently of mobile support: contrast, labels,
keyboard operation, focus visibility, status announcements, zoom, and reduced
motion remain in scope for every changed surface.

## 4. Current State

| Surface | Current strength | Current gap |
|---|---|---|
| `/` | Clear headline and primary action | No real poster proof; generic icon steps; decorative blobs; product scope copy is imprecise |
| `/studio` | Functional live preview, export, QA, presets, saved settings | Fixed dense rail; small `max-w-xl` preview; duplicate legend controls; advanced fields exposed; weak compact/mobile behavior |
| `/about` | Strong GIS-to-design premise and editorial structure | Theme-token contrast failure; unnecessary hydration gate; wrong Studio link; abstract visual instead of real process |
| `/docs` | Swagger, glossary, and FAQ exist | Theme-token contrast failure; Swagger-first hierarchy; no curated quick start or architecture path |
| `/drone` | Advanced analysis console, map search, reports, sensitivity, export | No product landing page; control rail carries too much; Region 4 copy is embedded; no differentiated public surface |
| `/drone/guide` | Shared plain-language methodology content | Analyst and public guidance are not yet separated; route naming is product-internal |
| Shared CSS | Poster and drone styles both exist | Ambiguous global tokens, raw surface colors, decorative gradients/blobs, and separate page-level visual rules |

## 5. Binding Scope Rules

For the active UI task:

- Change only the routes, components, styles, tests, and assets named by its task
  contract.
- Do not add backend endpoints, migrations, auth models, CI, rate limiting, cloud
  configuration, or deployment work unless the UI task is blocked without it.
- Record architecture dependencies; do not implement them automatically.
- Reuse existing components and product data before creating abstractions.
- Use real generated output or truthful interface/map captures as visual proof.
- Do not use generic stock illustrations, decorative gradient blobs, or marketing
  cards where actual product output can communicate the feature.
- Stop when the task's acceptance criteria pass.

## 6. Design-System Direction

### Application tokens

Replace ambiguous global names with semantic roles:

```css
--ui-page
--ui-panel
--ui-surface
--ui-surface-muted
--ui-text
--ui-text-muted
--ui-text-inverse
--ui-border
--ui-border-strong
--ui-action
--ui-action-hover
--ui-focus
--ui-success
--ui-warning
--ui-danger
```

Poster artwork colors remain in the poster palette model. Drone zone colors remain
namespaced inside `.drone-console`. A poster palette or drone zone must not change
application chrome.

### Layout and components

- Shared poster-product header/navigation for `/`, `/studio`, `/about`, and `/docs`.
- Product-specific workspace shells for the poster studio and drone console.
- Cards only for repeated items, dialogs, or genuinely framed tools.
- Familiar icon controls use the installed icon system when available, with labels
  or tooltips where meaning is not obvious.
- Stable dimensions for toolbars, controls, preview frames, maps, and status areas.
- No nested cards or decorative floating page sections.

## 7. Ordered Tasks

### UX-1 - Semantic UI foundations and shared poster shell

**Objective:** Establish coherent application tokens and navigation across the
existing poster-product routes without redesigning their content.

**Included:**

- Replace ambiguous poster UI tokens in `globals.css` with semantic UI roles.
- Preserve poster-palette tokens and namespaced drone zone tokens.
- Add one shared poster header/navigation component.
- Apply the shared header and corrected surface/text tokens to `/`, `/studio`,
  `/about`, and `/docs`.
- Fix current cross-page contrast failures and incorrect Studio navigation.
- Remove decorative ambient blobs from the affected poster surfaces.
- Add focused component or browser checks required by these changes.

**Excluded:** homepage content redesign, poster gallery assets, studio control
reorganization, Docs information architecture, drone route changes, backend work,
deployment, and Track A tasks.

**Acceptance criteria:**

- No dark-on-dark or light-on-light text on the four routes.
- Navigation labels and destinations are consistent.
- Poster artwork colors remain independent from application chrome.
- Public pages render coherently at 390, 768, 1024, and 1440 pixels.
- Studio remains usable at its currently supported desktop width.
- Keyboard focus is visible; reduced-motion behavior is preserved.
- Frontend lint, build, and focused browser screenshots pass.

**Stop point:** Stop after system coherence and shell adoption. Do not begin UX-2.

### UX-2 - Homepage product proof

**Objective:** Make the homepage prove the generator's output quality immediately
without changing generator behavior.

**Included:**

- Add three static, optimized Guyana poster assets generated by the deployed
  application renderer using Abyss, Parchment, and Obsidian palettes.
- Replace the text-only hero with a poster-led composition and one Studio action.
- Show the same geography across all three palettes for direct comparison.
- Replace generic process icons with truthful crops from generated output.
- Correct homepage scope language while preserving the product position.
- Add focused browser verification required by these changes.

**Excluded:** Studio behavior or layout, additional gallery systems, runtime poster
requests from the homepage, backend/database/cloud changes, new dependencies, and
changes to About, Docs, or Drone routes.

**Acceptance criteria:**

- A real generated poster is a first-viewport signal at every supported width.
- Abyss, Parchment, and Obsidian versions of the same Guyana network are visible.
- The four generic process icons are removed.
- The page retains one unambiguous primary action to `/studio`.
- Poster assets are static and optimized; the homepage adds no API or database work.
- No horizontal overflow, incoherent overlap, or clipped interface text at 390,
  768, 1024, and 1440 pixels.
- Keyboard focus remains visible and reduced-motion behavior is preserved.
- Frontend lint, production build, and focused browser checks pass.

**Stop point:** Stop after homepage product proof is implemented and verified. Do
not begin UX-3.

### UX-3 - Poster studio workspace

**Objective:** Turn `/studio` into a canvas-first poster workspace while preserving
the existing renderer, request, export, and interactive-layout contracts.

**Problem solved:** The fixed desktop rail, undersized preview, flat control sequence,
duplicate Legend controls, and always-visible precision settings make the primary
poster workflow harder to scan and use.

**Included:**

- Make the preview the dominant workspace at desktop and compact widths.
- Use a persistent desktop control rail and an off-canvas compact control drawer.
- Reorganize controls as Place, Appearance, Content, Layout, and Export.
- Render palette choices from existing preset tokens without new preview requests.
- Collapse typography overrides, individual colors, and numeric coordinates under
  explicit Advanced controls.
- Expose one canonical Legend control while synchronizing the legacy request field.
- Add fit, zoom, fullscreen, and reset-view controls around the preview.
- Preserve direct poster-element dragging, keyboard movement, QA, and export behavior.
- Add focused browser tests and update affected parity/accessibility selectors.

**Excluded:** backend, API, database, renderer, deployment, saved-settings migration,
new dependencies, new palette assets, About/Docs/Drone routes, and full phone editing
parity.

**Acceptance criteria:**

- The preview is the dominant Studio surface and no longer uses the old `max-w-xl`
  constraint.
- The control sequence is Place, Appearance, Content, Layout, Export.
- Standard palettes have token-derived visual previews and add no API calls.
- Exactly one visible Legend checkbox controls both metadata and legacy payload state.
- Typography overrides, color overrides, and numeric coordinates are collapsed by
  default.
- Fit, 50-200% zoom, fullscreen, and reset-view controls are keyboard accessible.
- Compact widths use a control drawer without horizontal page overflow.
- Existing Studio parity, resilience, and accessibility behavior remains green.
- Frontend lint, production build, focused browser tests, and responsive screenshots
  pass.

**Stop point:** Stop after the Studio workspace is implemented, verified, and proposed
in a draft PR. Do not begin UX-4 or any Track A task.

### UX-4 - About page

**Objective:** Make `/about` explain the product's value, verified spatial pipeline,
supported scope, output modes, and intentional constraints without requiring client
hydration.

**Problem solved:** The current page is hidden until hydration, leads with an abstract
database visual, overstates global runtime behavior, and foregrounds implementation
language before explaining what the product does for a user.

**Included:**

- Convert the route from a client-gated component to a server-rendered page.
- Replace the abstract database circle with the verified five-stage pipeline:
  Boundary selection, PostGIS clipping, Network classification, SVG composition,
  Export.
- Clarify that current runtime coverage uses South America and North/Central America
  regional datasets.
- Separate user value, output modes, data sources, and intentional constraints.
- Reuse an existing generated Guyana poster as product evidence.
- Preserve the shared poster header and correct Studio navigation.
- Add focused initial-HTML, responsive, accessibility, image, and overflow checks.

**Excluded:** homepage or Studio changes, new assets, new dependencies, backend, API,
database, renderer, Docs, Drone, deployment, and Track A work.

**Acceptance criteria:**

- Meaningful About content is present in the initial server response.
- The five pipeline stages and regional runtime coverage match repository contracts.
- The abstract circle and unsupported global-runtime claim are removed.
- A real generated poster is visible and its image loads successfully.
- The Studio action points to `/studio` and has visible keyboard focus.
- No horizontal overflow, clipped text, or incoherent overlap at 390, 768, 1024,
  and 1440 pixels.
- Frontend lint, production build, focused browser tests, and responsive screenshots
  pass.

**Stop point:** Stop after the About page is implemented, verified, and proposed in a
draft PR. Do not begin UX-5 or any Track A task.

### UX-5 - Documentation experience

Create a curated documentation hierarchy before Swagger: Overview, Architecture,
Quick start, Render, Export, Presets, Errors and limits, Interactive schema. Correct
known terminology claims without changing backend behavior. Keep Swagger as the
reference layer, not the whole experience.

### UX-6 - Drone landing page and route shell

Make `/drone` the product landing page using real zoning output. Provide explicit
entry points for a future Public Explorer and the authorized Planning Console. Move
the existing console to `/drone/console` and methodology to `/drone/methodology`,
with compatibility redirects for old routes. Do not build the Explorer or dashboard
inside this task.

### UX-7 - Internal drone console usability

Retain current analysis behavior while improving control hierarchy, map dominance,
selection/report ergonomics, and compact-tablet behavior. Use progressive disclosure
for run setup, factor weights, sensitivity, and export. Attribute tables and
infrastructure layers require separate approved contracts because they introduce
new data behavior.

### UX-8 - Public Explorer (dependency-gated)

Build a simplified published-result map with search, plain-language location status,
approved layers, legend, sharing, and methodology. This task cannot enter execution
until a published-run read contract and study-area configuration exist. Those are
dependencies, not authorization to resume all Track A work.

### UX-9 - Dashboard (dependency-gated)

Define the NDC questions first, then build only the aggregate endpoints and dashboard
views needed to answer them. Do not calculate full-run aggregates in the browser.
Infrastructure exposure remains deferred until infrastructure data exists.

## 8. Verification Standard

Every task must define its own focused verification. For changed visual surfaces:

- Capture desktop and relevant compact/mobile screenshots before and after.
- Check text contrast, overflow, overlap, and empty/loading/error states.
- Verify keyboard focus and primary keyboard workflows.
- Verify reduced motion for new animation.
- Run frontend lint and production build.
- Run existing Playwright tests affected by the changed routes.
- Add visual regression coverage only for stable, changed states; do not create a
  whole-site screenshot framework inside a narrow page task.

## 9. Architecture Dependency Rule

When a UI task encounters an architecture dependency:

1. State the exact visible behavior that is blocked.
2. Identify the smallest required contract.
3. Record it in the task handoff.
4. Pause the UI task only if no truthful frontend implementation is possible.
5. Do not activate unrelated Track A tasks.

Examples:

- Published-run lifecycle blocks live Public Explorer data, not its approved design.
- Study-area configuration blocks removal of Region 4 assumptions from live behavior,
  not general shell or landing-page work.
- Dashboard aggregates block production dashboard values, not dashboard information
  architecture.
- Rate limiting blocks public launch, not local interface implementation.

## 10. Estimation Policy

Estimate one approved task at a time. Do not total the roadmap. Estimates cover only
the included files and acceptance criteria. External waits, asset decisions, and
deployment are reported separately. A newly discovered enhancement does not change
the estimate unless the user approves a contract amendment.

## 11. Handoff Record

- **Active plan:** UI/UX Implementation Plan
- **Completed tasks:** UX-1 - Semantic UI foundations and shared poster shell;
  UX-2 - Homepage product proof; UX-3 - Poster Studio workspace; UX-4 - About page
- **Next candidate:** UX-5 - Documentation experience; contract approval required
- **Paused plan:** Track A Production Architecture
- **Architecture work authorized:** none
- **UX-3 verification:** frontend lint and production build pass; 17 focused Studio
  accessibility, parity, resilience, and workspace tests pass; mocked responsive
  screenshots checked at 390, 768, and 1440 pixels.
- **Deferred finding:** persisted localStorage state can produce a hydration warning
  during migration tests; the behavior predates UX-3 and remains covered by passing
  resilience tests.
- **UX-4 verification:** meaningful content confirmed in the initial HTML; frontend
  lint and production build pass; 9 focused About and shared-homepage browser tests
  pass; responsive screenshots checked at 390, 768, 1024, and 1440 pixels.
- **Next action:** review the UX-4 result and expand UX-5 into a full task contract
  before implementation.
- **Do not start:** TA-5, migration work, run lifecycle, rate limiting, deployment,
  Public Explorer backend contracts, or dashboard APIs.

## 12. Completion Report Template

- Objective achieved
- Visible changes by route
- Files changed
- Before/after screenshots or browser evidence
- Accessibility and responsive checks
- Lint/build/test results
- Commit, branch, and PR state
- Deferred findings
- Architecture dependencies discovered but not implemented
- Recommended next UI task

## 13. UX-1 Completion Record

- **Date:** 2026-07-22
- **Branch:** `codex/ux-1-semantic-shell`
- **Outcome:** Added semantic application-interface tokens, a shared poster header,
  corrected cross-route contrast and navigation, removed ambient decorations, and
  preserved poster-generation behavior.
- **Routes verified:** `/`, `/about`, and `/docs` at 390, 768, 1024, and 1440
  pixels; `/studio` at 1440 pixels.
- **Browser result:** No horizontal page overflow, all navigation links visible,
  correct active-page state, visible keyboard focus, and reduced-motion support.
- **Automated checks:** frontend lint passed; production build passed; 14 affected
  Studio Playwright tests passed.
- **Deferred by contract:** homepage product proof, Studio information
  architecture, About content/visual redesign, and Docs information architecture.

## 14. UX-2 Completion Record

- **Date:** 2026-07-22
- **Branch:** `codex/ux-2-homepage-proof`
- **Outcome:** Replaced the text-only homepage proof and generic process icons with
  a poster-led hero, a three-palette comparison, and product-specific process
  crops while preserving the existing Studio action and generator behavior.
- **Asset provenance:** Guyana posters were generated through the deployed product
  renderer using the current Abyss, Parchment, and Obsidian presets, then
  rasterized to three static WebP files.
- **Runtime impact:** No homepage API or database requests; the three source assets
  total approximately 78 KB.
- **Routes verified:** `/` at 390, 768, 1024, and 1440 pixels.
- **Browser result:** Real output appears in the first viewport, palette assets
  load successfully, mobile comparison remains contained, and no page-level
  horizontal overflow occurs.
- **Automated checks:** frontend lint passed; production build passed; four focused
  responsive homepage Playwright tests passed.
- **Deferred by contract:** Studio workspace hierarchy and preview controls,
  About content/visual redesign, and Docs information architecture.
