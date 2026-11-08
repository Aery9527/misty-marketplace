---
name: code-rules
description: >-
  Concrete implementation rules for any code, including HTML and CSS. Load when
  designing, writing, modifying, refactoring, rearchitecting, or reviewing code,
  covering change boundaries, error handling, comments, logging, tool usage,
  and OKLCH colors for web pages and CSS. Follow established project and
  language conventions; use `arch-rules` for higher-level design trade-offs.
---

# Code Rules

- MUST apply this precedence: explicit project rules, consistent conventions in existing project code, language conventions, then these rules. Use `arch-rules` for design-level trade-offs.

- These rules are language-independent.

## Change Rules

- Before changing behavior, MUST read direct callers, tests covering the affected behavior, and the containing module to confirm the existing contract.
- Before writing code, MUST state the intended behavior and how it will be verified; include compatibility constraints only when they apply.
- One change does one thing. MUST NOT mix unrelated cleanup into a behavior change; put cleanup in a separate commit.
- MUST review a function's responsibility, input meaning, and contract regardless of parameter count. Many parameters are a design warning; parameter count alone does not prove multiple responsibilities.
- For signatures under our control, business arguments MUST NOT exceed 3, excluding execution context and implicit receivers. MUST preserve externally fixed signatures and their contracts. When the limit is exceeded:
    - Inputs serve independently usable capabilities: split those functions; a workflow function may coordinate them when that is its responsibility.
    - One operation needs multiple data fields: use an input type whose meaning corresponds to that operation, carrying required data and optional settings, including values that affect behavior.
- Prefer existing domain types when their meaning and contract fit without bringing in substantial unrelated data. MUST NOT use an input object to conceal unrelated responsibilities.
- When designing or changing a signature with 3 or fewer business arguments, prefer a suitable existing type; otherwise keep separate arguments by default. Group multiple inputs into a new type only when they form a meaningful data unit that known workflows need to pass, store, or validate together.
- MUST validate required business inputs and their value ranges at a boundary all calls to the operation pass through.
    - Reject only values forbidden by the contract; `0`, `false`, and empty strings are not inherently invalid.
    - MUST document defaults for values the contract allows to be omitted. When omission differs from an explicit zero value, the input model MUST distinguish them.
    - Within one trust boundary, MUST NOT mechanically repeat the same validation at every layer.
- Before adding required input or making existing input required, MUST inspect its construction and loading sources, identify sources that omit it, and ensure boundary validation detects missing data. This applies to individual arguments and fields added to input types alike.
    - Update sources under our control in the same change. For sources that cannot be updated together, preserve a compatible entry point or explicitly describe the incompatible change and migration.
- Only when explicit requirements or existing extension points show that cases will keep being added, choose a dispatch table or **Strategy Pattern** according to the behavior; otherwise keep the `if-else` / `switch`. MUST NOT abstract early merely to remove branches.
- When reorganizing internal implementation, MUST preserve public operation call patterns and caller responsibilities. MUST NOT transfer internal selection responsibilities to operation callers. Existing input meanings, results, and errors MUST also be preserved, except for explicitly described effects of initialization changes.
    - Initialization and dependency assembly may change. If initialization call patterns or behavior change, MUST inspect actual construction sources and compatibility commitments and explain the impact. Update sources under our control; for others, preserve a compatible entry point or explicitly describe the incompatible change and migration.

## Error Rules

- MUST NOT swallow an error, return fake success, or silently degrade when the contract does not define a fallback.
- Handle an error only where the code can recover, translate it to a boundary contract, or decide the final outcome; elsewhere, add context and propagate.
- Log a failure once, at the layer that decides the final outcome. MUST NOT log and propagate at every layer.

## Comment Rules

- Describe high-level purpose, data meaning, contracts, constraints, and trade-offs. MUST NOT narrate implementation steps.
- When a comment records two or more independent points, MUST format them as a bullet list, not prose.
- Change history belongs only in commit messages. MUST NOT put it in code comments.
- Every type, function, and field MUST have a concise comment giving a high-level overview of its purpose or meaning.
    - A struct comment MUST state its responsibility and scope. Prefer describing what it does; express excluded responsibilities through workflow or module boundaries.
    - Field and argument comments MUST explain the data's meaning and include an example when a fixed format applies.
    - Function comments MUST document existing preconditions, call-ordering constraints, and cross-module contracts that affect correct use or modification and are not fully expressed by the function's name or declared types (including receiver, parameter, and result types); omit these supplementary items when none apply. MUST NOT enumerate callers or callees merely to repeat the call graph.

## Logging Rules

- Every piece of information MUST have traceable value for later tracking, statistics, analysis, or debugging. Information that helps none of these MUST NOT be logged.
- Every log line MUST be traceable to one code location, either because the message is unique or because the logger attaches the source location automatically.
- Logs MUST use a compact structure, not prose. If the project has a structured-field logging convention, MUST follow it; otherwise use a fixed-order positional format. Field meaning comes from the code location.
- When logging solely for statistics, MUST aggregate data and log on a timer or a count, rather than logging each event.
    - If losing an unlogged interval is unacceptable, log each event instead; statistics may be derived from these logs.
    - Event logs already required for diagnostics or auditing may also be reused for statistics.
- If the project has no level policy: `DEBUG` diagnoses, `INFO` records meaningful lifecycle events, `WARN` records recoverable degradation, and `ERROR` records failed outcomes that need human attention.
- MUST NOT dump whole requests, responses, or objects. Payload size and field count follow project limits; if none exist, log selected fields only.

## Execution Awareness

- When handling code or HTML, if the current environment provides an available `LSP` tool that supports the language, MUST prefer it so lookup and edits follow real program symbols; otherwise use text-based tools.
- Colors in web pages and CSS MUST be defined in `OKLCH`. For other visual output, pick colors in OKLCH, then convert to a color space the target format supports.

## Example References

- For initial design and implementation, refactoring, or rearchitecting, MUST evaluate the conditions for parameter count and branching below against known requirements and the planned implementation before deciding interfaces and responsibility boundaries. Read any triggered reference before making those decisions.
- When an existing or planned function signature has more than 3 business arguments (excluding execution context and implicit receivers), MUST read [Parameter Count Examples](references/parameter-examples.md) before deciding how to split responsibilities or group inputs.
- When known requirements or extension points show that `if-else` / `switch` branches will keep growing and involve distinct responsibilities or behavior implementations that can change independently, MUST read [Branching Examples](references/branching-examples.md) before deciding how to separate responsibilities and whether a dispatch table or Strategy is appropriate.
- Before writing or modifying code, MUST read [Declaration Comment Examples](references/comment-examples.md) and follow the Comment Rules and the demonstrated commenting approach. While making the change, if the affected code lacks required comments, or its comments contradict the confirmed purpose, data meaning, or contracts, or violate the Comment Rules, MUST add or correct them as part of the same change.
- Before writing or modifying log statements, MUST read [Logging Examples](references/logging-examples.md) and follow the Logging Rules and the demonstrated logging approach.
