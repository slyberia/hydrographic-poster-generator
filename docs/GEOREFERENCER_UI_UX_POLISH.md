# Georeferencer UI/UX polish

## Proposed scope

Improve the Georeferencer page's visual hierarchy and task flow while
preserving georeferencing behavior, API contracts, evidence semantics, and
the existing lazy-loaded geographic inspection layer.

- Present upload, source context, optional metadata, and analysis as a clear
  progressive workflow.
- Improve result-state hierarchy so acceptance, limitations, evidence, map
  inspection, and downloads are scannable and distinct.
- Refine map controls, status messaging, legends, selected-reach details, and
  responsive behavior.
- Preserve accessible labels, keyboard operation, focus visibility, loading,
  error, cancellation, and empty states.
- Add or update focused browser coverage for the page's primary and result
  flows.

## Explicit exclusions

- No changes to recovery algorithms, geospatial data, ETL, artifact formats,
  API contracts, or country classifications.
- No new runtime scraping or production data writes.
- No broad application-wide visual redesign unless a shared component change
  is required by the Georeferencer page and remains behavior-preserving.

## Definition of done

- The page is visually coherent at desktop and narrow responsive widths.
- Primary actions, advanced options, status feedback, and evidence are easy to
  discover and understand.
- Existing georeferencing and map/name-loading behavior remains intact.
- Focused E2E checks plus the approved repository verification commands pass.
- A walkthrough records screenshots or browser evidence, changed scope,
  rollback, and unresolved design decisions.
