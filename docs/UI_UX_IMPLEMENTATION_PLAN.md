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

Replace the generic hero/process presentation with real generated poster output.
Show the same geography in multiple palettes where possible. Replace generic step
icons with poster/map crops or small product-specific process visuals. Preserve one
clear launch action. Do not modify generator behavior.

### UX-3 - Poster studio workspace

Make the preview the dominant workspace and reorganize controls around the user's
decision sequence: Place, Appearance, Content, Layout, Export. Add fit, zoom,
fullscreen, and reset-view controls. Collapse typography overrides, individual
colors, and numeric coordinates under Advanced. Replace duplicate legend controls
with one Poster Elements state. Render palette previews from existing preset tokens;
do not generate a backend preview per palette.

### UX-4 - About page

Remove the client-only mount gate, correct navigation, and replace the abstract
database circle with a truthful process presentation:

`Boundary selection -> PostGIS clipping -> Classification -> SVG renderer -> Export`

Clarify regional coverage and separate user value from implementation detail.

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
- **Active task:** UX-1
- **Paused plan:** Track A Production Architecture
- **Current repository change:** planning documents only
- **Architecture work authorized:** none
- **Next action:** create a task branch from the latest approved base, restate UX-1,
  inspect the rendered baseline, and implement only UX-1.
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

