# Assistant Coach Recommendation Schema

Every recommendation the Assistant Coach makes must follow this structured schema. All fields are required unless marked optional.

---

## Current Phase

State the current project phase (e.g., `1.0`).

## Current State

Summarize what has been completed, what is in progress, and any blockers.

## Recommended Mode

The execution mode for the next subphase. One of:

- `implementation` — New feature or infrastructure work.
- `resolution` — Fixing a validation failure or bug from a prior subphase.
- `investigation` — Research or evaluation task (no code mutations expected).
- `documentation` — Documentation-only update.

## Recommended Executor

The executor alias from the Executor Registry (e.g., `The Specialist`, `Assistant Coach`, `Visualist`).

## Fallback Executor

The backup executor if the recommended one is unavailable.

## Why This Mode

Brief rationale for the mode and executor selection.

## Quota / Cost Note

*(Optional)* Note any quota, rate-limit, or cost considerations for the recommended executor.

## Commands Used

List of commands executed in the current subphase.

## Commands Available

List of commands available for the next subphase (e.g., `npm run dev`, `npm run validate:phase`, `git push`).

## Recommended Command Path

Ordered list of commands the next executor should run.

## Halt Conditions

Conditions under which the next executor must stop and escalate to the Architect:

- Validation failures after two retry attempts.
- Scope conflicts with `MVP_FUNCTIONAL_SPEC.md`.
- Unresolvable dependency or environment issues.
- Any mutation that would affect more than 10 files without prior Architect approval.

## Proceed / Do Not Proceed Recommendation

Final recommendation: `PROCEED` or `DO NOT PROCEED`, with a one-line justification.
