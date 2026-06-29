# Executor Registry & Recommendation Matrix

## 1. Registry

| Executor Alias      | Model Profile                          | Key Strengths                    | Recommended Tasks                                |
| :------------------ | :------------------------------------- | :------------------------------- | :----------------------------------------------- |
| **Architect**       | User / Human                           | Strategy, Ruling, Approval       | Final Review, Complex Strategy, Scope Decisions   |
| **Assistant Coach** | Claude Sonnet / Gemini Pro (Medium)    | Governance, Logs, Docs           | Orchestration, Documentation, Prompt Assembly     |
| **The Specialist**  | Claude Opus / Gemini Pro (High)        | Architecture, Logic, Refactoring | PostGIS Pipeline, SVG Rendering, Complex Features |
| **Visualist**       | Gemini Pro (High) / Claude with Vision | Vision, Media, Layout            | Screenshot Verification, CSS Polish, UI Review    |

## 2. Selection Policy

- **Default for Docs / Orchestration**: Assistant Coach.
- **Default for Code / Architecture**: The Specialist.
- **Default for Visuals / UI**: Visualist.
- **Default for Scope / Strategy**: Architect (Human).

## 3. Tier Alignment

This registry aligns with the Model Selection Guidance defined in `AGENTS.md` and `CLAUDE.md`:

| Executor         | Corresponds To          |
| :--------------- | :---------------------- |
| The Specialist   | Tier 1 (High Complexity) |
| Assistant Coach  | Tier 2 (Moderate)        |
| Visualist        | Tier 1–2 (Context-dependent) |

## 4. Usage Context

When the Assistant Coach prepares a subphase handover, it MUST look up the recommended executor from this table and include it in the `Executor_Recommendation` section of the report. If the recommended executor is unavailable, use the fallback executor specified in the ledger entry.
