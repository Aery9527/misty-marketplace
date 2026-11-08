# Parameter Count Examples

- These examples use Go; adapt the syntax and input types to the target language.

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
