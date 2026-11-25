# Parameter Count Examples

- These examples use Go; adapt the syntax and types to the target language.
- Each section is a refactoring scenario for teaching: the implementation before the change comes first, then the assessment and the implementation after the change. The two implementations are alternatives, and declarations of the same name do not exist together. In a section with shared declarations, both implementations use them.

## Data of One Group

- A spatial query tells whether a query point lies inside a rectangular search area, from four boundary values and the two coordinates of the query point.

- Before: `Contains` takes six parameters.

```go
// Contains tells whether the query point lies inside the rectangular search area, boundaries included.
//
//   - minX and maxX are the left and right boundaries of the search area.
//   - minY and maxY are the lower and upper boundaries of the search area.
//   - x and y are the coordinates of the query point.
func Contains(minX, maxX, minY, maxY, x, y float64) bool {
	return x >= minX && x <= maxX && y >= minY && y <= maxY
}
```

- Assessment: the four boundary values describe one search area, and they pass together between storage and queries; `Contains` has the single responsibility of this check. So `Bounds` wraps the four boundary values, and the function is not split.

- After: `Contains` takes `Bounds` and the two coordinates of the query point, three parameters in all. The logic of the check stays in the function `Contains`, and `Bounds` declares only fields; only the way of passing the parameters changes.

```go
// Bounds is a rectangular search area, boundaries included.
type Bounds struct {
	MinX float64 // Left boundary of the search area.
	MaxX float64 // Right boundary of the search area.
	MinY float64 // Lower boundary of the search area.
	MaxY float64 // Upper boundary of the search area.
}

// Contains tells whether the query point lies inside the search area.
//
//   - bounds is the search area.
//   - x and y are the coordinates of the query point.
func Contains(bounds Bounds, x, y float64) bool {
	return x >= bounds.MinX && x <= bounds.MaxX &&
		y >= bounds.MinY && y <= bounds.MaxY
}
```

## Independent Operations

- Pricing the goods and estimating the shipping cost each use two inputs, and the two operations can be requested separately.

- Before: `Total` takes four parameters and returns the sum of the goods amount and the shipping cost.

```go
// Total calculates the sum of the goods amount and the shipping cost, in cents.
//
//   - Precondition: the operation entry point has verified that the sum fits the return type.
//   - When only one of the two amounts is needed, pass 0 for the two parameters of the other.
//   - unitCents is the unit price of the goods, in cents; quantity is the number of units bought.
//   - kilograms is the weight in whole kilograms; centsPerKilogram is the shipping cost per kilogram, in cents.
func Total(unitCents, quantity, kilograms, centsPerKilogram uint64) uint64 {
	return unitCents*quantity + kilograms*centsPerKilogram
}
```

- Assessment: the goods amount and the shipping cost are each a calculation with its own meaning, and each can be needed alone; `Total` writes them together, so they can only be calculated together. `unitCents` and `quantity` serve only the goods amount, and `kilograms` and `centsPerKilogram` serve only the shipping cost, so a caller that needs only the shipping cost has to write `Total(0, 0, kilograms, centsPerKilogram)`, passing `0` for the parameters it does not use. So the function is split into two, and the four parameters are not wrapped in one type; after wrapping, the two calculations would still be tied together, and the caller would still fill `0` into the fields it does not use.

- After: each function takes only the two parameters that it uses; a caller that needs the sum adds the two results, and the precondition from before the change, that the sum fits the return type, becomes the responsibility of the operation entry point that needs the sum. Both are internal calculations that take data the operation entry point has verified.

```go
// Subtotal calculates the goods amount from the unit price and the quantity, in cents.
//
//   - Precondition: the operation entry point has verified that the product fits the return type.
//   - unitCents is the unit price of the goods, in cents; quantity is the number of units bought.
func Subtotal(unitCents, quantity uint64) uint64 {
	return unitCents * quantity
}

// ShippingCost estimates the shipping cost from the weight in whole kilograms, in cents.
//
//   - Precondition: the operation entry point has verified that the product fits the return type.
//   - kilograms is the weight in whole kilograms; centsPerKilogram is the shipping cost per kilogram, in cents.
func ShippingCost(kilograms, centsPerKilogram uint64) uint64 {
	return kilograms * centsPerKilogram
}
```

## Many Fields, One Operation

- Creating a member uses a name, an email, a phone, an address, and a locale. When the name or the email is an empty string or all whitespace, the operation returns the error `name required` or `email required` and does not call the store; an empty locale becomes `zh-TW`; the other fields are stored as given. The behavior is the same before and after the change.

- Shared declarations:

```go
import (
	"fmt"
	"strings"
)

// defaultLocale is the locale used when none is given.
const defaultLocale = "zh-TW"

// MemberService creates member records through a store.
type MemberService struct {
	store MemberStore // Store of member records.
}

// NewMemberService creates a member service with the given store.
//
//   - store is the store of member records, and must be a non-nil value.
func NewMemberService(store MemberStore) *MemberService {
	return &MemberService{store: store}
}

// requireText checks that a required text field holds non-whitespace text.
//
//   - value is the value of the field; field is the field name, used in the error message, e.g. "email".
//   - When value is an empty string or all whitespace, it returns an error whose message is the field name followed by " required".
func requireText(value, field string) error {
	if strings.TrimSpace(value) == "" {
		return fmt.Errorf("%s required", field)
	}
	return nil
}
```

- Before: `CreateMember` and `Insert` each take five parameters.

```go
// MemberStore stores member registration data that has passed the entry validation.
type MemberStore interface {
	// Insert stores the registration data of one member.
	//
	//   - name is the display name of the member, e.g. "Amy Wang".
	//   - email is the contact email, e.g. "amy@example.com".
	//   - phone is the contact phone of the member, e.g. "0909-878-787".
	//   - address is the contact address of the member, e.g. "1 Songren Road, Xinyi District, Taipei".
	//   - locale is the resolved locale, e.g. "en-US".
	Insert(name, email, phone, address, locale string) error
}

// CreateMember validates the registration data, then requests storage.
//
//   - Registration data with an invalid name or email does not reach the store.
//   - When no locale is given, the stored locale is "zh-TW".
//   - name is the display name of the member, required, with non-whitespace text, e.g. "Amy Wang".
//   - email is the contact email, required, with non-whitespace text, e.g. "amy@example.com".
//   - phone is the contact phone of the member, optional, stored as given, e.g. "0909-878-787".
//   - address is the contact address of the member, optional, stored as given, e.g. "1 Songren Road, Xinyi District, Taipei".
//   - locale is the locale preference, optional, e.g. "en-US"; an empty string becomes "zh-TW".
func (service *MemberService) CreateMember(name, email, phone, address, locale string) error {
	if err := requireText(name, "name"); err != nil {
		return err
	}
	if err := requireText(email, "email"); err != nil {
		return err
	}
	if locale == "" {
		locale = defaultLocale
	}
	if err := service.store.Insert(name, email, phone, address, locale); err != nil {
		return fmt.Errorf("create member: %w", err)
	}
	return nil
}
```

- Assessment: the five parameters are all the registration data of one member, and all serve the single operation of creating a member; no caller needs only a part of them, so the function is not split. The five parameters pass together from `MemberService` to `MemberStore`, and the two signatures repeat the same parameters; when the registration data gains a field, both signatures change. So `MemberRegistration` wraps them.

- After: `MemberRegistration` is the only parameter, and this type states in one place whether each field is required and what its default is.

```go
// MemberRegistration is the registration data of one new member.
type MemberRegistration struct {
	Name    string // Display name of the member, required, with non-whitespace text, e.g. "Amy Wang".
	Email   string // Contact email, required, with non-whitespace text, e.g. "amy@example.com".
	Phone   string // Contact phone of the member, optional, stored as given, e.g. "0909-878-787".
	Address string // Contact address of the member, optional, stored as given, e.g. "1 Songren Road, Xinyi District, Taipei".
	Locale  string // Locale preference, optional, e.g. "en-US"; an empty string becomes "zh-TW".
}

// MemberStore stores member registration data that has passed the entry validation.
type MemberStore interface {
	// Insert stores the registration data of one member.
	//
	//   - registration is registration data that has passed validation and has a resolved locale.
	Insert(registration MemberRegistration) error
}

// CreateMember validates the registration data, then requests storage.
//
//   - Registration data with an invalid name or email does not reach the store.
//   - When no locale is given, the stored locale is "zh-TW".
//   - registration is the registration data of the new member.
func (service *MemberService) CreateMember(registration MemberRegistration) error {
	if err := requireText(registration.Name, "name"); err != nil {
		return err
	}
	if err := requireText(registration.Email, "email"); err != nil {
		return err
	}
	if registration.Locale == "" {
		registration.Locale = defaultLocale
	}
	if err := service.store.Insert(registration); err != nil {
		return fmt.Errorf("create member: %w", err)
	}
	return nil
}
```

- `registration` is passed by value, so `CreateMember` changes its own copy when it fills in the default locale, and the caller's data stays unchanged.
