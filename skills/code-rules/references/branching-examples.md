# Branching Examples

- These examples use Go; adapt the syntax and types to the target language.
- Each section is a refactoring scenario for teaching: the implementation before the change comes first, then the assessment and the implementation after the change; the two implementations are alternatives, and declarations of the same name do not exist together. In a section with shared declarations, both implementations use them.
- `Fixed Cases` and `Strategy` are internal refactorings: creation and the operation call are the same before and after the change, and only the internal implementation changes. `Dispatch Table` changes the way of creation, because of a new requirement for extension across modules.

## Fixed Cases

- The requirements define only the two status labels active and paused, and an unknown value shows `Unknown`; no requirement shows that the statuses will keep growing.

- Before: a Strategy and a registry provide the two fixed labels.

```go
// statusLabel provides the display label of one account status.
type statusLabel interface {
	// Label returns the display label.
	Label() string
}

// activeLabel is the label of the active status.
type activeLabel struct{}

// Label returns the display label of the active status.
func (activeLabel) Label() string {
	return "Active"
}

// pausedLabel is the label of the paused status.
type pausedLabel struct{}

// Label returns the display label of the paused status.
func (pausedLabel) Label() string {
	return "Paused"
}

// statusLabels is the registry of labels, indexed by status.
var statusLabels = map[string]statusLabel{
	"active": activeLabel{},
	"paused": pausedLabel{},
}

// StatusLabel returns the display label of an account status.
//
//   - status is the account status, e.g. "active".
//   - An unknown status returns "Unknown".
func StatusLabel(status string) string {
	label, ok := statusLabels[status]
	if !ok {
		return "Unknown"
	}
	return label.Label()
}
```

- Assessment: each of the two branches only returns one fixed string, with no independent logic of its own; no requirement shows that the statuses will keep growing either. `statusLabel`, its two implementations, and the registry answer no extension requirement, and only add reading cost. So the code goes back to a `switch`.

- After: `StatusLabel` lists the two statuses directly in a `switch`.

```go
// StatusLabel returns the display label of an account status.
//
//   - status is the account status, e.g. "active".
//   - An unknown status returns "Unknown".
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

- Both are called as `StatusLabel(status)`, with the same results: `"active"` returns `"Active"`, `"paused"` returns `"Paused"`, and any other value returns `"Unknown"`.

## Dispatch Table

- The core module provides the command dispatcher, and each feature module provides its own commands: the health module provides `ping`, and the deployment module provides `status`. The project explicitly requires that adding a feature module does not change the core module.
- Each code block is one file of one package; the module path is `example.com/app` as an example.

- Before: `CommandDispatcher` in the core module lists the commands of each module in a `switch`, and calls the functions of each module directly.

```go
package health

// Ping returns the liveness reply.
func Ping() string {
	return "pong\n"
}
```

```go
package deploy

// Status returns the readiness reply.
func Status() string {
	return "ready\n"
}
```

```go
package core

import (
	"fmt"
	"io"

	"example.com/app/deploy"
	"example.com/app/health"
)

// CommandDispatcher runs the commands of the feature modules.
type CommandDispatcher struct{}

// NewCommandDispatcher creates a command dispatcher.
func NewCommandDispatcher() *CommandDispatcher {
	return &CommandDispatcher{}
}

// Run runs the command that name selects, and writes the reply to output.
//
//   - name is the command name, e.g. "ping".
//   - output is the destination of the reply, and must be a non-nil value.
//   - An unknown name returns an error, and nothing is written to the output.
//   - A write failure returns that error.
func (dispatcher *CommandDispatcher) Run(name string, output io.Writer) error {
	var reply string
	switch name {
	case "ping":
		reply = health.Ping()
	case "status":
		reply = deploy.Status()
	default:
		return fmt.Errorf("unknown command: %s", name)
	}
	_, err := io.WriteString(output, reply)
	return err
}
```

- Assessment: the feature modules provide the commands, so they are an open set. The `switch` in the core module has to list the commands of every module and import their packages; adding a feature module then changes the core module. So the mapping from a command name to its handler is registered from outside: the core module defines the common `CommandHandler`, each feature module hands its implementation of `CommandHandler` to `CommandDispatcher` at assembly, and the core module depends only on `CommandHandler`.

- After: `NewCommandDispatcher` builds the commands it receives into a dispatch table indexed by name, and validates the names; `Run` finds the command in this table. The core module no longer imports the feature modules.

```go
package core

import (
	"errors"
	"fmt"
	"io"
	"strings"
)

// CommandHandler is a command that can be run by its name.
type CommandHandler interface {
	// Name returns the command name, e.g. "ping".
	//
	//   - The name must hold non-whitespace text, and must not repeat the name of another command.
	Name() string

	// Run runs the command and returns the reply.
	Run() string
}

// CommandDispatcher runs the registered commands.
type CommandDispatcher struct {
	handlers map[string]CommandHandler // Registered commands, indexed by command name.
}

// NewCommandDispatcher creates a command dispatcher with the commands that the feature modules provide.
//
//   - handlers are the commands to register; each element must be a non-nil value.
//   - Changing this slice after creation does not affect the dispatcher.
//   - It returns an error when a name is an empty string or all whitespace, or when a name repeats.
func NewCommandDispatcher(handlers []CommandHandler) (*CommandDispatcher, error) {
	table := make(map[string]CommandHandler, len(handlers))
	for _, handler := range handlers {
		if err := register(table, handler); err != nil {
			return nil, err
		}
	}
	return &CommandDispatcher{handlers: table}, nil
}

// Run runs the command that name selects, and writes the reply to output.
//
//   - name is the command name, e.g. "ping".
//   - output is the destination of the reply, and must be a non-nil value.
//   - An unregistered name returns an error, and nothing is written to the output.
//   - A write failure returns that error.
func (dispatcher *CommandDispatcher) Run(name string, output io.Writer) error {
	handler, ok := dispatcher.handlers[name]
	if !ok {
		return fmt.Errorf("unknown command: %s", name)
	}
	_, err := io.WriteString(output, handler.Run())
	return err
}

// register adds one command to the dispatch table.
//
//   - table is the dispatch table under construction, and must be a created map.
//   - handler is the command to add, and must be a non-nil value.
//   - It returns an error when the name is an empty string or all whitespace, or when the name is already in the table.
func register(table map[string]CommandHandler, handler CommandHandler) error {
	name := handler.Name()
	if strings.TrimSpace(name) == "" {
		return errors.New("command name required")
	}
	if _, exists := table[name]; exists {
		return fmt.Errorf("duplicate command: %s", name)
	}
	table[name] = handler
	return nil
}
```

```go
package health

// PingCommand is the liveness command of the health module.
type PingCommand struct{}

// Name returns the command name "ping".
func (PingCommand) Name() string {
	return "ping"
}

// Run returns the liveness reply.
func (PingCommand) Run() string {
	return "pong\n"
}
```

```go
package deploy

// StatusCommand is the readiness command of the deployment module.
type StatusCommand struct{}

// Name returns the command name "status".
func (StatusCommand) Name() string {
	return "status"
}

// Run returns the readiness reply.
func (StatusCommand) Run() string {
	return "ready\n"
}
```

- This changes the boundary because of a new requirement for extension across modules, so the way of creation differs: before the change, `core.NewCommandDispatcher()` creates the dispatcher; after the change, the assembly code provides the commands, and the call returns one more value, an error, e.g. `core.NewCommandDispatcher([]core.CommandHandler{health.PingCommand{}, deploy.StatusCommand{}})`. The operation call is `dispatcher.Run("ping", output)` in both.

- The results are the same before and after: `ping` writes `"pong\n"`; `status` writes `"ready\n"`; the unknown `missing` returns an error with the message `unknown command: missing`, and writes nothing to the output.

- After the change, when two commands have the same name, `NewCommandDispatcher` returns an error with the message `duplicate command: ping`. To add a command of a feature module, add an implementation of `CommandHandler` and provide it at assembly; the core module does not change. A Go interface is satisfied implicitly by the method set, so a feature module does not need to import the core module.

## Strategy

- The project explicitly requires a growing set of shipping fee algorithms, each with its own settings. Charging by weight uses a base fee and a price per kilogram, and the flat rate uses a fee per delivery.

- Shared declarations: the two structs declare only fields. The rates and the kilograms are unsigned integers, so they are never negative, and zero is allowed. An unknown delivery method returns an error; so does a fee charged by weight that exceeds the range of the return type.

```go
import (
	"errors"
	"fmt"
)

// ShippingConfig is the rate settings of the delivery methods.
type ShippingConfig struct {
	WeightBaseCents  uint64 // Base fee of charging by weight, in cents; zero is allowed.
	FlatCents        uint64 // Fee per delivery of the flat rate, in cents; zero is allowed.
	PerKilogramCents uint64 // Fee per whole kilogram, in cents; zero is allowed.
}

// ShippingOrder is the delivery method and the weight of one shipping quote.
type ShippingOrder struct {
	Method    string // Delivery method: "flat" or "weight".
	Kilograms uint64 // Weight in whole kilograms; zero is allowed.
}

// errFeeOverflow reports that the shipping fee exceeds the range of the return type.
var errFeeOverflow = errors.New("shipping fee overflow")
```

- Before: the service selects the delivery method and calculates its fee.

```go
// ShippingService calculates shipping fees from the configured rates.
type ShippingService struct {
	config ShippingConfig // Rates set when the service was created.
}

// NewShippingService creates a shipping fee service from the rate settings.
func NewShippingService(config ShippingConfig) *ShippingService {
	return &ShippingService{config: config}
}

// ShippingFee calculates the shipping fee of the delivery method that the order selects, in cents.
//
//   - It returns an error when the delivery method is unknown, or when the result exceeds the range of the return type.
func (service *ShippingService) ShippingFee(order ShippingOrder) (uint64, error) {
	switch order.Method {
	case "flat":
		return service.config.FlatCents, nil
	case "weight":
		rate := service.config.PerKilogramCents
		if rate != 0 && order.Kilograms > ^uint64(0)/rate {
			return 0, errFeeOverflow
		}
		product := order.Kilograms * rate
		if product > ^uint64(0)-service.config.WeightBaseCents {
			return 0, errFeeOverflow
		}
		return service.config.WeightBaseCents + product, nil
	default:
		return 0, fmt.Errorf("unknown delivery method: %s", order.Method)
	}
}
```

- Assessment: each of the two algorithms has its own rates and calculation, and the project explicitly requires more algorithms; each new algorithm adds one branch to `ShippingFee` that reads its own settings from `ShippingConfig` and holds its own calculation, so the calculations of all algorithms accumulate in one function. Separate named functions can isolate the calculations; here a strategy also keeps the rates of each algorithm with its calculation: `flatRate` keeps the delivery fee, and `perKilogram` keeps the base fee and the price per kilogram. So the common internal pricing contract `Fee(kilograms)` encapsulates the settings and the calculation of each algorithm; the service owns the delivery methods, so it still selects the strategy for each order in a `switch`, from the existing delivery method field of the order.

- After: the same settings create the private strategies, and the selecting responsibility stays in the service; the caller provides the existing order data.

```go
// shippingPolicy encapsulates one configured shipping fee algorithm.
type shippingPolicy interface {
	// Fee calculates the shipping fee of one delivery, in cents.
	//
	//   - kilograms is the weight in whole kilograms; a policy that does not charge by weight does not use it.
	//   - It returns an error when the result exceeds the range of the return type.
	Fee(kilograms uint64) (uint64, error)
}

// flatRate applies the configured flat fee to a whole delivery.
type flatRate struct {
	cents uint64 // Fee per delivery, in cents.
}

// Fee returns the configured delivery fee.
//
//   - It does not use the weight.
func (policy flatRate) Fee(_ uint64) (uint64, error) {
	return policy.cents, nil
}

// perKilogram prices a delivery as a base fee plus a fee by weight.
type perKilogram struct {
	baseCents uint64 // Base fee per delivery, in cents.
	cents     uint64 // Fee per whole kilogram, in cents.
}

// Fee returns the base fee plus the kilograms multiplied by the price per kilogram.
func (policy perKilogram) Fee(kilograms uint64) (uint64, error) {
	if policy.cents != 0 && kilograms > ^uint64(0)/policy.cents {
		return 0, errFeeOverflow
	}
	product := kilograms * policy.cents
	if product > ^uint64(0)-policy.baseCents {
		return 0, errFeeOverflow
	}
	return policy.baseCents + product, nil
}

// ShippingService calculates shipping fees from the configured rates.
type ShippingService struct {
	flat   flatRate    // Pricing strategy of the flat rate.
	weight perKilogram // Pricing strategy of charging by weight.
}

// NewShippingService creates a shipping fee service from the rate settings.
func NewShippingService(config ShippingConfig) *ShippingService {
	return &ShippingService{
		flat:   flatRate{cents: config.FlatCents},
		weight: perKilogram{baseCents: config.WeightBaseCents, cents: config.PerKilogramCents},
	}
}

// ShippingFee calculates the shipping fee of the delivery method that the order selects, in cents.
//
//   - It returns an error when the delivery method is unknown, or when the result exceeds the range of the return type.
func (service *ShippingService) ShippingFee(order ShippingOrder) (uint64, error) {
	var policy shippingPolicy
	switch order.Method {
	case "flat":
		policy = service.flat
	case "weight":
		policy = service.weight
	default:
		return 0, fmt.Errorf("unknown delivery method: %s", order.Method)
	}
	return policy.Fee(order.Kilograms)
}
```

- Both create the service with `NewShippingService(config)` and run it with `service.ShippingFee(order)`. The public types, the way of creation, the input meanings, the results, and the errors all stay the same. The strategies are an implementation detail.
- A zero-value `ShippingService` returns `0, nil` for either known delivery method before and after the change.

- With `FlatCents` `50`, `PerKilogramCents` `20`, and `WeightBaseCents` `0`, a `"flat"` order of three kilograms returns `50, nil` before and after, and a `"weight"` order of three kilograms returns `60, nil`. At zero kilograms they return `50, nil` and `0, nil`. When the base fee of charging by weight is `10`, the results of charging by weight above become `70, nil` and `10, nil`.

- With the delivery method `"drone"`, both return `0` and an error with the message `unknown delivery method: drone`. An overflow in the multiplication or in the addition returns `0` and an error with the message `shipping fee overflow`, e.g. a price of `20` per kilogram with `^uint64(0)` kilograms, or a base fee of `^uint64(0)` with one kilogram at a price of `1` per kilogram. After the change, these calculations live only in `perKilogram.Fee`.

- Adding an algorithm changes only the selection and the assembly inside the service; existing callers do not choose a strategy object.
