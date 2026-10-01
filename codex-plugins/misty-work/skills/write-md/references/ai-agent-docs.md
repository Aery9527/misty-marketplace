# AI Agent Markdown Rules

- Load this file only when the Markdown target audience is an AI agent.
- AI-agent documents focus on context-efficiency, precision, and executability; avoid loading human-reader navigation rules.

## Applicable Contexts

- `SKILL.md`, agent instructions, system prompt, workflow rule, coding rule, eval spec, tool usage guideline.
- Content goal: enable an AI agent to execute rules reliably, not to help humans browse and learn.
- Documents are loaded into a context window long-term; priority is compression, precision, and executability.

## Required Output Spec

- MUST NOT use Markdown tables; use bullet lists or numbered steps instead.
- MUST NOT use Mermaid unless the user explicitly requests Mermaid diagrams or syntax for the AI-agent document. When requested, MUST load the [Mermaid guide](mermaid-guide.md).
- In the final output of a Traditional Chinese AI-agent document, strict requirements MUST use `必須` (`MUST`) and strict prohibitions MUST use `嚴禁` (`MUST NOT`).
- Rules MUST be direct and unambiguous. For Traditional Chinese AI-agent documents, prefer `必須` / `應` / `嚴禁` / explicit ordering.
- Avoid lengthy examples; keep only necessary short examples, counterexamples, or decision sentences.

## Text Replacement Formats

- When not using Mermaid, describe architecture, flow, state, or dependencies in AI-agent documents with these text formats instead of tables:
    - Dependencies: bullet list each item as "Component — Dependency — Responsibility".
    - Temporal interactions: numbered steps describing actor, action, and result.
    - State transitions: `from -> event -> to` transition list.
    - Data flow: numbered pipeline steps with input, processing, and output per step.
    - Decision logic: numbered priority list with `if X then Y; otherwise Z` phrasing.
