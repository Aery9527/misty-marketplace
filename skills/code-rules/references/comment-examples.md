# Declaration Comment Examples

- These examples use Go; adapt the syntax and input types to the target language.

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
