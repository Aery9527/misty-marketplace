# 宣告註解範例

- 以下範例使用 Go，請依目標語言調整語法與輸入型別。

```go
import "strings"

// Message 表示一次簡訊發送的內容與目的地。
type Message struct {
	Phone string // 台灣手機號碼，格式 XXXX-XXX-XXX，例如 "0909-878-787"。
	Text  string // 收件人看到的內容，例如 "Your pickup code is 123456"。
}

// Sender 透過已設定的傳輸服務發送簡訊。
type Sender interface {
	// Connect 建立可供發送簡訊的連線。
	Connect() error

	// Send 將一則訊息提交給傳輸服務，供其發送至收件人。
	//
	//   - 首次呼叫前，Connect 必須成功。
	//   - 回傳 nil 表示傳輸服務已接受該訊息。
	Send(message Message) error
}

// HasContent 判斷文字是否可作為非空白的訊息內容。
// 例如：HasContent(" Ready ") 回傳 true；HasContent("   ") 回傳 false。
func HasContent(text string) bool {
	return strings.TrimSpace(text) != ""
}
```
