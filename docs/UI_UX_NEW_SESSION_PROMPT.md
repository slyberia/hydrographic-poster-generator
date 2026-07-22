# New-Session Prompt: Execute the UI/UX Plan

Use the following prompt in a new Codex or other coding-agent session.

```text
Repository: https://github.com/slyberia/hydrographic-poster-generator

The primary objective is now implementation of the UI/UX improvements identified in
the product audit. Production-architecture work is paused.

Before changing code:

1. Synchronize the local repository with the remote repository without discarding
   unrelated work.
2. Read:
   - docs/IMPLEMENTATION_PLAN_INDEX.md
   - docs/UI_UX_IMPLEMENTATION_PLAN.md
   - AGENTS.md or CLAUDE.md if present
3. Treat docs/UI_UX_IMPLEMENTATION_PLAN.md as the active source of truth.
4. Treat docs/TRACK_A_IMPLEMENTATION_PLAN.md as preserved but paused reference material.
5. Restate the active UX-1 objective, included work, exclusions, acceptance criteria,
   and stop point before editing.

Execute only UX-1: Semantic UI foundations and shared poster shell.

Required outcome:

- Establish semantic application-interface tokens.
- Preserve poster palette tokens and namespaced drone zone tokens.
- Create and apply one shared poster-product header/navigation across `/`, `/studio`,
  `/about`, and `/docs`.
- Correct current cross-page contrast failures and the incorrect Studio link.
- Remove decorative ambient blobs from the affected poster surfaces.
- Preserve existing page content and product behavior.
- Verify public pages at 390, 768, 1024, and 1440 pixels and the studio at its
  supported desktop width.
- Run frontend lint, production build, and focused browser verification.

Do not:

- Redesign homepage content or add poster gallery assets.
- Reorganize studio controls or implement zoom/fullscreen yet.
- Restructure Docs content.
- Change drone routes or console behavior.
- Implement TA-5, migrations, run lifecycle, rate limiting, deployment, database,
  backend, Cloud Run, or Supabase work.
- Fix adjacent findings automatically.

If a new issue is not required for UX-1 acceptance, record it as deferred and continue.
If a real blocker would expand scope, stop and report it before implementing anything.

Use existing repository patterns and the smallest coherent component/token changes.
Do not introduce a new design framework or dependency unless UX-1 cannot be completed
with the current stack.

At completion, stop before UX-2 and report:

- Visible changes by route
- Files changed
- Screenshot/browser evidence
- Accessibility and responsive checks
- Lint/build/test results
- Commit, branch, and PR state
- Deferred findings
- Recommended next UI task
```

