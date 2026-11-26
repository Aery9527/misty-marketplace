# Declaration Comment Examples

- These examples use Go; adapt the syntax and types to the target language.
- The comment forms that the example shows: a comment above the declaration describes a type or a function; a trailing comment describes a field of a struct; the comment of a function describes its parameters; when the summary and the supplementary points make two or more independent points, the supplementary points are a list.
- When the name and the type of every parameter show all that a caller needs, the comment does not describe the parameters, e.g. `message` of `Sender.Send`.
- A method that implements an interface method, and has no behavior or constraint specific to this implementation, has one line that names the interface; the comment of the interface states the contract, e.g. `WriterSender.Send`.

```go
import (
	"fmt"
	"io"
)

// Message is the content and the destination of one SMS delivery.
type Message struct {
	Phone string // Taiwan mobile number, format XXXX-XXX-XXX, e.g. "0909-878-787".
	Text  string // Content that the recipient sees, e.g. "Your pickup code is 123456".
}

// Sender sends SMS messages through the configured transport service.
type Sender interface {
	// Send submits one message to the transport service for delivery to the recipient.
	//
	//   - A nil return means that the transport service accepted the message.
	//   - It returns an error when the transport service does not accept the message.
	Send(message Message) error
}

// WriterSender writes SMS messages to the given output, for viewing during local development.
type WriterSender struct {
	out io.Writer // Output that the SMS messages are written to.
}

// NewWriterSender creates a sender with the given output.
//
//   - out is the output that the SMS messages are written to, and must be a non-nil value.
func NewWriterSender(out io.Writer) *WriterSender {
	return &WriterSender{out: out}
}

// Send implements Sender.
func (sender *WriterSender) Send(message Message) error {
	_, err := fmt.Fprintf(sender.out, "%s %s\n", message.Phone, message.Text)
	return err
}

// PickupNotifier notifies a recipient of a pickup code by SMS.
type PickupNotifier struct {
	sender Sender // SMS transport service.
}

// NewPickupNotifier creates a notifier with the given transport service.
//
//   - sender is the SMS transport service, and must be a non-nil value.
func NewPickupNotifier(sender Sender) *PickupNotifier {
	return &PickupNotifier{sender: sender}
}

// NotifyPickupCode notifies the recipient of the pickup code.
//
//   - Precondition: the caller has verified the formats of phone and code.
//   - Precondition: the caller must have confirmed that phone is the number that the recipient registered; this function does not look up the recipient.
//   - It returns an error when the transport service does not accept the message.
//   - phone is a Taiwan mobile number, format XXXX-XXX-XXX, e.g. "0909-878-787".
//   - code is the pickup code, 6 digits, e.g. "123456".
func (notifier *PickupNotifier) NotifyPickupCode(phone, code string) error {
	return notifier.sender.Send(Message{Phone: phone, Text: "Your pickup code is " + code})
}
```
