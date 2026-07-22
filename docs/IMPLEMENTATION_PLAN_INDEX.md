# Implementation Plan Index

This file identifies the active product plan and preserves paused plans without
discarding their work.

## Active Plan

- **Plan:** [UI/UX Implementation Plan](UI_UX_IMPLEMENTATION_PLAN.md)
- **Status:** Active
- **Current task:** UX-1 - Semantic UI foundations and shared poster shell
- **Primary objective:** Implement the visible UI/UX improvements identified in
  the design audit.
- **Execution prompt:** [UI/UX New-Session Prompt](UI_UX_NEW_SESSION_PROMPT.md)

## Paused Plan

- **Plan:** [Track A Production Architecture](TRACK_A_IMPLEMENTATION_PLAN.md)
- **Status:** Paused after TA-1 partial verification
- **Reason:** Architecture work is no longer the primary project sequence. Resume
  an architecture task only when the user explicitly activates Track A or an
  active UI task has a documented blocking dependency.
- **Preserved state:** The complete Track A contracts, verification evidence,
  follow-up log, and handoff remain in the original document and Git history.

## Switching Rule

Only one plan may be active at a time. Switching plans requires:

1. Record the active task's repository, PR, deployment, and verification state.
2. State why the switch is necessary.
3. Identify the newly active task contract.
4. Preserve unfinished work as paused or deferred; do not silently absorb it.

Architecture recommendations are not authorization to interrupt the UI/UX plan.

