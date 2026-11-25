# 分支選擇範例

- 以下範例使用 Go，請依目標語言調整語法與型別。
- 每個章節是一個重構的教學情境：先列調整前的實作，再列判斷與調整後的實作；兩份實作互為替代方案，同名的宣告不會同時存在。有共同宣告的章節，共同宣告在調整前後都使用。
- 「固定情況」與「Strategy」是內部重構：調整前後的建立方式與執行呼叫相同，改變的只有內部實作。「分派表」因為新增跨模組擴充的需求而改變建立方式。

## 固定情況

- 需求只定義 active 與 paused 兩種狀態標籤，未知值顯示 `Unknown`；沒有需求顯示狀態會持續增加。

- 調整前：以 Strategy 與註冊表提供兩個固定的標籤。

```go
// statusLabel 提供一種帳號狀態的顯示標籤。
type statusLabel interface {
	// Label 回傳顯示標籤。
	Label() string
}

// activeLabel 是 active 狀態的標籤。
type activeLabel struct{}

// Label 回傳 active 狀態的顯示標籤。
func (activeLabel) Label() string {
	return "Active"
}

// pausedLabel 是 paused 狀態的標籤。
type pausedLabel struct{}

// Label 回傳 paused 狀態的顯示標籤。
func (pausedLabel) Label() string {
	return "Paused"
}

// statusLabels 是依狀態索引的標籤註冊表。
var statusLabels = map[string]statusLabel{
	"active": activeLabel{},
	"paused": pausedLabel{},
}

// StatusLabel 回傳帳號狀態的顯示標籤。
//
//   - status 是帳號狀態，例如 "active"。
//   - 未知的狀態回傳 "Unknown"。
func StatusLabel(status string) string {
	label, ok := statusLabels[status]
	if !ok {
		return "Unknown"
	}
	return label.Label()
}
```

- 判斷：兩個分支各只回傳一個固定的字串，沒有各自獨立的邏輯；需求也沒有顯示狀態會持續增加。`statusLabel`、兩個實作與註冊表沒有對應任何擴充需求，只增加閱讀成本。因此改回 `switch`。

- 調整後：`StatusLabel` 以 `switch` 直接列出兩種狀態。

```go
// StatusLabel 回傳帳號狀態的顯示標籤。
//
//   - status 是帳號狀態，例如 "active"。
//   - 未知的狀態回傳 "Unknown"。
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

- 前後都以 `StatusLabel(status)` 呼叫，結果相同：`"active"` 回傳 `"Active"`，`"paused"` 回傳 `"Paused"`，其他值回傳 `"Unknown"`。

## 分派表

- 核心模組提供命令執行器，各功能模組提供自己的命令：健康檢查模組提供 `ping`，部署模組提供 `status`。專案明確要求新增功能模組時不修改核心模組。
- 每個程式碼區塊是一個 package 的一個檔案；模組路徑以 `example.com/app` 為例。

- 調整前：核心模組的 `CommandDispatcher` 以 `switch` 列出各模組的命令，並直接呼叫各模組的函式。

```go
package health

// Ping 回傳存活回覆。
func Ping() string {
	return "pong\n"
}
```

```go
package deploy

// Status 回傳就緒回覆。
func Status() string {
	return "ready\n"
}
```

```go
package core

import (
	"fmt"
	"io"

	"example.com/app/deploy"
	"example.com/app/health"
)

// CommandDispatcher 執行各功能模組的命令。
type CommandDispatcher struct{}

// NewCommandDispatcher 建立命令執行器。
func NewCommandDispatcher() *CommandDispatcher {
	return &CommandDispatcher{}
}

// Run 執行 name 指定的命令，並把回覆寫到 output。
//
//   - 前置條件：output 必須是非 nil 的值。
//   - name 是命令名稱，例如 "ping"。
//   - output 是回覆的輸出目的地。
//   - 未知的名稱回傳錯誤，且不寫入輸出。
//   - 寫入失敗時回傳該錯誤。
func (dispatcher *CommandDispatcher) Run(name string, output io.Writer) error {
	var reply string
	switch name {
	case "ping":
		reply = health.Ping()
	case "status":
		reply = deploy.Status()
	default:
		return fmt.Errorf("unknown command: %s", name)
	}
	_, err := io.WriteString(output, reply)
	return err
}
```

- 判斷：命令由各功能模組提供，是開放集合。核心模組的 `switch` 必須列出每個模組的命令，並匯入它們的 package；新增功能模組時就要修改核心模組。因此命令名稱與處理者的對應由外部註冊：核心模組定義共同的 `CommandHandler`，各功能模組提供符合它的型別，在組裝時交給 `CommandDispatcher`，核心模組只相依 `CommandHandler`。

- 調整後：`NewCommandDispatcher` 把收到的命令建成以名稱索引的分派表，並驗證名稱；`Run` 由這份表找出命令。核心模組不再匯入功能模組。

```go
package core

import (
	"errors"
	"fmt"
	"io"
	"strings"
)

// CommandHandler 是一個可由名稱執行的命令。
type CommandHandler interface {
	// Name 回傳命令名稱，例如 "ping"。
	//
	//   - 名稱必須含非空白文字，且不與其他命令重複。
	Name() string

	// Run 執行命令並回傳回覆。
	Run() string
}

// CommandDispatcher 執行已註冊的命令。
type CommandDispatcher struct {
	handlers map[string]CommandHandler // 已註冊的命令，以命令名稱索引。
}

// NewCommandDispatcher 以各功能模組提供的命令建立命令執行器。
//
//   - 前置條件：handlers 的每個元素必須是非 nil 的值。
//   - handlers 是要註冊的命令。
//   - 建立後再修改這個 slice 不影響執行器。
//   - 名稱為空字串或全空白、或名稱重複時回傳錯誤。
func NewCommandDispatcher(handlers []CommandHandler) (*CommandDispatcher, error) {
	table := make(map[string]CommandHandler, len(handlers))
	for _, handler := range handlers {
		if err := register(table, handler); err != nil {
			return nil, err
		}
	}
	return &CommandDispatcher{handlers: table}, nil
}

// Run 執行 name 指定的命令，並把回覆寫到 output。
//
//   - 前置條件：output 必須是非 nil 的值。
//   - name 是命令名稱，例如 "ping"。
//   - output 是回覆的輸出目的地。
//   - 未註冊的名稱回傳錯誤，且不寫入輸出。
//   - 寫入失敗時回傳該錯誤。
func (dispatcher *CommandDispatcher) Run(name string, output io.Writer) error {
	handler, ok := dispatcher.handlers[name]
	if !ok {
		return fmt.Errorf("unknown command: %s", name)
	}
	_, err := io.WriteString(output, handler.Run())
	return err
}

// register 把一個命令加入分派表。
//
//   - 前置條件：table 必須是已建立的 map，handler 必須是非 nil 的值。
//   - table 是建立中的分派表；handler 是要加入的命令。
//   - 名稱為空字串或全空白、或名稱已在表中時回傳錯誤。
func register(table map[string]CommandHandler, handler CommandHandler) error {
	name := handler.Name()
	if strings.TrimSpace(name) == "" {
		return errors.New("command name required")
	}
	if _, exists := table[name]; exists {
		return fmt.Errorf("duplicate command: %s", name)
	}
	table[name] = handler
	return nil
}
```

```go
package health

// PingCommand 是健康檢查模組的存活命令。
type PingCommand struct{}

// Name 回傳命令名稱 "ping"。
func (PingCommand) Name() string {
	return "ping"
}

// Run 回傳存活回覆。
func (PingCommand) Run() string {
	return "pong\n"
}
```

```go
package deploy

// StatusCommand 是部署模組的就緒命令。
type StatusCommand struct{}

// Name 回傳命令名稱 "status"。
func (StatusCommand) Name() string {
	return "status"
}

// Run 回傳就緒回覆。
func (StatusCommand) Run() string {
	return "ready\n"
}
```

- 這是因為新增跨模組擴充的需求而改變邊界，建立方式因此不同：調整前以 `core.NewCommandDispatcher()` 建立；調整後由組裝處提供命令，並多回傳一個錯誤，例如 `core.NewCommandDispatcher([]core.CommandHandler{health.PingCommand{}, deploy.StatusCommand{}})`。執行呼叫都是 `dispatcher.Run("ping", output)`。

- 前後的結果相同：`ping` 寫入 `"pong\n"`；`status` 寫入 `"ready\n"`；未知的 `missing` 回傳訊息為 `unknown command: missing` 的錯誤，且不寫入輸出。

- 調整後，兩個命令的名稱相同時，`NewCommandDispatcher` 回傳訊息為 `duplicate command: ping` 的錯誤。新增功能模組的命令時，新增一個符合 `CommandHandler` 的型別並在組裝處提供；核心模組不必修改。Go 的 interface 由方法集合隱含滿足，功能模組不需要匯入核心模組。

## Strategy

- 專案明確要求持續增加各有設定的運費演算法。依重量計費使用起始費與公斤單價，固定費率則使用每次配送費用。以共同的內部計價契約封裝各演算法的設定與計算；服務仍依訂單既有的配送方式欄位逐筆選擇策略，可保留小段選擇分支。

- 共同宣告：兩個 struct 只宣告欄位。各項費率與公斤數的型別是無號整數，不會為負，允許為零。未知的配送方式回傳錯誤；依重量計費的結果超出回傳型別範圍時也回傳錯誤。

```go
import (
	"errors"
	"fmt"
)

// ShippingConfig 是各配送方式的費率設定。
type ShippingConfig struct {
	WeightBaseCents  uint64 // 依重量計費的起始費，單位為分；允許為零。
	FlatCents        uint64 // 固定費率配送的每次費用，單位為分；允許為零。
	PerKilogramCents uint64 // 每整數公斤的費用，單位為分；允許為零。
}

// ShippingOrder 是一次運費報價的配送方式與重量。
type ShippingOrder struct {
	Method    string // 配送方式："flat" 或 "weight"。
	Kilograms uint64 // 整數公斤數；允許為零。
}

// errFeeOverflow 表示運費超出回傳型別的範圍。
var errFeeOverflow = errors.New("shipping fee overflow")
```

- 調整前：服務內選擇配送方式，並計算其費用。

```go
// ShippingService 依設定的費率計算運費。
type ShippingService struct {
	config ShippingConfig // 建立服務時設定的費率。
}

// NewShippingService 依費率設定建立運費計算服務。
//
//   - config 是各配送方式的費率設定。
func NewShippingService(config ShippingConfig) *ShippingService {
	return &ShippingService{config: config}
}

// ShippingFee 計算訂單所選配送方式的運費，單位為分。
//
//   - order 是要報價的訂單。
//   - 配送方式未知，或結果超出回傳型別的範圍時回傳錯誤。
func (service *ShippingService) ShippingFee(order ShippingOrder) (uint64, error) {
	switch order.Method {
	case "flat":
		return service.config.FlatCents, nil
	case "weight":
		rate := service.config.PerKilogramCents
		if rate != 0 && order.Kilograms > ^uint64(0)/rate {
			return 0, errFeeOverflow
		}
		product := order.Kilograms * rate
		if product > ^uint64(0)-service.config.WeightBaseCents {
			return 0, errFeeOverflow
		}
		return service.config.WeightBaseCents + product, nil
	default:
		return 0, fmt.Errorf("unknown delivery method: %s", order.Method)
	}
}
```

- 調整後：以相同的設定建立私有的策略，選擇責任仍在服務內；呼叫端提供既有的訂單資料。

```go
// shippingPolicy 封裝一種已設定的運費演算法。
type shippingPolicy interface {
	// Fee 計算一次配送的運費，單位為分。
	//
	//   - kilograms 是整數公斤數；不依重量計費的策略不使用它。
	//   - 結果超出回傳型別的範圍時回傳錯誤。
	Fee(kilograms uint64) (uint64, error)
}

// flatRate 為整次配送套用已設定的固定費用。
type flatRate struct {
	cents uint64 // 每次配送的費用，單位為分。
}

// Fee 回傳已設定的配送費用。
//
//   - 不使用重量。
func (policy flatRate) Fee(_ uint64) (uint64, error) {
	return policy.cents, nil
}

// perKilogram 以起始費加上依重量計算的費用計價。
type perKilogram struct {
	baseCents uint64 // 每次配送的起始費，單位為分。
	cents     uint64 // 每整數公斤的費用，單位為分。
}

// Fee 計算依重量計價的運費。
//
//   - kilograms 是整數公斤數。
//   - 結果超出回傳型別的範圍時回傳錯誤。
func (policy perKilogram) Fee(kilograms uint64) (uint64, error) {
	if policy.cents != 0 && kilograms > ^uint64(0)/policy.cents {
		return 0, errFeeOverflow
	}
	product := kilograms * policy.cents
	if product > ^uint64(0)-policy.baseCents {
		return 0, errFeeOverflow
	}
	return policy.baseCents + product, nil
}

// ShippingService 依設定的費率計算運費。
type ShippingService struct {
	flat   shippingPolicy // 固定費率的計價策略。
	weight shippingPolicy // 依重量計費的計價策略。
}

// NewShippingService 依費率設定建立運費計算服務。
//
//   - config 是各配送方式的費率設定。
func NewShippingService(config ShippingConfig) *ShippingService {
	return &ShippingService{
		flat:   flatRate{cents: config.FlatCents},
		weight: perKilogram{baseCents: config.WeightBaseCents, cents: config.PerKilogramCents},
	}
}

// ShippingFee 計算訂單所選配送方式的運費，單位為分。
//
//   - order 是要報價的訂單。
//   - 配送方式未知，或結果超出回傳型別的範圍時回傳錯誤。
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

- 前後都以 `NewShippingService(config)` 建立，並以 `service.ShippingFee(order)` 執行。公開型別、建立方式、輸入含意、結果與錯誤均維持相同。策略屬於實作細節。

- 設定 `FlatCents` 為 `50`、`PerKilogramCents` 為 `20`、`WeightBaseCents` 為 `0` 時，三公斤的 `"flat"` 訂單前後均回傳 `50, nil`，三公斤的 `"weight"` 訂單均回傳 `60, nil`。零公斤時分別回傳 `50, nil` 與 `0, nil`。若依重量計費的起始費為 `10`，上述重量計費結果則為 `70, nil` 與 `10, nil`。

- 配送方式為 `"drone"` 時，前後均回傳 `0` 與訊息為 `unknown delivery method: drone` 的錯誤。乘法與加法溢位均回傳 `0` 與訊息為 `shipping fee overflow` 的錯誤，例如公斤單價 `20` 搭配 `^uint64(0)` 公斤，或起始費 `^uint64(0)` 搭配一公斤、公斤單價 `1`。調整後，這些計算只位於 `perKilogram.Fee`。

- 新增演算法時只調整服務內部的選擇與組裝；既有的呼叫端不必選擇策略物件。
