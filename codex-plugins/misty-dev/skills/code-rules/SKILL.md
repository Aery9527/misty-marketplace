---
name: code-rules
description: >-
  Concrete implementation rules for maintainable code. Load when writing,
  modifying, refactoring, or reviewing code, covering change boundaries, error
  handling, comments, logging, and tool usage. Follow established project and
  language conventions; use `arch-rules` for higher-level design trade-offs.
---

# Code Rules

Code MUST follow these rules regardless of language, framework, or project. If the project has explicit conventions, they MUST take precedence. Use `arch-rules` for design-level trade-offs.

Code examples below use Go; map them to the language at hand.

## Change Rules

- Before changing behavior, MUST read direct callers, tests covering the affected behavior, and the containing module to confirm the existing contract.
- Before writing code, MUST state what behavior changes, what must remain compatible, and how each is verified.
- One change does one thing. MUST NOT mix unrelated cleanup into a behavior change; put cleanup in a separate commit.
- Before adding an argument, MUST check the count. The default limit is 3, excluding call-chain parameters such as `ctx`, the receiver, and return values. When exceeded:
    - Same scope and always handled together: apply **Introduce Parameter Object**.
    - Used by independent operations: split the function at those operation boundaries.
    - Otherwise keep the arguments. MUST NOT wrap them only to reduce their count.
- Only when explicit requirements or existing extension points show that cases will keep being added, choose a dispatch table or **Strategy Pattern** according to the behavior; otherwise keep the `if-else` / `switch`. MUST NOT abstract early merely to remove branches.

## Error Rules

- MUST NOT swallow an error, return fake success, or silently degrade when the contract does not define a fallback.
- Handle an error only where the code can recover, translate it to a boundary contract, or decide the final outcome; elsewhere, add context and propagate.
- Log a failure once, at the layer that decides the final outcome. MUST NOT log and propagate at every layer.

## Comment Rules

- Describe high-level intent, implicit meaning, constraints, and trade-offs, never details the code itself already reveals.
- When a comment records two or more independent points, MUST format them as a bullet list, not prose.
- Change history belongs only in commit messages. MUST NOT put it in code comments.
- Every struct, function, and field MUST have a concise comment describing its purpose or meaning.
    - A struct comment MUST state its responsibility and scope. Prefer describing what it does; express excluded responsibilities through workflow or module boundaries.
    - Field and argument comments MUST explain the data's meaning and include an example when a fixed format applies, e.g. `Phone string // Taiwan mobile number in XXXX-XXX-XXX format, e.g. "0909-878-787"`.
    - Function comments MUST list call ordering, preconditions, and cross-module contracts not evident from the code as bullet points. MUST NOT enumerate callers or callees merely to repeat the call graph.

## Logging Rules

- Every piece of information MUST have traceable value for later tracking, statistics, analysis, or debugging. Information that helps none of these MUST NOT be logged.
- Every log line MUST be traceable to one code location, either because the message is unique or because the logger attaches the source location automatically.
- Logs MUST use a compact structure, not prose. If the project has a structured-field logging convention, MUST follow it; otherwise use a fixed-order positional format, e.g. `Enter {AGE} {NAME} "{MSG}"`. Field meaning comes from the code location.
- Statistics MUST be aggregated before logging on a timer or a count, e.g. accumulate request counts and write `Request ALL 123` every 5s. MUST NOT derive statistics afterwards from repeated event logs. Data from an interval not yet logged may be lost; if that is unacceptable, log each event.
- If the project has no level policy: `DEBUG` diagnoses, `INFO` records meaningful lifecycle events, `WARN` records recoverable degradation, and `ERROR` records failed outcomes that need human attention.
- MUST NOT dump whole requests, responses, or objects. Payload size and field count follow project limits; if none exist, log selected fields only.

## Execution Awareness

- When handling code or HTML, if the host provides an `LSP` tool that supports the language, MUST prefer it so lookup and edits follow real program symbols; otherwise use text-based tools.
- Colors in web pages and CSS MUST be defined in `OKLCH`. For other visual output such as ppt, pick colors in OKLCH, then convert to a color space the target format supports.
