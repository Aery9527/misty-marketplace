---
name: code-rules
description: >-
  可維護程式碼的具體實作規則。在撰寫、修改、重構或審查程式碼時載入，
  涵蓋變更邊界、錯誤處理、註解、log 與工具使用。
  優先遵循專案與語言的既有慣例；較高層次的設計取捨使用 `arch-rules`。
---

# Code Rules

- 規範的優先順序必須為：專案明文規範、現有專案程式碼中一致的慣例、語言慣例，最後才是以下規則。設計層面的取捨使用 `arch-rules`。

- 以下規則與語言無關。範例使用 Go，請依目標語言調整語法與輸入型別。

## 變更原則

- 改變行為前，必須先讀直接 caller、覆蓋受影響行為的測試與所在模組，確認現有契約。
- 撰寫程式碼前，必須先說明預期行為與驗證方式；有相容性限制時才補充。
- 一次變更只做一件事。嚴禁把無關的清理混進行為變更；清理另開 commit。
- 不論參數多少，都必須檢視函式職責、輸入含意與契約。參數多是設計警訊；僅憑數量不能判定函式有多個職責。
- 自行設計的函式，業務參數嚴禁超過 3 個，不計執行脈絡與隱含接收物件。既有的外部固定簽名必須維持原簽名與契約。超過上限時：
    - 輸入服務可分別使用的獨立能力：拆分函式；業務流程函式可以協調這些能力，若協調本身就是其職責。
    - 同一操作需要多個資料欄位：使用語意對應該操作的輸入型別，承載必要資料與可選設定，也可包含影響行為的值。
- 既有領域型別若語意與契約合適，且未帶入大量無關資料，優先沿用。嚴禁用輸入物件掩蓋無關職責。
- 業務參數未超過 3 個時，輸入型別也可以讓函式更清楚。
- 必填業務輸入與有效範圍，必須在所有呼叫都會經過的操作邊界驗證。
    - 只拒絕契約不允許的值；`0`、`false` 與空字串並非一律無效。
    - 契約允許省略的值必須寫明預設。若省略與明確給零值有不同含意，輸入模型必須能區分。
    - 同一信任範圍內，嚴禁逐層機械地重複相同驗證。
- 新增必填資料會改變契約，不論該資料以個別參數或輸入型別承載。
- 只有明確需求或既有擴充點證明分支會持續新增時，才依行為採用分派表或 **Strategy Pattern**；否則保留 `if-else`／`switch`，嚴禁只為消除分支而提前抽象。

### 參數數量範例

- 同組資料：空間查詢接收四個邊界值與查詢點，共六個參數。四個邊界值會一起在儲存與查詢間傳遞，因此引入 `Bounds`，讓 `Contains` 保留三個參數。`ctx`、receiver 與回傳值均不計入數量。

```go
// Bounds 定義一個矩形搜尋範圍，包含其邊界。
type Bounds struct {
	MinX float64 // 搜尋範圍的左邊界。
	MaxX float64 // 搜尋範圍的右邊界。
	MinY float64 // 搜尋範圍的下邊界。
	MaxY float64 // 搜尋範圍的上邊界。
}

// Contains 判斷查詢點是否位於搜尋範圍內。
func Contains(bounds Bounds, x, y float64) bool {
	return x >= bounds.MinX && x <= bounds.MaxX &&
		y >= bounds.MinY && y <= bounds.MaxY
}
```

- 獨立操作：四個輸入分別供商品計價與運費估算使用，而兩個操作可分別請求。各自只使用兩個輸入，因此各自定義函式。這些內部計算接收操作入口已驗證的資料，乘積皆可由回傳型別表示。

```go
// Subtotal 依單價與數量計算商品金額，單位為分。
//
//   - 操作入口已驗證乘積可由回傳型別表示。
func Subtotal(unitCents, quantity uint64) uint64 {
	return unitCents * quantity
}

// ShippingCost 依整數公斤數估算運費，單位為分。
//
//   - 操作入口已驗證乘積可由回傳型別表示。
func ShippingCost(kilograms, centsPerKilogram uint64) uint64 {
	return kilograms * centsPerKilogram
}
```

- 多欄位、單一操作：建立會員使用姓名、email、電話、地址與語系。保留這個單一職責，以 `CreateMemberInput` 作為一個業務參數。本例要求 email 含非空白文字，語系為空字串時預設為 `zh-TW`，其他欄位原樣儲存。email 為空或全空白時回傳 `email required`，且不呼叫儲存服務。

```go
import (
	"fmt"
	"strings"
)

// CreateMemberInput 承載一位新會員的註冊資料。
type CreateMemberInput struct {
	Name    string // 會員顯示名稱。
	Email   string // 聯絡 email；本例為必填。
	Phone   string // 會員聯絡電話，原樣儲存。
	Address string // 會員聯絡地址，原樣儲存。
	Locale  string // 語系偏好；空字串使用 "zh-TW"。
}

// MemberStore 儲存已通過入口驗證的會員註冊資料。
type MemberStore interface {
	// Insert 儲存一位會員的註冊資料。
	Insert(input CreateMemberInput) error
}

// MemberService 透過已設定的儲存服務建立會員資料。
type MemberService struct {
	Store MemberStore // 已完成初始化的會員資料儲存服務。
}

// CreateMember 先驗證註冊資料，再請求儲存。
//
//   - Email 必須含非空白文字；無效輸入不會送到儲存服務。
//   - Locale 為空字串時使用 "zh-TW"。
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

### 分支選擇範例

- 固定情況：需求只定義 active 與 paused 兩種狀態標籤，未知值顯示 `Unknown`，因此保留 `switch`。

```go
// StatusLabel 提供帳號狀態的顯示標籤。
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

- 分派表：專案明確要求持續增加 plugin 命令，由 plugin 在啟動時依相同的呼叫契約註冊處理函式。新增命令時，在 `handlers` 增加命令與處理函式的對應，`Run` 維持不變。

```go
import (
	"context"
	"fmt"
)

// CommandHandler 執行一個已註冊的命令。
type CommandHandler func(context.Context) error

// Run 執行 name 所對應的已註冊處理函式。
func Run(ctx context.Context, name string, handlers map[string]CommandHandler) error {
	handler := handlers[name]
	if handler == nil {
		return fmt.Errorf("unknown command: %s", name)
	}
	if err := handler(ctx); err != nil {
		return fmt.Errorf("run %s: %w", name, err)
	}
	return nil
}
```

- Strategy：專案明確要求持續增加運費演算法，各有自己的設定，並在執行期依訂單選用政策，因此使用 `ShippingPolicy`。重量三公斤時，固定收費 50 分的結果為 50 分；每公斤 20 分的結果為 60 分。操作入口會驗證選定政策與其數值輸入，確保運費可由回傳型別表示。

```go
// ShippingPolicy 計算一張訂單的運費。
type ShippingPolicy interface {
	// Fee 回傳整數公斤數所對應的運費，單位為分。
	Fee(kilograms uint64) uint64
}

// FlatRate 為整次配送套用已設定的固定費用。
type FlatRate struct {
	Cents uint64 // 每次配送的費用，單位為分。
}

// Fee 回傳已設定的配送費用。
func (policy FlatRate) Fee(_ uint64) uint64 {
	return policy.Cents
}

// PerKilogram 依配送重量與已設定的單價計費。
type PerKilogram struct {
	Cents uint64 // 每整數公斤的費用，單位為分。
}

// Fee 計算依重量計價的配送費用，單位為分。
//
//   - 操作入口已驗證乘積可由回傳型別表示。
func (policy PerKilogram) Fee(kilograms uint64) uint64 {
	return policy.Cents * kilograms
}

// ShippingFee 套用訂單選定的運費政策。
//
//   - policy 必須是為該訂單完成初始化的非 nil 政策。
//   - 操作入口已驗證計算所需的數值範圍。
func ShippingFee(policy ShippingPolicy, kilograms uint64) uint64 {
	return policy.Fee(kilograms)
}
```

## 錯誤原則

- 嚴禁吞掉錯誤、回傳假成功，或在契約未定義 fallback 時靜默降級。
- 只在能恢復、能轉換為邊界契約、或能決定最終結果的地方處理錯誤；其他地方附加上下文後傳遞給上層。
- 同一個失敗只 log 一次，由決定最終結果的那一層負責。嚴禁每層都 log 又往上拋。

## 註解原則

- 描述高階用途、資料含意、契約、限制與取捨。嚴禁逐步描述實作。
- 註解有兩個以上獨立要點時，必須用清單結構，而非文章式的描述。
- 修改歷史只記於 commit message，嚴禁寫入程式碼註解。
- 每個型別、func 與 field 都必須有精簡註解，提供用途或含意的高階概覽。
    - struct 註解必須說明職責與範圍。優先描述所負責的功能；不負責的功能由流程或模組邊界表達。
    - field 與 args 的註解必須說明資料含意，若有固定格式則必須提供範例。
    - func 註解必須補充確實存在、影響正確使用或修改，且函式名稱或宣告型別（含 receiver、參數與回傳型別）未充分表達的前置條件、呼叫時序限制與跨模組契約；無此類限制時省略這些補充項目。嚴禁只為重述呼叫關係而列出 caller 或 callee。

- 宣告註解範例：

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

## log 原則

- 每一個資訊必須有其追溯的意義，可於事後追蹤、統計、分析或除錯。對上述行為毫無幫助的資訊嚴禁寫入 log。
- 每一條 log 必須能追溯到唯一的程式碼位置：訊息本身唯一，或 logger 自動附加來源位置皆可。
- log 必須採精簡結構，嚴禁文章式描述。有專案結構化欄位慣例時必須沿用；否則採固定順序的位置式格式，例如 `Enter {AGE} {NAME} "{MSG}"`。欄位含意由程式碼位置定義。
- 只為統計而寫的 log 必須預先聚合，再定時或定次輸出，例如累計請求數後每 5s 寫 `Request ALL 123`，而非逐筆寫入事件。
    - 若無法容許遺失尚未輸出的區間資料，則逐筆記錄，並允許由這些 log 事後統計。
    - 已因診斷或稽核需求保留的事件 log，可重用於統計。
- 若專案沒有 level 政策：`DEBUG` 用於除錯、`INFO` 記錄有意義的生命週期事件、`WARN` 記錄可恢復的降級、`ERROR` 記錄需要人處理的失敗結果。
- 嚴禁傾倒整個 request、response 或物件。payload 大小與欄位數量依專案上限；無上限時只記錄選定欄位。

## 執行覺察

- 處理程式碼或 HTML 時，若宿主提供 `LSP` 工具且支援該語言，必須優先使用，讓查找與修改依照真正的程式 symbol；否則以文字工具處理。
- 網頁與 CSS 的顏色必須以 `OKLCH` 定義。其他視覺輸出（例如 ppt）以 OKLCH 挑色，再轉換為目標格式支援的色彩空間。
