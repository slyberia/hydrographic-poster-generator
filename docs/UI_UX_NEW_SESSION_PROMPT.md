# New-Session Prompt: Resume the UI/UX Plan

Use the following prompt in a new Codex or other coding-agent session.

```text
Repository: https://github.com/slyberia/hydrographic-poster-generator

The primary objective is implementation of the UI/UX improvements identified in
the product audit. Production-architecture work is paused. UX-1 is complete and
must not be repeated.

Before changing code:

1. Synchronize the local repository with the remote repository without discarding
   unrelated work.
2. Read:
   - docs/IMPLEMENTATION_PLAN_INDEX.md
   - docs/UI_UX_IMPLEMENTATION_PLAN.md
   - AGENTS.md or CLAUDE.md if present
3. Treat docs/UI_UX_IMPLEMENTATION_PLAN.md as the active source of truth.
4. Treat docs/TRACK_A_IMPLEMENTATION_PLAN.md as preserved but paused reference material.
5. Read the UX-1 completion record in §13 and do not reimplement or reverify it
   unless a regression is directly observed.
6. Expand UX-2 into a full task contract using the plan's scope rules. Present that
   contract for approval before editing application code.

The next candidate task is UX-2: Homepage product proof.

The contract should define the real generated poster assets to use, the exact hero
and process-section changes, responsive acceptance criteria, affected files, and
focused verification. It must preserve generator behavior.

Do not:

- Rework semantic tokens or the shared header without evidence of a regression.
- Reorganize Studio controls or implement zoom/fullscreen.
- Restructure Docs content.
- Change drone routes or console behavior.
- Implement TA-5, migrations, run lifecycle, rate limiting, deployment, database,
  backend, Cloud Run, or Supabase work.
- Fix adjacent findings automatically.

If a new issue is not required for UX-2 acceptance, record it as deferred. If a
real blocker would expand scope, stop and report it before implementing anything.

Use existing repository patterns and the smallest coherent changes. Do not introduce
a new design framework or dependency.

Do not edit application code until the UX-2 task contract is approved. At the
contract-review stop point, report:

- Proposed objective and problem solved
- Included and excluded files/behavior
- Asset source and selection
- Acceptance criteria and verification
- Effort, risk, rollback, and stop point
- Architecture dependencies, if any
```
