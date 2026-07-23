# New-Session Prompt: Resume the UI/UX Plan

Use the following prompt in a new Codex or other coding-agent session.

```text
Repository: https://github.com/slyberia/hydrographic-poster-generator

The primary objective is implementation of the UI/UX improvements identified in
the product audit. Production-architecture work is paused. UX-1 and UX-2 are
complete and must not be repeated.

Before changing code:

1. Synchronize the local repository with the remote repository without discarding
   unrelated work.
2. Read:
   - docs/IMPLEMENTATION_PLAN_INDEX.md
   - docs/UI_UX_IMPLEMENTATION_PLAN.md
   - AGENTS.md or CLAUDE.md if present
3. Treat docs/UI_UX_IMPLEMENTATION_PLAN.md as the active source of truth.
4. Treat docs/TRACK_A_IMPLEMENTATION_PLAN.md as preserved but paused reference material.
5. Read the UX-1 and UX-2 completion records in §13 and §14. Do not reimplement
   or reverify them unless a regression is directly observed.
6. Expand UX-3 into a full task contract using the plan's scope rules. Present that
   contract for approval before editing application code.

The next candidate task is UX-3: Poster Studio workspace.

The contract should define the desktop and compact-tablet workspace layouts,
control-group hierarchy, preview toolbar behavior, canonical legend state,
advanced-control disclosure, affected files, state compatibility, and focused
verification. It must preserve rendering and export contracts.

Do not:

- Rework semantic tokens, the shared header, or homepage without evidence of a
  regression.
- Restructure Docs content.
- Change drone routes or console behavior.
- Implement TA-5, migrations, run lifecycle, rate limiting, deployment, database,
  backend, Cloud Run, or Supabase work.
- Fix adjacent findings automatically.

If a new issue is not required for UX-3 acceptance, record it as deferred. If a
real blocker would expand scope, stop and report it before implementing anything.

Use existing repository patterns and the smallest coherent changes. Do not introduce
a new design framework or dependency.

Do not edit application code until the UX-3 task contract is approved. At the
contract-review stop point, report:

- Proposed objective and problem solved
- Included and excluded files/behavior
- State and interaction compatibility
- Acceptance criteria and verification
- Effort, risk, rollback, and stop point
- Architecture dependencies, if any
```
