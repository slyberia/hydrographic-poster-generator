# Execution Core Skill

## Trigger Conditions

Load this skill for any:

- Implementation task
- Bug fix
- Refactor
- API contract change
- Database change
- Deployment-related work
- Multi-file edit
- State migration
- Test failure investigation
- Phase execution
- Production verification
- Compatibility or deprecation work

This skill is mandatory whenever repository files may be changed.

## Purpose

Provide a repeatable, human-reviewed execution lifecycle that prevents scope drift, unapproved breaking changes, baseline laundering, and blind patching of newly exposed failures.

## Mandatory Sequence

1. Read `AGENTS.md`.
2. Read `.agents/state/current_phase.json`.
3. Confirm the phase is human-approved.
4. Run `git_preflight.py`.
5. Inspect relevant code, tests, state, and documentation.
6. Run `dependency_search.py` for all changed symbols.
7. Classify the reference inventory.
8. Add missing characterization tests if required.
9. Run `baseline_test.py`.
10. Present the unapproved baseline to the human.
11. Wait for explicit human baseline approval.
12. Implement only within allowed scope.
13. Stop and recharacterize unexpected failures.
14. Run `post_edit_verification.py`.
15. Perform browser verification when applicable.
16. Complete `phase_walkthrough.md`.
17. Stop. Do not begin another phase automatically.

## Phase Gate

A valid phase requires:

- `status: "approved"`
- `approved_by_human: true`
- Matching current branch
- Valid baseline commit
- Non-empty allowed paths
- Named verification command file
- Named approved baseline file before post-edit comparison

A roadmap, prior chat, or overall project approval is not a valid phase gate.

## Evidence Discipline

Separate all findings into:

### Confirmed facts

Supported by code, tests, logs, schema, or runtime evidence.

### Assumptions requiring verification

Plausible but not yet proven.

### Risks

Ways the change could break contracts, state, deployment compatibility, rendering, persistence, caching, or user-visible behavior.

Do not use “root cause,” “resolved,” or “verified in production” without the evidence standards in `AGENTS.md`.

## Dependency Classification

`dependency_search.py` produces an inventory only.

For every match, classify the reference as:

- Producer
- Consumer
- Persisted copy
- Cached copy
- API caller
- Test fixture
- Debug/internal route
- Documentation example
- Deployment dependency
- Unrelated

Indirect and dynamic behavior still requires manual inspection.

## Baseline HITL Workflow

The agent may generate an unapproved baseline but may not approve it.

Required sequence:

Baseline run
→ unapproved JSON and Markdown report
→ human review
→ failure classification
→ explicit approval
→ approved artifact locked to phase and commit
→ implementation

An approved baseline must not be altered after implementation begins. Corrections require a new baseline review.

## Scope Changes

When a necessary file or operation is outside scope:

1. Stop.
2. Explain why the existing phase is insufficient.
3. Identify the exact paths or operations required.
4. Describe risks and alternatives.
5. Request a human-approved phase-state update.
6. Do not edit the phase state yourself to gain authority.

## Unexpected Failures

Use `templates/unexpected_failure_report.md`.

Do not patch until the failure is classified and its phase relevance is established.

A direct consequence clearly inside scope may be fixed after documenting it. Ambiguous, unrelated, environmental, or scope-expanding failures require human review.

## Completion

A completed phase requires:

- Successful scope verification
- Approved baseline comparison
- Targeted and full applicable tests
- Human review of new or ambiguous failures
- Browser evidence where relevant
- Documentation updates
- Rollback instructions
- Completed walkthrough
- Explicit exit-criteria result

No automatic phase progression is permitted.
