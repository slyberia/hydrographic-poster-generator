# AGENTS.md

## 1. Purpose

This file defines the persistent operating rules for AI agents working in this repository.

It governs authority, phase scope, safety boundaries, human approvals, compatibility, execution, delegation, failure handling, verification, and phase completion.

Detailed procedures belong in the project skills, scripts, templates, and documentation referenced below.

## 2. Authority and Precedence

When instructions conflict, use this order:

1. Explicit human instruction in the current session
2. Non-negotiable safety rules in this file
3. Human-approved phase state in `.agents/state/current_phase.json`
4. Human-approved implementation plan for the active phase
5. Product specifications in `docs/`
6. Loaded project skills
7. Repository conventions and existing implementation patterns

Authority limitations:

- A phase-state file may narrow scope, but it may not override safety rules or authorize destructive operations.
- A roadmap or multi-phase plan does not authorize every phase.
- Approval of one command or operation does not authorize later operations.
- Existing code is evidence of current behavior, not proof that the behavior is correct.
- Comments, filenames, and prior agent claims are not authoritative unless confirmed through code, tests, logs, or runtime evidence.

## 3. Non-Negotiable Safety Boundaries

Agents must not:

- Modify files outside the approved phase scope.
- Silently expand a task into adjacent features, cleanup, or refactors.
- Remove compatibility fields outside a separately approved deprecation phase.
- Deploy services, shift production traffic, modify secrets, run database migrations, merge branches, force push, or perform destructive Git or database operations without explicit human approval.
- Reset, discard, overwrite, clean, or stash user work automatically.
- Commit source geospatial datasets such as Shapefiles, File Geodatabases, FlatGeobuf files, or full HydroRIVERS source packages.
- Use full global HydroRIVERS source files at application runtime.
- Treat an optional design asset as required for successful base-map rendering.
- Report an issue as resolved until the complete user-facing workflow succeeds.
- Describe an unverified assumption as a confirmed fact or root cause.
- Begin a later phase automatically after completing the current phase.
- Edit `current_phase.json` to expand their own authority.

When a requested action conflicts with these rules, stop and present the conflict for human review.

## 4. Persistent Architecture Invariants

### Contracts and migrations

- Preserve existing API contracts during migrations whenever practical.
- Introduce new request or response shapes additively.
- Accept legacy and new payloads during migration, normalize them into one internal representation, and reject contradictory combinations explicitly.
- Inspect persisted frontend state before changing its schema.
- Do not remove compatibility logic until callers, saved state, fixtures, scripts, and mixed-version deployments have been evaluated.

### Business logic

- Use canonical resolvers for styling, typography, metadata, layout, and other shared domains.
- Do not duplicate interpretation logic across routers, components, preview paths, export paths, or debug endpoints.
- Resolve request-level configuration before passing data to low-level renderers.
- Renderers consume validated domain objects rather than raw API fields.

### Rendering

- Maintain logical parity between preview and export.
- Preview, export, and sensitivity modes use one orchestration pipeline with explicit render profiles.
- Optional assets degrade gracefully and do not block base rendering.
- User-controlled text is escaped before SVG output.
- Layout, typography, metadata, and styling settings that affect output are included in cache keys and export manifests.

### Database and spatial processing

- Spatial clipping is PostGIS-backed.
- Raw SQL and direct pool access remain behind the repository boundary.
- Routers do not contain raw SQL.
- Schema incompatibility fails readiness before production traffic.
- Invalid SQL, missing columns, schema drift, and malformed geometry are not disguised as transient failures.
- Full global HydroRIVERS files are not loaded at runtime.

For detailed architecture guidance, load:

`.agents/skills/architecture/SKILL.md`

## 5. Current Phase and Scope Controls

Implementation requires a human-approved phase-state file:

`.agents/state/current_phase.json`

It must define at minimum:

- Phase ID and name
- Explicit approved status
- Human approval marker
- Expected branch
- Baseline commit
- Allowed and excluded paths
- Approved and prohibited operations
- Verification command file
- Approved baseline artifact

Before editing:

- Confirm the phase file exists.
- Confirm its status is `approved`.
- Confirm `approved_by_human` is true.
- Confirm the current branch matches.
- Confirm the baseline commit exists.
- Confirm the task matches the named phase.
- Confirm intended files fall within `allowed_paths`.
- Confirm the requested operation is not prohibited.

If phase state is missing, stale, contradictory, or incomplete, stop for human review.

## 6. Required Execution Lifecycle

All changes follow this sequence:

Inspect
→ collect reference inventory
→ classify dependencies
→ run baseline tests
→ obtain human baseline approval
→ implement within phase scope
→ verify against the approved baseline
→ review changed-file scope
→ produce a phase walkthrough

Load `.agents/skills/execution_core/SKILL.md` for detailed procedures.

### Inspect before editing

Before modifying files:

- Open the actual implementation.
- Inspect models, signatures, return types, tests, state, and call sites.
- Search every symbol, route, field, storage key, and contract being changed.
- Separate findings into confirmed facts, assumptions requiring verification, and risks.
- Identify expected files and missing characterization tests.

### Reference inventory

Run:

`python .agents/scripts/dependency_search.py <symbols>`

The script produces a reference inventory, not a completed dependency map. Classify the results into producers, consumers, persisted copies, cached copies, API callers, tests, internal routes, documentation, deployment dependencies, or unrelated references.

### Git preflight

Run:

`python .agents/scripts/git_preflight.py`

It must succeed before edits. It never modifies the worktree.

### Baseline execution and HITL approval

Run:

`python .agents/scripts/baseline_test.py`

The script records evidence and marks failures `unclassified`.

Implementation begins only after a human confirms test scope, classifies failures, and approves the baseline for the named phase and commit.

The implementing agent must not independently approve its own baseline.

## 7. Implementation Rules

During implementation:

- Work only within the approved phase and allowed paths.
- Make the smallest coherent change.
- Avoid speculative cleanup.
- Preserve external behavior unless the approved plan explicitly changes it.
- Add characterization tests before altering untested behavior.
- Prefer upstream boundaries over repeated downstream patches.
- Keep unrelated migrations in separate phases.
- Do not modify deployment configuration, schemas, secrets, or production services unless specifically approved.
- Do not remove compatibility fields merely because new internal models exist.
- Do not treat a passing unit test as proof of end-to-end success.

If the approved scope is insufficient, stop and request a human-approved phase update.

## 8. Compatibility and Migration Policy

Compatibility is the default.

When introducing a new contract:

1. Keep the legacy field or shape.
2. Add the new field or shape.
3. Normalize both into one internal model.
4. Define behavior when both are supplied.
5. Reject conflicts explicitly.
6. Test old-client/new-backend combinations.
7. Add persisted-state migration where applicable.
8. Consider cached browser sessions and mixed deployment versions.
9. Log legacy usage where useful.
10. Remove legacy support only in a separately approved deprecation phase.

Explicit human approval is required before removing or incompatibly changing request fields, response fields, error shapes, persisted-state migration, legacy deserialization, saved payload support, or deployment compatibility.

## 9. Human Approval Gates

Explicit human approval is required before:

- Database migrations or destructive database commands
- Cloud Run deployments or production traffic shifts
- Secret, environment-variable, or production configuration changes
- Branch merges, force pushes, or destructive Git operations
- Write-enabled sub-agent delegation
- Out-of-scope file changes
- Compatibility-field or migration-code removal
- API-breaking changes
- Changes to `AGENTS.md`
- Expansion of the approved phase
- Patching an unexpected failure outside the current phase

Use:

`.agents/skills/execution_core/templates/destructive_operation_request.md`

Each approval request states the exact operation, command, tool, target, effect, risks, reversibility, rollback, and whether approval covers one command or a bounded sequence.

Approval is never inferred from silence.

## 10. Sub-Agent Delegation

Sub-agents are read-only by default.

For read-only investigation, use `enable_write_tools=false`.

Write-enabled delegation requires explicit human approval and non-overlapping file scope.

Every delegated task defines:

- Role
- Read-only or write-enabled status
- Permitted and prohibited files
- Question or task
- Evidence required
- Completion criteria

Parallel write access is prohibited for overlapping shared contracts, including request models, export manifests, renderers, orchestration services, shared resolvers, frontend API types, persisted settings, shared fixtures, and database migrations.

One primary agent reviews and integrates delegated work. Sub-agents do not deploy, merge, modify secrets, shift traffic, or expand scope.

## 11. Unexpected-Failure Protocol

When an unexpected error, test failure, runtime exception, or regression appears:

1. Stop implementation.
2. Capture the exact error, stack trace, command, request, and relevant logs.
3. Determine when it appeared.
4. Classify it as:
   - Direct consequence
   - Interface drift
   - Hidden pre-existing failure
   - Environmental failure
   - Unrelated defect
   - Unclassified
5. Search related call sites and contracts.
6. Update the dependency inventory.
7. Identify the regression test required.
8. Determine whether it belongs inside the approved phase.
9. Present findings for human review when scope or classification is uncertain.

Use:

`.agents/skills/execution_core/templates/unexpected_failure_report.md`

Do not immediately patch the newest failing line.

## 12. Verification

After implementation, run:

`python .agents/scripts/post_edit_verification.py`

Verification includes, where applicable:

- Targeted and full relevant tests
- Type checking and linting
- Contract and frontend tests
- Visual or browser verification
- Preview/export parity
- Persisted-state migration
- Cache-key differentiation
- Search for stale references
- Git diff review
- Allowed-file-scope comparison

Verification requires an approved baseline and distinguishes unchanged, new, resolved, changed, and ambiguous failures.

It fails on out-of-scope tracked or untracked files. It never reverts files automatically.

Do not claim all tests passed unless command output proves it.

## 13. Browser and UI Verification

For UI, rendering, or end-to-end changes, verify:

- Before and after screenshots
- Browser console
- Network request and response status
- Payload or content type where relevant
- Loading and recoverable-error behavior
- Last-successful-preview retention
- Responsive layout
- Feature-disabled behavior
- Export behavior where relevant
- Keyboard and pointer interaction

Use:

`.agents/skills/execution_core/templates/browser_verification.md`

Browser checks supplement automated tests. They do not replace them.

## 14. Feature Flags

New user-facing behavior should use independently controllable feature flags where practical.

Applicable areas include manual layout editing, metadata controls, typography customization, flag palettes, color-picker redesign, tooltips, and Design Asset Mode changes.

Disabling a flag restores previous stable behavior without rolling back unrelated work.

## 15. Documentation

Update documentation when a phase changes public contracts, persisted state, database expectations, render profiles, cache inputs, font catalogs, asset manifests, deployment, rollback, feature flags, or compatibility.

Detailed technical information belongs in `docs/`, not this file.

Do not create duplicate or conflicting sources of truth.

## 16. Model and Task Guidance

Use high-depth architectural review for shared models, API migrations, database boundaries, rendering pipelines, cross-layer changes, state migrations, deployment sequencing, compatibility removal, and multi-system failures.

Lower-complexity execution may be appropriate for isolated tests, text changes, small component polish, and documentation corrections.

Notify the human when the active model or mode is insufficient for the risk or complexity.

## 17. Error-Claim Discipline

Use these terms precisely:

- Confirmed defect: reproduced and directly traced.
- Probable cause: strongly supported but not fully verified.
- Next confirmed failure: the current verified error in a layered sequence.
- Root cause: evidence explains the failure class, not merely the latest exception.
- Resolved: the complete user-facing flow succeeds and regression tests pass.
- Verified in production: confirmed against the deployed revision.

## 18. Completion and Phase Closeout

Every phase produces:

`.agents/skills/execution_core/templates/phase_walkthrough.md`

A phase is complete only after scope compliance, approved baseline comparison, required tests, changed-file review, documentation updates, rollback instructions, human review of unresolved risks, and explicit pass/fail against exit criteria.

Do not proceed to the next phase automatically.
