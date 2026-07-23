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

**Objective:** Turn `/docs` into a usable poster-API guide, with Swagger retained as
the final reference layer.

**Problem solved:** The current page combines a glossary, two FAQ items, and raw
Swagger without orienting a developer through the request lifecycle. It also describes
river lines as polygons and claims an active repair metric the current clipping service
does not produce.

**Included:**

- Render the curated documentation shell on the server.
- Add Overview, Architecture, Quick start, Render, Export, Presets, Errors and
  limits, Glossary, and Interactive schema sections.
- Add request examples that match the current versioned style and export models.
- Document response headers, format combinations, custom dimensions, regional
  coverage, and data-driven IDs.
- Correct geometry and repair language without changing backend behavior.
- Embed the backend-hosted Swagger UI and retain it as the final reference.
- Add focused initial-HTML, responsive, navigation, schema, code-overflow, and
  public-shell regression checks.

**Excluded:** backend or OpenAPI filtering, endpoint changes, authentication, Drone
API separation, rate limiting, generated SDKs, new dependencies, deployment, UX-6,
and Track A work.

**Acceptance criteria:**

- The curated hierarchy and examples are present in the initial HTML.
- Preview and export examples match current backend models.
- Swagger remains available after the curated guide.
- Unsupported river-polygon and active-repair-percentage claims are removed.
- Long code blocks scroll internally without causing page overflow.
- No clipped text or incoherent overlap at 390, 768, 1024, and 1440 pixels.
- Frontend lint, production build, focused browser tests, and responsive screenshots
  pass.

**Stop point:** Stop after the documentation experience is implemented, verified, and
proposed in a draft PR. Do not include UX-6 in the same branch.

### UX-6 - Drone landing page and route shell

**Objective:** Give the Drone product a clear public front door while preserving the
existing analysis console as an authorized, separately named workspace.

**Problem solved:** `/drone` currently opens a dense internal console without first
explaining the product, its intended NDC use, the distinction between guidance and
authorization, or the future public and internal product surfaces.

**Included:**

- Make `/drone` a server-rendered product landing page using a representative image
  of the current Region 4 zoning output.
- Present the NDC decision-support use case, geographic pilot scope, primary
  constraints considered, methodology link, and authorization limitation.
- Provide an active entry point to the Planning Console and an honest planned state
  for the future Public Explorer.
- Move the existing console unchanged in behavior to `/drone/console`.
- Move the full guide to a server-rendered `/drone/methodology` page.
- Redirect `/drone/guide` to `/drone/methodology`.
- Update internal links, authentication return paths, comments, and affected browser
  tests for the new route structure.
- Add focused initial-HTML, route, redirect, responsive, asset, and console-regression
  checks.

**Excluded:** Public Explorer implementation, dashboard implementation, internal
console redesign, infrastructure layers, attribute tables, backend or database
changes, auth-role changes, study-area configuration, publication lifecycle,
rate limiting, deployment, and Track A work.

**Acceptance criteria:**

- `/drone` explains the product before offering entry to the analysis workspace.
- The Region 4 pilot and decision-support limitation are visible without opening the
  console.
- The Planning Console remains functional at `/drone/console`.
- The Public Explorer is not presented as available before it exists.
- `/drone/methodology` is meaningful in the initial HTML and `/drone/guide`
  redirects to it.
- New navigation is keyboard accessible, focus-visible, and responsive without
  clipped text or page-level overflow at 390, 768, 1024, and 1440 pixels.
- Frontend lint, production build, focused browser tests, existing Drone console
  tests, and responsive screenshots pass.

**Stop point:** Stop after the landing page and route shell are implemented, verified,
and proposed in a draft PR. Do not begin UX-7 or build a placeholder Explorer route.

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
  UX-2 - Homepage product proof; UX-3 - Poster Studio workspace; UX-4 - About page;
  UX-5 - Documentation experience
- **Active task:** none; UX-5 is ready for review in a draft pull request
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
- **UX-5 verification:** curated guide content confirmed in the initial HTML; frontend
  lint and production build pass; 10 focused Docs and shared-About browser tests pass
  at 390, 768, 1024, and 1440 pixels; responsive screenshots checked at 390, 768,
  and 1440 pixels.
- **Deferred finding:** `swagger-ui-react` 5.32 fails while refracting the backend's
  OpenAPI 3.1 schema under the current Next.js development runtime. UX-5 embeds the
  backend-hosted Swagger UI instead. Dependency upgrade or removal is deferred.
- **Next action:** review the UX-5 draft pull request, then execute the separately
  authorized UX-6 route-shell contract from the merged baseline.
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

## 15. UX-6 Completion Record

- **Date:** 2026-07-23
- **Branch:** `codex/ux-6-drone-route-shell`
- **Outcome:** Added a server-rendered Drone product landing page, moved the
  unchanged internal console to `/drone/console`, moved the full guide to the
  server-rendered `/drone/methodology` route, and retained `/drone/guide` as a
  compatibility redirect.
- **Product-state treatment:** The Planning Console is presented as available and
  authorized; the Public Explorer is clearly marked as planned and has no placeholder
  route.
- **Asset provenance:** The landing hero uses a static capture of an actual completed
  Region 4 run fetched from the deployed read-only Drone endpoints and rendered
  through the existing Leaflet console. The landing page makes no runtime API or
  database request.
- **Routes verified:** `/drone` and `/drone/methodology` at 390, 768, 1024, and
  1440 pixels; `/drone/guide` redirect; `/drone/console` functional regression.
- **Browser result:** No page-level horizontal overflow, the hero leaves the next
  product section visible, the representative zoning asset loads, keyboard focus is
  visible, and methodology content is meaningful in the initial HTML.
- **Automated checks:** frontend lint passed; production build passed; 17 focused
  Drone route and existing console Playwright tests passed.
- **Deferred by contract:** Public Explorer, dashboard, internal console redesign,
  infrastructure layers, attribute tables, study-area configuration, publication
  lifecycle, and backend or deployment work.
