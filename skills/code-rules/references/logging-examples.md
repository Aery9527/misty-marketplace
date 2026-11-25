# Logging Examples

- These examples use `log` of the Go standard library; adapt them to the target language and the log API of the project.
- Each section is a scenario: the way before the change comes first, then the way after the change. A code block of one line is a statement inside a function, not a complete file.
- With its default settings, `log` puts the date and the time before each message; the formats described below are the message itself.

## Fixed Field Positions

- When a request enters the handler, the code logs the age, the name, and the message; the project has no structured-field convention. This example treats the entry of a request as a lifecycle event of that request; when the log API of the project has levels, log it at `INFO`.

- Before: prose, and each log line repeats the description of the fields.

```go
log.Printf("User %s whose age is %d entered and said %q", name, age, message)
```

- After: the fixed field positions `Enter {AGE} {NAME} "{MSG}"`. Fixed field positions let AI interpret the values against the source code, and reduce the log space and tokens spent on repeated descriptions.

```go
log.Printf("Enter %d %s %q", age, name, message)
```

## Request Count Statistics

- `Enter {AGE} {NAME} "{MSG}"` at the handler is one event for each request that enters. These events serve only to count requests, and losing the counts not yet written is acceptable.

- Before: each request writes one `Enter` record, and the count is derived from these records afterward.

```go
log.Printf("Enter %d %s %q", age, name, message)
```

- After: the same entry point adds one to a counter for each request, and writes the count on a timer, e.g. `Request ALL 123` every 5 seconds, in place of one `Enter` record per request.
    - `ALL` means all requests at this entry point, not grouped by `AGE`, `NAME`, or `MSG`; `123` means that 123 requests arrived in that 5-second interval, and each interval is counted separately.
    - When the individual `Enter` records also serve diagnostics or auditing, keep those records; the statistics may be derived from them.

```go
import (
	"log"
	"sync/atomic"
)

// RequestCounter counts the requests that the handler receives, and writes the count per interval.
type RequestCounter struct {
	count atomic.Int64 // Number of requests received in the current interval.
}

// Increment records one received request.
func (counter *RequestCounter) Increment() {
	counter.count.Add(1)
}

// Flush writes the request count of the current interval, and starts the next interval.
//
//   - Call order: it must be called on a timer, e.g. once every 5 seconds.
//   - The requests received between two calls make one interval; each request counts in exactly one interval.
func (counter *RequestCounter) Flush() {
	log.Printf("Request ALL %d", counter.count.Swap(0))
}
```
