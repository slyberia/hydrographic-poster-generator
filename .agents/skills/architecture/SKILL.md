# Architecture Skill

## Trigger Conditions

Load this skill for changes involving:

- Shared API or domain models
- Rendering or export pipelines
- Preview/export/sensitivity behavior
- Database and repository boundaries
- Persisted frontend state
- Cross-layer changes
- Duplicate business logic
- Compatibility migrations
- Cache identity
- Error contracts
- Design Asset Mode
- Layout, typography, metadata, or styling resolution
- Failure classes that appear in multiple routes or components

## Core Principle

Fix a failure class at the earliest stable boundary that can prevent downstream propagation.

Do not solve shared problems through repeated local patches.

## Canonical Boundaries

Prefer:

- Styling interpretation → canonical style resolver
- Typography interpretation → typography resolver
- Metadata interpretation → metadata resolver
- Layout interpretation → layout resolver
- API legacy/new normalization → boundary model or normalization service
- Database access → repository layer
- Render orchestration → one render service
- Preview requests → one request manager
- Optional visual assets → isolated composition layer
- Structured failures → explicit error taxonomy

## Required Architectural Questions

Before changing a shared contract, answer:

1. What is the authoritative input model?
2. Where is legacy compatibility handled?
3. What is the normalized internal model?
4. Which service owns resolution?
5. Which low-level components consume resolved data?
6. Which routes and clients are affected?
7. Which persisted or cached copies exist?
8. How are mixed frontend/backend versions handled?
9. What does rollback restore?
10. Which tests prove parity across routes and profiles?

## Compatibility Rule

Architectural cleanliness does not justify an immediate breaking API.

Prefer additive external contracts and strict normalized internal models.

Remove compatibility only in an independently approved deprecation phase with usage evidence and migration coverage.

## Rendering Rule

Preview, export, and sensitivity should differ through explicit render profiles, not duplicated route logic.

Low-level renderers must not:

- Interpret legacy and new request fields
- Resolve palette or typography IDs
- Fetch remote fonts
- Access raw SQL or database pools
- Decide API error semantics

## Database Rule

Routers and rendering components never contain raw SQL.

Schema incompatibility must be detected before production traffic. Retry only explicitly transient connection failures, never invalid SQL or missing schema objects.

## Asset Rule

Optional assets are isolated from base-map generation.

An asset failure may produce a warning or omission, but must not make the map unavailable unless the active product contract explicitly requires the asset.

## State Rule

Frontend state migrations are versioned, validated, reversible where practical, and tolerant of malformed legacy storage.

Do not reuse one field for multiple modes when stale values can become invalid.

## Cache Rule

Every output-changing normalized property must participate in deterministic cache identity.

Do not hash raw request shape when legacy and new payloads normalize to the same output.

## Architecture Review Output

For architectural work, produce:

- Current boundary map
- Confirmed coupling
- Failure propagation path
- Proposed upstream boundary
- Legacy compatibility plan
- State and cache impact
- Deployment sequencing
- Test matrix
- Rollback plan
