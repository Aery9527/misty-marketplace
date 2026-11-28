---
name: code-rules
description: >-
  Concrete implementation rules for any code, including HTML and CSS. Load when
  designing, writing, modifying, refactoring, rearchitecting, or reviewing code,
  covering code structure, error handling, module boundaries,
  comments, logging, tool usage, and OKLCH colors for web pages and CSS. Follow
  established project and language conventions.
---

# Code Rules

- The explanations and examples below use Go. MUST adapt them to equivalent conventions and syntax in the target language and preserve the core concepts of the principles.
- MUST apply this precedence: explicit project rules, consistent conventions in existing project code, language conventions, then these rules.
- Each top-level numbered item MUST start with a short title followed by a colon, then its explanation. Titles are optional for nested items.
- Refer to numbered items as *Section:Number[+Number…]*. Join numbers from the same section with `+`.
    - *Code Principles:4.1* refers to the first subitem of item 4 in that section.
    - *Code Principles:2+3* refers to items 2 and 3 in that section.
    - A reference within its own section may omit the section name. For example, within Code Principles, *Code Principles:4.1* may be written as *4.1*.
    - A subitem may refer to its own parent item in plain language.
- When handling code or HTML, if the current environment provides an available `LSP` tool that supports the language, MUST prefer it so lookup and edits follow real program symbols. Otherwise, use text-based tools and mention that in the report.
- Colors in web pages and CSS MUST be defined in `OKLCH`. For other visual output, pick colors in OKLCH, then convert to a color space the target format supports.
- Before making any change to code, MUST read its direct callers, the tests covering the affected behavior, and the containing module.

## Code Principles

1. Nesting limit: at most 2 levels of control structures; an `if`, a loop, a `switch`, and an exception-handling block each count as one level, e.g. `if`, `for`, `switch`, and `select` in Go.
    1. `if a { for _, x := range xs { use(x) } }` is allowed; a third structure inside it, e.g. `if b`, is prohibited.
    2. An `if` / `else if` / `else` chain counts as one level.
2. Function content: a group of steps that serves one purpose MUST be extracted into a function whose name states that purpose; extract it only when the function name can clearly carry the meaning of those lines of code combined.
3. Function grouping: when the meaning of several functions can be gathered further under a name with higher cohesion and a clearer boundary, create a struct or a module to hold these functions of the same scope, e.g. a package or a struct used as the receiver of a `func`.
4. Function parameters: functions that contain logic take at most 3 parameters, with constructors exempt. Function signatures MUST stay stable for the foreseeable future.
    1. When a function has more than 3 parameters, MUST first review its responsibilities. If several calculations each have a distinct purpose and can be used independently, MUST split them into separate functions by responsibility. Use a `struct` to wrap parameters only when they belong to the same scope and should be passed together.
    2. When a function is likely to keep gaining parameters in the foreseeable future, MUST wrap the parameters of the same scope in a dedicated struct, to avoid a breaking change of the signature, and MUST state for each parameter whether it is required or what its default is.
    3. Execution context and the receiver object do not count toward the limit, e.g. `context.Context` and the receiver of a `func`.
    4. A function signature constrained by a framework or library is exempt from the parameter limit and MUST still honor the external contract.
5. Function length: keep it within 50 lines, counted from the first line of the function signature to its last line, blank lines and comments included; when it must exceed that, adjust it according to *2+3*. Mechanical content such as "a series of `if-else`" or "telling many kinds of error apart one by one" indicates a structural design problem and MUST be addressed by adjusting the design from a higher-level perspective. When branches keep growing and each has independent logic, see *Architecture Principles:5*.
6. Constants of the same meaning: when constants in many places stand for the same meaning, MUST assign or concatenate them from one constant, so that the code states their relation.
    1. E.g. a URL path prefix: define one constant for the prefix of the API endpoints of one scope and concatenate it; MUST NOT repeat the prefix as a literal, so that changing the prefix changes one constant, and the prefix is easier to trace.
    2. Tests MUST specify the values under test in requests and expected results independently. They MUST NOT reference the production constants that define those values, so a wrong constant causes the test to fail. When multiple tests specify a value with the same meaning, MUST use a test-only constant. Write a value specified by one test as a literal. This is the only exception.
7. Declaration naming: a name declared with `type` MUST convey the meaning of its data or its responsibility. A suffix MUST add specific meaning, e.g. `ShippingConfig` names shipping settings. MUST NOT use a suffix that adds no meaning, e.g. `MemberData` when it cannot be distinguished from `Member`.
8. Call order: if functions must be called in a specific order, e.g. `index.Load()` before `index.Find(key)`, MUST document the order in comments. See *Comment Principles:3*.
    1. Comments may be omitted when the code is structured to enforce the order. For example, first obtain the connection with `connection, err := gateway.Connect()`, then call `connection.Send(message)`.
    2. MUST have a clear reason to design a call order restriction; e.g. `Connect()` has to run once before the other functions can be called, but its cost may be high, so the caller decides whether to call it at creation or to defer it until the first use.
    3. A function that releases resources is exempt. The struct MUST follow the release convention of the language, and the code that holds the object releases it. For example, the struct implements `io.Closer`, and a function that uses the object only within itself closes it with `defer`.
9. Override: a `func` that overrides an existing implementation MUST behave differently from the overridden `func`. When nothing differs, MUST NOT override. In Go, this applies when an outer struct declares a `func` with the same name as one promoted from an embedded field.
10. Thread safety: instances of a named declaration are not thread-safe by default. When an instance is thread-safe, MUST follow *Comment Principles:4*. A thread here is a unit of concurrent execution in the language, e.g. a goroutine in Go.
    1. Steps that must complete together MUST be offered as one `func` and completed within one synchronized operation. If a step requires logic defined by the caller, the `func` MUST accept a callback and run it within that same operation.
    2. An interface's thread safety contract MUST be documented according to *Comment Principles:4.3*. When the interface requires thread safety, every implementation MUST meet that requirement.
    3. A `func` with a receiver MUST provide the same thread safety guarantees as its receiver. A mix of thread-safe and non-thread-safe `func` declarations for the same receiver usually indicates unclear responsibilities. MUST review the design to determine whether it needs adjustment.

## Architecture Principles

1. Composition: when several structs share a group of fields or behavior in the same scope, MUST extract the shared content into a separate struct and use it as a field in each struct. MUST define the contract for shared behavior with an interface.
    1. For example, API requests that share the same pagination contract can each hold a `Pagination` field. Requests declare their own fields when those fields have the same name but belong to different scopes.
    2. In target languages with inheritance, MUST also use composition to share fields or behavior. Inheritance is allowed when required by the language or a library. For a library, consider keeping the required inheritance inside an adapter.
2. Module boundary: each module MUST define its own input and output declarations for its external boundary. For example, a lookup may accept a `MemberID` declared as `type MemberID string`. Code outside the module MUST use the module only through that boundary and MUST NOT depend on its internal implementation.
    1. For example, business logic does not depend on the communication protocol. An HTTP adapter MUST convert `*http.Request` into the module's boundary input and write the module's output to `http.ResponseWriter`. An entry point that receives framework-bound request parameters MUST convert them to the module's boundary input before calling it and MUST NOT hold business logic.
    2. MUST validate every parameter that enters through the boundary; within the trust scope of one module, MUST NOT mechanically repeat the same validation at every layer.
    3. Validation rejects only values that the contract forbids; `0`, `false`, and an empty string are not inherently invalid.
    4. MUST document the default of each value that the contract allows to be omitted. When omission differs in meaning from an explicit zero value, e.g. `0`, `false`, or an empty string, the input declaration MUST distinguish the two. For example, declare the field as `*int` so that `nil` means omitted.
    5. Before adding a required input, as a parameter or as an input field, or making an existing input required, MUST inspect the sources that construct and load the data, identify the sources that omit the value, and ensure that validation at the boundary detects the missing value. Update the sources under our control in the same change. For a source that cannot be updated together, preserve a compatible entry point or explicitly describe the incompatible change and the migration. For example, when `MemberRegistration` gains a required field `Locale`, the stored old data and the other workflows that create a member do not have this value.
    6. When reorganizing the internal implementation, MUST preserve the call patterns of the external operations and the callers' responsibilities, and MUST also preserve the existing input meanings, results, and errors.
3. Feature decoupling: a feature that crosses a module boundary, or one whose implementation is not settled or needs to be replaceable, MUST provide its implementation behind an interface, and MUST confirm that all inputs and outputs of that interface are independent enough, depending only on the necessary components of other modules. When the boundaries of two modules are unrelated, couple them through an adapter, to avoid a dependency.
4. No circular dependency: the dependencies between modules MUST NOT form a cycle, directly or indirectly. A circular dependency means that the functions of the modules are unclear; lower-level logic can always be extracted to break the cycle.
5. Branching logic: when known requirements or existing extension points show that an `if-else` / `switch` will keep gaining branches, and each branch corresponds to a group of independent logic, MUST decouple the responsibility of selecting a branch from the handling logic, so that they can evolve independently; MUST NOT replace a `switch` with a `map` or a Strategy only because the branches increase.
    1. Closed set: the module that selects the branch owns all branches, and adding a branch may change the selector. Keep the `switch`, with each branch calling one named function.
    2. Open set: other modules provide the branches, or they are provided at run time, and adding a branch MUST NOT change the selector. When a unique key selects the branch, MUST use a dispatch table: the mapping from a key to its handler is registered from outside, and the selector depends only on the common interface.
    3. The Strategy Pattern is a way to encapsulate the handling logic, and can be combined with the selection approaches in *5.1* or *5.2*: use it when each branch has its own settings and logic and needs to be replaceable behind a common contract; MUST NOT create a Strategy for fixed and simple branches only to apply the pattern.
6. Data apart from logic: a struct that only carries data, e.g. a DTO or an API request or response, MUST declare only fields and the functions that access them, and MUST NOT hold any logic. The logic MUST live in a function or a struct that uses the data. Logic is code that decides, calculates, or converts by the values of the fields, or that reads external state.
    1. To tell whether a query point lies inside a search area, MUST write `func Contains(bounds Bounds, x, y float64) bool`. MUST NOT declare `Bounds` as the receiver, as in `func (bounds Bounds) Contains(x, y float64) bool`.
    2. Validation on construction is logic too, and MUST NOT be written in a data struct. The boundary that receives the data validates it. See *2*.
    3. Replacing an omitted value with its default and normalizing a format, e.g. stripping surrounding whitespace, are logic too, and MUST NOT be written in a data struct. The boundary that defines the contract replaces an omitted value with the default that the contract defines. Normalizing can be done by the boundary, or by the caller before it passes the data, e.g. only once when the same data goes to more than one module.
    4. When the boundary replaces defaults or normalizes, and the boundary is an interface with more than one implementation, MUST write that code in one function that the implementations share, and MUST NOT write one copy per implementation; e.g. every implementation of `MemberSearch` calls `ApplyMemberQueryDefaults(query)`.
    5. Copying a collection so that a later change of the source collection does not change the data is not logic, e.g. in Go, copying a slice with `slices.Clone` in the function that creates the value.
    6. The rule on separating data from logic also applies to enumerations. Each value may have fixed attributes declared with it, with a `func` that only looks up and returns an attribute. For example, `func (channel Channel) MaxLength() int` returns the length limit from a table indexed by the constant. A `func` that decides or calculates from the attributes or its parameters is logic and MUST NOT use an enumerated value as its receiver, as in `func (channel Channel) Accepts(text string) bool`. A function that finds the value for a fixed attribute is not logic, e.g. `func ParseChannel(code string) (Channel, error)`.
    7. When the target language supports a dedicated declaration for pure data, the equivalent of a data struct MUST use that declaration, and its fields MUST be immutable after construction. Use another declaration only when the language version or a library does not support that form. A struct that holds logic, e.g. an implementation of a Strategy, MUST NOT use a declaration dedicated to pure data.

## Comment Principles

1. High-level intent: describe only high-level purpose, data meaning, contracts, constraints, and trade-offs. MUST NOT narrate implementation steps.
2. List structure: when a comment has two or more independent points, MUST format them as a list, not prose.
3. Purpose comment: each name declared with `type`, each function, and each field MUST have a concise comment giving a high-level overview of its purpose or meaning.
    1. A comment on a name declared with `type` MUST state its responsibility and scope. Prefer describing what it does. Express excluded responsibilities through workflow or module boundaries.
    2. A comment on a field MUST explain the data's meaning, and MUST include an example when a fixed format applies.
    3. When the name and declaration of any parameter do not show its meaning, format, unit, whether it can be omitted, e.g. `nil` in Go, or its default, MUST explain every parameter in the function comment using the language's documentation convention. In Go, write each parameter as a list item in the doc comment. MUST include an example when a fixed format applies. When the names and declarations show all of these for every parameter, omit all parameter explanations.
    4. When implementing a `func` required by an interface or an abstract `func`, the original declaration already states the contract. The comment states only the behavior and constraints specific to the implementation. If there are none and the declaration already marks the implementation relationship, the comment may be omitted. Otherwise, write one line naming the contract. For example, `// Send implements Sender.` documents the implicit relationship in Go.
    5. For a `func` that overrides an existing implementation, the comment MUST state the behavior that differs from the overridden `func`. See *Code Principles:9*.
    6. A function comment MUST list the preconditions that the signature and related declarations cannot express, e.g. a validation that the caller must have completed, cross-module contracts, and a call order (see *Code Principles:8*). Omit these supplementary items when none apply. For a call order, MUST state which function must be called first and the error returned when the order is violated. A function that can be called only once MUST state this limit and what a repeated call does. MUST NOT enumerate callers or callees merely to repeat the call graph.
4. Thread safety: when a named declaration's comment does not state thread safety, several threads MUST NOT use one instance concurrently. If an instance is thread-safe, its declaration's comment MUST state that guarantee using the language's convention, e.g. "safe for concurrent use by multiple goroutines" in Go.
    1. An instance whose data does not change after construction is thread-safe. Its declaration may omit the thread safety guarantee. This also applies to enumerations represented by fixed constants. Whether the data changes MUST be decided from the actual code, and MUST NOT be decided from the declaration alone. For example, a struct passed by value is copied, but the copy still shares the elements of a slice field with the original.
    2. Any other named declaration whose instances are designed to be thread-safe MUST state that guarantee. For example, the comment of a cache that keeps its data in a `sync.Map` and that several goroutines share says "It is safe for concurrent use by multiple goroutines."
    3. When the logic that an interface defines must be thread-safe, the interface comment MUST state it, e.g. "An implementation must be safe for concurrent use by multiple goroutines"; when an implementation can be thread-safe or not thread-safe, the comment MUST also state it, e.g. "Whether an implementation is safe for concurrent use follows the comment of that implementation". An interface that is in neither case does not need to state it; when the comment states neither, MUST NOT assume that an implementation is thread-safe.
    4. When the synchronization makes the caller wait, the comment MUST state which `func` calls wait for each other, e.g. "Safe for concurrent use. While `Reload` runs, calls to any other `func` wait until it ends." When the wait can be long, the comment MUST also state the reason, e.g. a file is read while the lock is held.
    5. When a `func` runs a callback from the caller within a synchronized operation, the comment MUST state this and specify which calls wait while the callback runs. For example, "`loader` runs within the synchronized operation. Other calls for the same `key` wait until it ends." The comment MUST also state any callback restrictions. For example, if every `func` on the object acquires the same lock, the callback MUST NOT call any `func` on that object, including the `func` already running. Go's `sync.Mutex` is not reentrant. A second `Lock` before `Unlock` blocks forever.
5. History isolation: change history belongs only in commit messages. MUST NOT put it in code comments.
6. Fix in the same change: while making a change, when the affected code lacks a required comment, or its comment contradicts the confirmed purpose, data meaning, or contract, or violates the Comment Principles, MUST add or correct it in the same change.

## Error Principles

1. No hidden failure: MUST NOT swallow an error, return fake success, or silently degrade when the contract does not define a fallback.
2. Where to handle: handle an error only where the code can recover, translate it to a boundary contract, or decide the final outcome; elsewhere, MUST let the error propagate to the caller, and to add context, propagate a new error that keeps the original one, e.g. `fmt.Errorf("load orders: %w", err)` in Go.
3. Log once: log a failure once, at the layer that decides the final outcome. MUST NOT log and propagate at every layer.

## Logging Principles

1. Useful information: every piece of information MUST have traceable value for later tracking, statistics, analysis, or debugging. Information that helps none of these MUST NOT be logged.
2. Source location: every log line MUST be traceable to one code location, either because the message is unique or because the logger attaches the source location automatically.
3. Log format: logs MUST use a compact structure, not prose. If the project has a structured-field logging convention, MUST follow it; otherwise use a fixed-order positional format. Field meaning comes from the code location.
4. Aggregation: a log written solely for statistics MUST be aggregated first, then written on a timer or a count, rather than one line per event.
    1. If losing an unlogged interval is unacceptable, log each event instead; statistics may be derived from these logs.
    2. Event logs already kept for diagnostics or auditing may be reused for statistics.
5. Log levels: if the project has no level policy, `DEBUG` is for debugging, `INFO` records meaningful lifecycle events and aggregated statistics, `WARN` records recoverable degradation, and `ERROR` records failed outcomes that need human attention.
6. Payload limits: MUST NOT dump whole requests, responses, or objects. When logging fields from those sources, follow the project's limits on payload size and field count. If the project sets no limits, log only the fields needed for troubleshooting.

## Example References

- When the current task needs clarification in one of the situations below, read only the corresponding examples.

1. [Parameter Count Examples](references/parameter-examples.md): when a function subject to the parameter limit takes more than 3 parameters and you need to decide how to split responsibilities or wrap parameters in a struct.
2. [Branching Examples](references/branching-examples.md): when known requirements or extension points show that branches with independent logic will keep growing and you need to decide how to select branches or encapsulate their handling logic.
3. [Declaration Comment Examples](references/comment-examples.md): when writing or modifying declaration comments and you need to clarify their format or how to describe contracts and preconditions.
4. [Logging Examples](references/logging-examples.md): when adding or modifying log statements and you need to decide which fields to log, which format or level to use, or how to aggregate statistics.
