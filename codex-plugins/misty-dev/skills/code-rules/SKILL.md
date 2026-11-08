---
name: code-rules
description: >-
  Concrete implementation rules for maintainable code. Load when writing,
  modifying, refactoring, or reviewing code, covering change boundaries, error
  handling, comments, logging, and tool usage. Follow established project and
  language conventions; use `arch-rules` for higher-level design trade-offs.
---

# Code Rules

- MUST apply this precedence: explicit project rules, consistent conventions in existing project code, language conventions, then these rules. Use `arch-rules` for design-level trade-offs.

- These rules are language-independent. Examples use Go; adapt the syntax and input types to the language at hand.

## Change Rules

- Before changing behavior, MUST read direct callers, tests covering the affected behavior, and the containing module to confirm the existing contract.
- Before writing code, MUST state the intended behavior and how it will be verified; include compatibility constraints only when they apply.
- One change does one thing. MUST NOT mix unrelated cleanup into a behavior change; put cleanup in a separate commit.
- MUST review a function's responsibility, input meaning, and contract regardless of parameter count. Many parameters are a design warning; parameter count alone does not prove multiple responsibilities.
- For signatures under our control, business arguments MUST NOT exceed 3, excluding execution context and implicit receivers. MUST preserve externally fixed signatures and their contracts. When the limit is exceeded:
    - Inputs serve independently usable capabilities: split those functions; a workflow function may coordinate them when that is its responsibility.
    - One operation needs multiple data fields: use an input type whose meaning corresponds to that operation, carrying required data and optional settings, including values that affect behavior.
- Prefer existing domain types when their meaning and contract fit without bringing in substantial unrelated data. MUST NOT use an input object to conceal unrelated responsibilities.
- Even with 3 or fewer business arguments, an input type may improve clarity.
- MUST validate required business inputs and their value ranges at a boundary all calls to the operation pass through.
    - Reject only values forbidden by the contract; `0`, `false`, and empty strings are not inherently invalid.
    - MUST document defaults for values the contract allows to be omitted. When omission differs from an explicit zero value, the input model MUST distinguish them.
    - Within one trust boundary, MUST NOT mechanically repeat the same validation at every layer.
- Adding required data changes the contract whether it is passed individually or inside an input type.
- Only when explicit requirements or existing extension points show that cases will keep being added, choose a dispatch table or **Strategy Pattern** according to the behavior; otherwise keep the `if-else` / `switch`. MUST NOT abstract early merely to remove branches.

### Parameter Count Examples

- Same data scope: a spatial query receives four bounds and a query point, totaling six arguments. The bounds travel together between storage and queries, so introduce `Bounds`; `Contains` then has three arguments. `ctx`, receivers, and return values do not enter this count.

```go
// Bounds defines the inclusive limits of one rectangular search area.
type Bounds struct {
	MinX float64 // Left edge of the search area.
	MaxX float64 // Right edge of the search area.
	MinY float64 // Lower edge of the search area.
	MaxY float64 // Upper edge of the search area.
}

// Contains reports whether a query point lies within the search area.
func Contains(bounds Bounds, x, y float64) bool {
	return x >= bounds.MinX && x <= bounds.MaxX &&
		y >= bounds.MinY && y <= bounds.MaxY
}
```

- Independent operations: four inputs serve item pricing and shipping estimates, which can be requested separately. Each operation uses its own two inputs, so define separate functions. These internal calculations receive data already validated at the operation boundary; each product fits the result type.

```go
// Subtotal calculates the item charge in cents for the requested quantity.
//
//   - The operation boundary has validated that the product fits the result type.
func Subtotal(unitCents, quantity uint64) uint64 {
	return unitCents * quantity
}

// ShippingCost estimates the shipping charge in cents for whole kilograms.
//
//   - The operation boundary has validated that the product fits the result type.
func ShippingCost(kilograms, centsPerKilogram uint64) uint64 {
	return kilograms * centsPerKilogram
}
```

- One operation with many fields: creating a member uses name, email, phone, address, and locale. Keep this single responsibility and pass `CreateMemberInput` as one business argument. In this example, email must contain non-whitespace text, an empty locale defaults to `zh-TW`, and the other fields are stored as supplied. An empty or whitespace-only email returns `email required` without calling the store.

```go
import (
	"fmt"
	"strings"
)

// CreateMemberInput contains the registration data for one new member.
type CreateMemberInput struct {
	Name    string // Member's display name.
	Email   string // Contact email; required in this example.
	Phone   string // Member's contact number, stored as supplied.
	Address string // Member's contact address, stored as supplied.
	Locale  string // Language preference; empty uses "zh-TW".
}

// MemberStore persists member registration data after entry validation.
type MemberStore interface {
	// Insert stores one member's registration data.
	Insert(input CreateMemberInput) error
}

// MemberService creates member records using configured storage.
type MemberService struct {
	Store MemberStore // Initialized storage service for member records.
}

// CreateMember validates registration data before requesting persistence.
//
//   - Email must contain non-whitespace text; invalid input does not reach storage.
//   - An empty Locale uses "zh-TW".
func (service MemberService) CreateMember(input CreateMemberInput) error {
	if strings.TrimSpace(input.Email) == "" {
		return fmt.Errorf("email required")
	}
	if input.Locale == "" {
		input.Locale = "zh-TW"
	}
	if service.Store == nil {
		return fmt.Errorf("member store required")
	}
	if err := service.Store.Insert(input); err != nil {
		return fmt.Errorf("create member: %w", err)
	}
	return nil
}
```

### Branching Examples

- Fixed cases: the requirement defines only active and paused status labels, with unknown values displayed as `Unknown`. Keep a `switch`.

```go
// StatusLabel provides the display label for an account status.
func StatusLabel(status string) string {
	switch status {
	case "active":
		return "Active"
	case "paused":
		return "Paused"
	default:
		return "Unknown"
	}
}
```

- Dispatch table: the project explicitly requires plugin commands to keep being added, with plugins registering handlers at startup under the same calling contract. Add new command-handler entries to `handlers`; `Run` remains unchanged.

```go
import (
	"context"
	"fmt"
)

// CommandHandler performs one registered command.
type CommandHandler func(context.Context) error

// Run executes the handler registered for name.
func Run(ctx context.Context, name string, handlers map[string]CommandHandler) error {
	handler := handlers[name]
	if handler == nil {
		return fmt.Errorf("unknown command: %s", name)
	}
	if err := handler(ctx); err != nil {
		return fmt.Errorf("run %s: %w", name, err)
	}
	return nil
}
```

- Strategy: the project explicitly requires new shipping-fee algorithms to keep being added, each with its own configuration, and selects a policy per order at runtime. Use `ShippingPolicy`; for three kilograms, a 50-cent flat rate gives 50 cents, while 20 cents per kilogram gives 60 cents. The operation boundary validates the selected policy and its numeric inputs so that each charge fits the result type.

```go
// ShippingPolicy calculates the shipping charge for one order.
type ShippingPolicy interface {
	// Fee returns the charge in cents for whole kilograms.
	Fee(kilograms uint64) uint64
}

// FlatRate applies one configured charge to the entire delivery.
type FlatRate struct {
	Cents uint64 // Charge per delivery, in cents.
}

// Fee returns the configured delivery charge.
func (policy FlatRate) Fee(_ uint64) uint64 {
	return policy.Cents
}

// PerKilogram prices a delivery using its weight and a configured unit rate.
type PerKilogram struct {
	Cents uint64 // Charge per whole kilogram, in cents.
}

// Fee calculates the weight-based delivery charge in cents.
//
//   - The operation boundary has validated that the product fits the result type.
func (policy PerKilogram) Fee(kilograms uint64) uint64 {
	return policy.Cents * kilograms
}

// ShippingFee applies the shipping policy selected for an order.
//
//   - policy must be a non-nil policy initialized for that order.
//   - The operation boundary has validated the calculation's numeric range.
func ShippingFee(policy ShippingPolicy, kilograms uint64) uint64 {
	return policy.Fee(kilograms)
}
```

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

- Declaration comment example:

```go
import "strings"

// Message contains the content and destination of one SMS delivery.
type Message struct {
	Phone string // Taiwan mobile number in XXXX-XXX-XXX format, e.g. "0909-878-787".
	Text  string // Recipient-visible content, e.g. "Your pickup code is 123456".
}

// Sender delivers SMS messages through a configured transport.
type Sender interface {
	// Connect establishes a connection for SMS delivery.
	Connect() error

	// Send submits one message for delivery to its recipient.
	//
	//   - Connect must succeed before the first call.
	//   - A nil error confirms that the transport accepted the message.
	Send(message Message) error
}

// HasContent reports whether text can be used as nonblank message content.
// Example: HasContent(" Ready ") returns true; HasContent("   ") returns false.
func HasContent(text string) bool {
	return strings.TrimSpace(text) != ""
}
```

## Logging Rules

- Every piece of information MUST have traceable value for later tracking, statistics, analysis, or debugging. Information that helps none of these MUST NOT be logged.
- Every log line MUST be traceable to one code location, either because the message is unique or because the logger attaches the source location automatically.
- Logs MUST use a compact structure, not prose. If the project has a structured-field logging convention, MUST follow it; otherwise use a fixed-order positional format, e.g. `Enter {AGE} {NAME} "{MSG}"`. Field meaning comes from the code location.
- When logging solely for statistics, MUST aggregate data and log on a timer or a count, e.g. accumulate request counts and write `Request ALL 123` every 5s, rather than logging each event.
    - If losing an unlogged interval is unacceptable, log each event instead; statistics may be derived from these logs.
    - Event logs already required for diagnostics or auditing may also be reused for statistics.
- If the project has no level policy: `DEBUG` diagnoses, `INFO` records meaningful lifecycle events, `WARN` records recoverable degradation, and `ERROR` records failed outcomes that need human attention.
- MUST NOT dump whole requests, responses, or objects. Payload size and field count follow project limits; if none exist, log selected fields only.

## Execution Awareness

- When handling code or HTML, if the host provides an `LSP` tool that supports the language, MUST prefer it so lookup and edits follow real program symbols; otherwise use text-based tools.
- Colors in web pages and CSS MUST be defined in `OKLCH`. For other visual output such as ppt, pick colors in OKLCH, then convert to a color space the target format supports.
