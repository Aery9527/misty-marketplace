# Branching Examples

- These examples use Go; adapt the syntax and input types to the target language.

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

- The following are illustrative refactorings. For each pair, put the shared declarations first in one file, followed by either the before or the after implementation. The two implementations are alternatives. In these examples, construction and execution calls stay unchanged while private fields, internal assembly, and operation internals change.

## Dispatch Table

- The project explicitly requires more built-in commands using the existing output dependency. Move command-handler associations from a private switch to an internal table. New commands change internal registration rather than `Run`; public construction and execution calls stay the same.

- Shared declarations:

```go
import (
	"context"
	"fmt"
	"io"
)

// ping writes the command's liveness reply.
func ping(ctx context.Context, output io.Writer) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	_, err := fmt.Fprintln(output, "pong")
	return err
}

// status writes the command's readiness reply.
func status(ctx context.Context, output io.Writer) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	_, err := fmt.Fprintln(output, "ready")
	return err
}
```

- Before: select each built-in command in `Run`.

```go
// Dispatcher executes built-in commands using the configured output.
type Dispatcher struct {
	output io.Writer // Initialized destination for command replies.
}

// NewDispatcher initializes command execution with its output destination.
//
//   - output must be an initialized, non-nil writer.
func NewDispatcher(output io.Writer) *Dispatcher {
	return &Dispatcher{output: output}
}

// Run executes the built-in command identified by name.
//
//   - The dispatcher must have been initialized by NewDispatcher.
func (dispatcher *Dispatcher) Run(ctx context.Context, name string) error {
	var err error
	switch name {
	case "ping":
		err = ping(ctx, dispatcher.output)
	case "status":
		err = status(ctx, dispatcher.output)
	default:
		return fmt.Errorf("unknown command: %s", name)
	}
	if err != nil {
		return fmt.Errorf("run %s: %w", name, err)
	}
	return nil
}
```

- After: keep command selection data in the dispatcher; execution callers supply the same command name.

```go
// commandHandler performs one command using the configured output.
type commandHandler func(context.Context, io.Writer) error

// Dispatcher executes built-in commands using the configured output.
type Dispatcher struct {
	output   io.Writer                 // Initialized destination for command replies.
	handlers map[string]commandHandler // Built-in behaviors indexed by command name.
}

// NewDispatcher initializes command execution with its output destination.
//
//   - output must be an initialized, non-nil writer.
func NewDispatcher(output io.Writer) *Dispatcher {
	return &Dispatcher{
		output: output,
		handlers: map[string]commandHandler{
			"ping":   ping,
			"status": status,
		},
	}
}

// Run executes the built-in command identified by name.
//
//   - The dispatcher must have been initialized by NewDispatcher.
func (dispatcher *Dispatcher) Run(ctx context.Context, name string) error {
	handler := dispatcher.handlers[name]
	if handler == nil {
		return fmt.Errorf("unknown command: %s", name)
	}
	if err := handler(ctx, dispatcher.output); err != nil {
		return fmt.Errorf("run %s: %w", name, err)
	}
	return nil
}
```

- In both versions, construct with `dispatcher := NewDispatcher(output)` and execute with `err := dispatcher.Run(ctx, "ping")`. `ping` writes `"pong\n"`; `status` writes `"ready\n"`. An unregistered `missing` returns `unknown command: missing` without writing.

- If the context is already canceled, `ping` writes nothing and returns an error wrapping `context.Canceled` with `run ping: ` context. Output failures retain their error chain with the same command context in both versions.

## Strategy

- The project explicitly requires more delivery-pricing algorithms, each with its own settings. Weight-based pricing combines an initial charge with a per-kilogram rate; flat pricing uses a per-delivery charge. Encapsulate each algorithm's settings and calculation behind a shared internal pricing contract. The service still selects a policy per order using the existing delivery-method field; a small selection branch may remain.

- Shared declarations: all rate settings and kilograms may be zero. An unknown method returns an error; a weight-based charge that exceeds the result type also returns an error.

```go
import "fmt"

// ShippingConfig contains the existing rates for delivery methods.
type ShippingConfig struct {
	WeightBaseCents  uint64 // Initial charge for weight-based delivery, in cents; zero is valid.
	FlatCents        uint64 // Charge per flat-rate delivery, in cents; zero is valid.
	PerKilogramCents uint64 // Charge per whole kilogram, in cents; zero is valid.
}

// ShippingOrder contains the delivery choice and weight for one quote.
type ShippingOrder struct {
	Method    string // Delivery method: "flat" or "weight".
	Kilograms uint64 // Weight in whole kilograms; zero is valid.
}
```

- Before: select the delivery method and calculate its charge in the service.

```go
// ShippingService calculates delivery charges using configured rates.
type ShippingService struct {
	config ShippingConfig // Rates selected when the service is initialized.
}

// NewShippingService initializes delivery pricing from its rate configuration.
func NewShippingService(config ShippingConfig) *ShippingService {
	return &ShippingService{config: config}
}

// ShippingFee quotes the order's selected delivery method.
func (service *ShippingService) ShippingFee(order ShippingOrder) (uint64, error) {
	switch order.Method {
	case "flat":
		return service.config.FlatCents, nil
	case "weight":
		rate := service.config.PerKilogramCents
		if rate != 0 && order.Kilograms > ^uint64(0)/rate {
			return 0, fmt.Errorf("shipping fee overflow")
		}
		product := order.Kilograms * rate
		if product > ^uint64(0)-service.config.WeightBaseCents {
			return 0, fmt.Errorf("shipping fee overflow")
		}
		return service.config.WeightBaseCents + product, nil
	default:
		return 0, fmt.Errorf("unknown delivery method: %s", order.Method)
	}
}
```

- After: initialize private strategies from the same configuration. Keep selection inside the service; the caller supplies the existing order data.

```go
// shippingPolicy encapsulates one configured delivery-pricing algorithm.
type shippingPolicy interface {
	// Fee quotes a weight, returning an error if the charge cannot be represented.
	Fee(kilograms uint64) (uint64, error)
}

// flatRate applies one configured charge to the entire delivery.
type flatRate struct {
	cents uint64 // Charge per delivery, in cents.
}

// Fee returns the configured delivery charge.
func (policy flatRate) Fee(_ uint64) (uint64, error) {
	return policy.cents, nil
}

// perKilogram combines an initial charge with weight-based pricing.
type perKilogram struct {
	baseCents uint64 // Initial charge per delivery, in cents.
	cents     uint64 // Charge per whole kilogram, in cents.
}

// Fee calculates the weight-based charge, rejecting an unrepresentable result.
func (policy perKilogram) Fee(kilograms uint64) (uint64, error) {
	if policy.cents != 0 && kilograms > ^uint64(0)/policy.cents {
		return 0, fmt.Errorf("shipping fee overflow")
	}
	product := kilograms * policy.cents
	if product > ^uint64(0)-policy.baseCents {
		return 0, fmt.Errorf("shipping fee overflow")
	}
	return policy.baseCents + product, nil
}

// ShippingService calculates delivery charges using configured rates.
type ShippingService struct {
	flat   flatRate    // Configured pricing for flat-rate deliveries.
	weight perKilogram // Configured pricing for weight-based deliveries.
}

// NewShippingService initializes delivery pricing from its rate configuration.
func NewShippingService(config ShippingConfig) *ShippingService {
	return &ShippingService{
		flat:   flatRate{cents: config.FlatCents},
		weight: perKilogram{baseCents: config.WeightBaseCents, cents: config.PerKilogramCents},
	}
}

// ShippingFee quotes the order's selected delivery method.
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

- In both versions, construct with `service := NewShippingService(config)` and execute with `fee, err := service.ShippingFee(order)`. Public types, construction, input meanings, results, and errors stay the same. The strategies are implementation details.

- With `FlatCents: 50`, `PerKilogramCents: 20`, and `WeightBaseCents: 0`, both versions return `50, nil` for a three-kilogram `"flat"` order and `60, nil` for a three-kilogram `"weight"` order. At zero kilograms, the results are respectively `50, nil` and `0, nil`. If the weight-based initial charge is `10`, those weight-based results become `70, nil` and `10, nil`. With all rate settings zero, valid methods return zero charges.

- Both versions return `0` with `unknown delivery method: drone` for method `"drone"`. Both multiplication and addition overflow return `0` with `shipping fee overflow`: for example, a rate of `20` with `^uint64(0)` kilograms, or an initial charge of `^uint64(0)` plus one kilogram at a rate of `1`. In the after version, these checks live only in `perKilogram.Fee`.

- New algorithms may require changes to internal selection and assembly; existing operation callers need not choose strategy objects. If initialization needs new required settings, inspect their construction and loading sources and apply the compatibility handling in [Change Rules](../SKILL.md#change-rules).
