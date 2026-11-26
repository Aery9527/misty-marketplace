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

- MUST apply this precedence: explicit project rules, consistent conventions in existing project code, language conventions, then these rules. Use `arch-rules` for the design trade-offs that these rules do not decide.
- These rules are language-independent; the examples use Go, and MUST be adapted to the syntax and types of the target language.

## Change Principles

1. Before changing behavior, MUST read direct callers, tests covering the affected behavior, and the containing module to confirm the existing contract.

## Code Principles

1. Nesting limit: at most 2 levels of control structures; an `if`, a loop, a `switch`, and an exception-handling block each count as one level, e.g. `if`, `for`, `switch`, and `select` in Go.
    1. `if a { for _, x := range xs { use(x) } }` is allowed; a third structure inside it, e.g. `if b`, is prohibited.
    2. An `if` / `else if` / `else` chain counts as one level; so does a `try` with its `catch` and `finally` blocks.
2. Function content: a group of steps that serves one purpose MUST be extracted into a function whose name states that purpose; extract it only when the function name can clearly carry the meaning of those lines of code combined.
3. Function grouping: when the meaning of several functions can be gathered further under a name with higher cohesion and a clearer boundary, create a type or a module to hold these functions of the same scope, e.g. a package or a type with methods in Go.
4. Function parameters: at most 3, and the signature MUST stay stable for the foreseeable future.
    1. More than 3 means that the function may have too many responsibilities: when several calculations, each with its own meaning, are written in one function, they can only run together and cannot be used alone. MUST first review whether the function can be split by responsibility into several functions; only when the parameters belong to the same scope, wrap them in a new type, which also satisfies the stability principle below.
    2. When a function is likely to keep gaining parameters in the foreseeable future, MUST wrap the parameters of the same scope in a dedicated type, to avoid a breaking change of the signature, and MUST state for each parameter whether it is required or what its default is.
    3. Execution context and the receiver object do not count toward the limit, e.g. `context.Context` and the receiver of a method in Go.
    4. A function whose signature a framework or a library determines does not count toward the limit, e.g. a method that implements an interface of a library, or an HTTP handler `func(http.ResponseWriter, *http.Request)` in Go; MUST preserve that signature and its contract.
    5. An entry-point function whose parameters a framework binds one by one from the request data does not count toward the limit, e.g. a controller method in Java whose request parameters are bound by annotations; such a function MUST convert the parameters into the input type of the module boundary before it calls the module, and MUST NOT hold business logic.
    6. The fields of a data type and the parameters of its constructor do not count toward the limit, because a data type is the type that wraps parameters.
5. Function length: keep it within 50 lines, counted from the first line of the function signature to its last line, blank lines and comments included; when it must exceed that, adjust it by items 2 and 3. Mechanical content such as "a series of `if-else`" or "telling many kinds of error apart one by one" indicates a structural design problem, and MUST be avoided by designing at a higher level.
6. Constants of the same meaning: when constants in many places stand for the same meaning, MUST assign or concatenate them from one constant, so that the code states their relation.
    1. E.g. a URL path prefix: define one constant for the prefix of the API endpoints of one scope and concatenate it; MUST NOT repeat the prefix as a literal, so that changing the prefix changes one constant, and the prefix is easier to trace.
    2. A value that a test requests with, and a result that it expects, MUST be written as a test-only constant or a literal, and MUST NOT come from a constant of the production code, so that the test fails when the production constant is wrong. This is the only repetition allowed for constants of the same meaning.
    3. When more than one test uses a value of the same meaning, MUST define it as a test-only constant; write a value that only one test uses as a literal.
    4. A value of an enumerated type is not a constant in the sense of sub-item 2; a test uses it directly, e.g. `ChannelSMS` of the type `Channel` in Go. The representation that the value is stored or transmitted as, e.g. the string `"sms"`, still follows sub-item 2.
7. Type naming: MUST name a type after the meaning of its data or its responsibility.
    1. A suffix MUST carry a meaning that is lost when the suffix is removed, e.g. `ShippingConfig` is the configuration of shipping, and `MemberContact` is the contact details of a member; MUST NOT use a suffix whose removal leaves the meaning unchanged, e.g. `Data` or `Info`: `MemberData` cannot be told apart from `Member`.
    2. MUST NOT name a data type after the function that uses it, e.g. use `MemberRegistration`, not `CreateMemberInput`; a request/response that belongs to exactly one API endpoint is the exception, e.g. `CreateMemberRequest`.
8. Call order: functions MAY have a call order, i.e. one function works correctly only after another function was called, e.g. `index.Find(key)` only after `index.Load()`; but a call order MUST NOT be implicit, and MUST be stated in comments, see item 3 of the Comment Principles.
    1. A function that is called out of order MUST fail with a documented error that has a clear error message, e.g. return `ErrNotLoaded` in Go.
    2. The types can express the call order instead, so that the compiler checks it, and the comments and the sub-item above are then not needed: the function that is called first returns the object that the next step uses, e.g. first get the connection with `connection, err := gateway.Connect()`, then call `connection.Send(message)`; without a connection, `Send` cannot be called.
    3. MUST have a clear reason to design a call order restriction; e.g. `Connect()` has to run once before the other functions can be called, but its cost may be high, so the caller decides whether to call it at creation or to defer it until the first use.
    4. A function that releases resources is exempt: the type MUST follow the release convention of the language, and the code that holds the object releases it; e.g. in Go, the type implements `io.Closer`, and a function that uses the object only within itself closes it with `defer`.
    5. A call order that a test framework guarantees is exempt, e.g. the `testing` package of Go calls a function registered with `t.Cleanup` after the test finishes.
9. Override: a method that overrides a method with an implementation MUST behave differently from the overridden method; when nothing differs, MUST NOT override. In Go, this applies to a method that an outer type declares with the same name as a method promoted from an embedded type.
10. Thread safety: a type is not thread-safe by default; a type that needs to be thread-safe MUST state it in a comment, see item 4 of the Comment Principles. A thread here is a unit of concurrent execution of the language, e.g. a goroutine in Go.
    1. A type designed for use by one thread needs no synchronization, which avoids a needless performance cost, e.g. a builder created once for each report.
    2. A type designed to be shared by several threads MAY do the synchronization inside the type, e.g. with a `sync.Mutex` field in Go, so that the caller can use it safely without synchronizing; when the synchronization makes the caller wait, a comment MUST explain the waiting behavior.
    3. When a type synchronizes inside, steps that must complete together MUST be offered as one method, e.g. offer `StoreIfAbsent(key, value)` for "write only when absent", and MUST NOT let the caller call `Contains(key)` and then `Store(key, value)`; methods that each synchronize do not make a sequence of calls safe. The same applies to the use of another thread-safe object: MUST call the one method that it offers, e.g. in Go, call `LoadOrStore(key, value)` of a `sync.Map`, and MUST NOT call `Load(key)` and then `Store(key, value)`.
    4. When the steps that must complete together include logic that only the caller can decide, a callback MUST supply that logic, and it MUST run inside the same synchronization, e.g. `cache.GetOrLoad(key, loader)` calls `loader` only when `key` is absent and stores its result; a comment MUST explain that the callback runs inside the synchronization.
    5. When the logic that an interface defines must be thread-safe, every implementation MUST be thread-safe; when an implementation can be thread-safe or not thread-safe, each implementation decides. In either of these two cases, the interface comment MUST state it; an interface that is in neither case does not need to state it, the same as the default of a type.
    6. The thread safety of a method MUST be the same as that of its type; a thread-safe type MUST NOT have a method that cannot be called concurrently; such a case usually means that the responsibilities are unclear, and MUST be changed.

## Error Principles

1. No hidden failure: MUST NOT swallow an error, return fake success, or silently degrade when the contract does not define a fallback.
2. Where to handle: handle an error only where the code can recover, translate it to a boundary contract, or decide the final outcome; elsewhere, MUST let the error propagate to the caller, and to add context, propagate a new error that keeps the original one, e.g. `fmt.Errorf("load orders: %w", err)` in Go.
3. Log once: log a failure once, at the layer that decides the final outcome. MUST NOT log and propagate at every layer.

## Architecture Principles

1. Composition over inheritance: when several types have a group of fields or behavior of the same scope, MUST compose them from a separate type instead of inheriting, and define the common contract with an interface.
    1. E.g. API requests and responses often use a supertype to gather the same fields, but the same fields may still belong to different scopes; composition and interfaces separate the scopes properly, so that each API request or response holds what it needs and nothing more.
    2. Inheritance that is required is exempt, e.g. the exception types of a language, or a library that requires extension to work. For a library, consider an adapter that bridges to composition, to satisfy this principle.
2. Module boundary: each module MUST use input and output types that it defines as its external boundary; code outside the module MUST use the module only through that boundary, and MUST NOT depend on its internal implementation.
    1. E.g. business logic does not depend on the communication protocol: an HTTP request or response, e.g. `*http.Request` and `http.ResponseWriter` in Go, MUST be converted by an adapter into the input and output types of the business module's boundary, which decouples the business logic from the protocol.
    2. MUST validate every parameter that enters through the boundary; within the trust scope of one module, MUST NOT mechanically repeat the same validation at every layer.
    3. Validation rejects only values that the contract forbids; `0`, `false`, and an empty string are not inherently invalid.
    4. MUST document the default of each value that the contract allows to be omitted. When omission differs in meaning from an explicit zero value, e.g. `0`, `false`, or an empty string, the input type MUST distinguish the two, e.g. declare the field as `*int` instead of `int` in Go, so that `nil` means omitted.
    5. Before adding a required input, as a parameter or as a field of an input type, or making an existing input required, MUST inspect the sources that construct and load the data, identify the sources that omit the value, and ensure that the validation at the boundary detects the missing value; update the sources under our control in the same change, and for a source that cannot be updated together, preserve a compatible entry point or explicitly describe the incompatible change and the migration. E.g. when `MemberRegistration` gains a required field `Locale`, the stored old data and the other workflows that create a member do not have this value.
    6. When reorganizing the internal implementation, MUST preserve the call patterns of the external operations and the callers' responsibilities, and MUST also preserve the existing input meanings, results, and errors.
3. Feature decoupling: a feature that crosses a module boundary, or one whose implementation is not settled or needs to be replaceable, MUST provide its implementation behind an interface, and MUST confirm that all inputs and outputs of that interface are independent enough, depending only on the necessary components of other modules. When the boundaries of two modules are unrelated, couple them through an adapter, to avoid a dependency.
4. No circular dependency: the dependencies between modules MUST NOT form a cycle, directly or indirectly. A circular dependency means that the functions of the modules are unclear; lower-level logic can always be extracted to break the cycle.
5. Branching logic: when known requirements or existing extension points show that an `if-else` / `switch` will keep gaining branches, and each branch corresponds to a group of independent logic, MUST decouple the responsibility of selecting a branch from the handling logic, so that they can evolve independently; MUST NOT replace a `switch` with a `map` or a Strategy only because the branches increase.
    1. Closed set: the module that selects the branch owns all branches, and adding a branch may change the selector. Keep the `switch`, with each branch calling one named function.
    2. Open set: other modules provide the branches, or they are provided at run time, and adding a branch MUST NOT change the selector. When a unique key selects the branch, MUST use a dispatch table: the mapping from a key to its handler is registered from outside, and the selector depends only on the common interface.
    3. The Strategy Pattern is a way to encapsulate the handling logic, and can be combined with either way of selecting above: use it when each branch has its own settings and logic and needs to be replaceable behind a common contract; MUST NOT create a Strategy for fixed and simple branches only to apply the pattern.
6. Data apart from logic: a data type, i.e. a type that only carries data, e.g. a DTO, or an API request or response, MUST declare only fields and the functions that access them, and MUST NOT hold any logic; the logic MUST live in a function or a type that uses the data. Logic is code that decides, calculates, or converts by the values of the fields, or that reads external state.
    1. E.g. to tell whether a query point lies inside a search area, MUST write a function `func Contains(bounds Bounds, x, y float64) bool`, and MUST NOT write a method of `Bounds`, `func (bounds Bounds) Contains(x, y float64) bool`.
    2. Validation on construction is logic too, and MUST NOT be written in a data type; the boundary that receives the data validates it, see item 2 of this section.
    3. Replacing an omitted value with its default and normalizing a format, e.g. stripping surrounding whitespace, are logic too, and MUST NOT be written in a data type. The boundary that defines the contract replaces an omitted value with the default that the contract defines; normalizing can be done by the boundary, or by the caller before it passes the data, e.g. only once when the same data goes to more than one module.
    4. When the boundary replaces defaults or normalizes, and the boundary is an interface with more than one implementation, MUST write that code in one function that the implementations share, and MUST NOT write one copy per implementation; e.g. every implementation of `MemberSearch` calls `ApplyMemberQueryDefaults(query)`.
    5. Copying a collection so that a later change of the source collection does not change the data is not logic, e.g. in Go, copying a slice with `slices.Clone` in the function that creates the value.
    6. This item applies to an enumerated type too: each value may have fixed attributes that are declared together with the values, with methods that only look them up and return them, e.g. in Go, `func (channel Channel) MaxLength() int` returns the length limit from a table indexed by the constant; a method that decides or calculates from the attributes or from its parameters is logic, and MUST NOT be written in the enumerated type, e.g. `func (channel Channel) Accepts(text string) bool`. A function that finds the value for a fixed attribute is not logic, e.g. `func ParseChannel(code string) (Channel, error)`.
    7. When the language has a dedicated declaration for pure data, e.g. a `record` in Java, a data type other than an enumerated type MUST be declared with it, in a form whose fields cannot change after construction; declare it another way only when the language version or a library does not support that declaration, e.g. a library that requires a no-argument constructor and setters. A type that holds logic MUST NOT be declared with it, e.g. an implementation of a Strategy.

## Comment Principles

1. High-level intent: describe only high-level purpose, data meaning, contracts, constraints, and trade-offs. MUST NOT narrate implementation steps.
2. List structure: when a comment has two or more independent points, MUST format them as a list, not prose.
3. Purpose comment: every type, function, and field MUST have a concise comment giving a high-level overview of its purpose or meaning.
    1. A type comment MUST state its responsibility and scope. Prefer describing what it does; express excluded responsibilities through workflow or module boundaries.
    2. A comment on a field MUST explain the data's meaning, and MUST include an example when a fixed format applies.
    3. When any parameter of a function has a meaning, a format, a unit, whether it may be absent, e.g. `nil` in Go, or a default when omitted that its name and type do not show, MUST explain every parameter in the function comment by the documentation convention of the language (e.g. `@param` in Javadoc; Go has no parameter tag, so write each parameter as a list item in the doc comment), and MUST include an example when a fixed format applies; when the names and types show all of these for every parameter, omit all parameter explanations.
    4. For a method that implements an interface method or an abstract method, the implemented method already states the contract, so the comment states only the behavior and constraints specific to this implementation. When there are none, it needs no comment if the declaration marks the implemented method, e.g. `@Override` in Java; otherwise, e.g. in Go, which satisfies an interface implicitly, write one line that names the implemented type, e.g. `// Send implements Sender.`
    5. For a method that overrides a method with an implementation, the comment MUST state the behavior that differs from the overridden method, see item 9 of the Code Principles.
    6. A function comment MUST list the preconditions that the types and the signature cannot express, e.g. a validation that the caller must have completed, cross-module contracts, and a call order (see item 8 of the Code Principles); omit these supplementary items when none apply. For a call order, MUST state which function must be called first, and the error that a call out of order fails with; a function that can be called only once MUST state this limit, and what a repeated call does. MUST NOT enumerate callers or callees merely to repeat the call graph.
4. Thread safety: a type comment that does not say so means that the type is not thread-safe, i.e. several threads MUST NOT use one instance at the same time; the type comment of a thread-safe type MUST state that it is thread-safe, in the wording that the language uses, e.g. "safe for concurrent use by multiple goroutines" in Go.
    1. A type whose data does not change after construction is thread-safe by nature and does not need to state it, e.g. an enumerated type, or a `record` in Java. Whether the data changes MUST be decided from the actual code, and MUST NOT be decided from the declaration alone, e.g. in Go, a struct that is passed by value is copied, but the copy still shares the elements of a slice field with the original.
    2. Any other type that is designed to be thread-safe MUST state it, e.g. in Go, the comment of a cache that keeps its data in a `sync.Map` and that several goroutines share says "It is safe for concurrent use by multiple goroutines."
    3. When the logic that an interface defines must be thread-safe, the interface comment MUST state it, e.g. "An implementation must be safe for concurrent use by multiple goroutines"; when an implementation can be thread-safe or not thread-safe, the comment MUST also state it, e.g. "Whether an implementation is safe for concurrent use follows the comment of that implementation". An interface that is in neither case does not need to state it; when the comment states neither, MUST NOT assume that an implementation is thread-safe.
    4. When the synchronization makes the caller wait, the comment MUST state which methods wait for each other, e.g. "Safe for concurrent use: while `Reload` runs, a call to another method waits until it ends"; when the wait can be long, the comment MUST also state the reason, e.g. a file is read while the lock is held.
    5. When a method runs a callback from the caller inside the synchronization, the comment MUST state this, and which calls wait while the callback runs, e.g. "`loader` runs inside the synchronization; while it runs, another call for the same `key` waits until it ends"; when the callback has a restriction, the comment MUST also state it, e.g. the callback MUST NOT call a method of the same object, because a `sync.Mutex` of Go is not reentrant: a second `Lock` before `Unlock` blocks forever.
5. History isolation: change history belongs only in commit messages. MUST NOT put it in code comments.
6. Fix in the same change: while making a change, when the affected code lacks a required comment, or its comment contradicts the confirmed purpose, data meaning, or contract, or violates the Comment Principles, MUST add or correct it in the same change.

## Logging Principles

1. Every piece of information MUST have traceable value for later tracking, statistics, analysis, or debugging. Information that helps none of these MUST NOT be logged.
2. Every log line MUST be traceable to one code location, either because the message is unique or because the logger attaches the source location automatically.
3. Logs MUST use a compact structure, not prose. If the project has a structured-field logging convention, MUST follow it; otherwise use a fixed-order positional format. Field meaning comes from the code location.
4. A log written solely for statistics MUST be aggregated first, then written on a timer or a count, rather than one line per event.
    1. If losing an unlogged interval is unacceptable, log each event instead; statistics may be derived from these logs.
    2. Event logs already kept for diagnostics or auditing may be reused for statistics.
5. If the project has no level policy: `DEBUG` is for debugging, `INFO` records meaningful lifecycle events and aggregated statistics, `WARN` records recoverable degradation, and `ERROR` records failed outcomes that need human attention.
6. MUST NOT dump whole requests, responses, or objects. Payload size and field count follow project limits; if none exist, log selected fields only.

## Execution Awareness

1. When handling code or HTML, if the current environment provides an available `LSP` tool that supports the language, MUST prefer it so lookup and edits follow real program symbols; otherwise use text-based tools.
2. Colors in web pages and CSS MUST be defined in `OKLCH`. For other visual output, pick colors in OKLCH, then convert to a color space the target format supports.

## Example References

1. Parameter count: when an existing or planned function signature has more than 3 parameters, MUST read [Parameter Count Examples](references/parameter-examples.md) before deciding how to split responsibilities or wrap parameters.
2. Branching: when known requirements or extension points show that the branches of an `if-else` / `switch` will keep growing, and each branch corresponds to a group of independent logic, MUST read [Branching Examples](references/branching-examples.md) before deciding whether to use a dispatch table or the Strategy Pattern.
3. Declaration comments: before writing or modifying code, MUST read [Declaration Comment Examples](references/comment-examples.md), and follow the Comment Principles and the commenting approach that the examples show.
4. Logging: before writing or modifying log statements, MUST read [Logging Examples](references/logging-examples.md), and follow the Logging Principles and the approach that the examples show.
