# 宣告註解範例

- 以下範例使用 Go，請依目標語言調整語法與型別。
- 範例示範的註解形式：型別與函式以宣告上方的註解說明；struct 的 field 以行尾註解說明；函式的參數在函式的註解內說明；摘要加上補充要點共有兩個以上獨立要點時，補充要點以清單列出。

```go
// Message 是一次簡訊發送的內容與目的地。
type Message struct {
	Phone string // 台灣手機號碼，格式 XXXX-XXX-XXX，例如 "0909-878-787"。
	Text  string // 收件人看到的內容，例如 "Your pickup code is 123456"。
}

// Sender 透過已設定的傳輸服務發送簡訊。
type Sender interface {
	// Connect 建立可供發送簡訊的連線。
	//
	//   - 無法連上傳輸服務時回傳錯誤。
	Connect() error

	// Send 將一則訊息提交給傳輸服務，供其發送至收件人。
	//
	//   - 首次呼叫前，Connect 必須成功。
	//   - 回傳 nil 表示傳輸服務已接受該訊息。
	//   - message 是要發送的訊息。
	Send(message Message) error
}

// PickupNotifier 以簡訊通知收件人取件碼。
type PickupNotifier struct {
	sender Sender // 已連線的簡訊傳輸服務。
}

// NewPickupNotifier 以指定的傳輸服務建立通知服務。
//
//   - 前置條件：呼叫端必須已讓 sender 連線成功。
//   - sender 是簡訊傳輸服務，必須是非 nil 的值。
func NewPickupNotifier(sender Sender) *PickupNotifier {
	return &PickupNotifier{sender: sender}
}

// NotifyPickupCode 通知收件人取件碼。
//
//   - 前置條件：呼叫端已驗證 phone 與 code 的格式。
//   - 傳輸服務未接受該訊息時回傳錯誤。
//   - phone 是台灣手機號碼，格式 XXXX-XXX-XXX，例如 "0909-878-787"。
//   - code 是取件碼，6 位數字，例如 "123456"。
func (notifier *PickupNotifier) NotifyPickupCode(phone, code string) error {
	return notifier.sender.Send(Message{Phone: phone, Text: "Your pickup code is " + code})
}
```
