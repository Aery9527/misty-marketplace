# Declaration Comment Examples

- These examples use Go; adapt the syntax and types to the target language.
- The comment forms that the example shows: a comment above the declaration describes a type or a function; a trailing comment describes a field of a struct; the comment of a function describes its parameters; when the summary and the supplementary points make two or more independent points, the supplementary points are a list.

```go
// Message is the content and the destination of one SMS delivery.
type Message struct {
	Phone string // Taiwan mobile number, format XXXX-XXX-XXX, e.g. "0909-878-787".
	Text  string // Content that the recipient sees, e.g. "Your pickup code is 123456".
}

// Sender sends SMS messages through the configured transport service.
type Sender interface {
	// Connect opens a connection that can send SMS messages.
	//
	//   - It returns an error when the transport service cannot be reached.
	Connect() error

	// Send submits one message to the transport service for delivery to the recipient.
	//
	//   - Connect must succeed before the first call.
	//   - A nil return means that the transport service accepted the message.
	//   - message is the message to send.
	Send(message Message) error
}

// PickupNotifier notifies a recipient of a pickup code by SMS.
type PickupNotifier struct {
	sender Sender // Connected SMS transport service.
}

// NewPickupNotifier creates a notifier with the given transport service.
//
//   - Precondition: the caller must have connected sender successfully.
//   - sender is the SMS transport service, and must be a non-nil value.
func NewPickupNotifier(sender Sender) *PickupNotifier {
	return &PickupNotifier{sender: sender}
}

// NotifyPickupCode notifies the recipient of the pickup code.
//
//   - Precondition: the caller has verified the formats of phone and code.
//   - It returns an error when the transport service does not accept the message.
//   - phone is a Taiwan mobile number, format XXXX-XXX-XXX, e.g. "0909-878-787".
//   - code is the pickup code, 6 digits, e.g. "123456".
func (notifier *PickupNotifier) NotifyPickupCode(phone, code string) error {
	return notifier.sender.Send(Message{Phone: phone, Text: "Your pickup code is " + code})
}
```
