# 分支選擇範例

- 以下範例使用 Go，請依目標語言調整語法與輸入型別。

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

- 以下為重構的教學情境。每組範例以共同宣告放在同一檔案前方，再接調整前或調整後的其中一份實作；兩份實作為替代方案。這兩組範例的初始化與執行呼叫維持相同，改變的是私有欄位、內部組裝與操作內部實作。

## 分派表

- 專案明確要求持續新增共用既有輸出依賴的內建命令。將命令與處理函式的對應從私有 switch 移至內部註冊表。新增命令調整內部註冊而非 `Run`；公開的初始化與執行呼叫方式維持不變。

- 共同宣告：

```go
import (
	"context"
	"fmt"
	"io"
)

// ping 寫出命令的存活回覆。
func ping(ctx context.Context, output io.Writer) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	_, err := fmt.Fprintln(output, "pong")
	return err
}

// status 寫出命令的就緒回覆。
func status(ctx context.Context, output io.Writer) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	_, err := fmt.Fprintln(output, "ready")
	return err
}
```

- 調整前：在 `Run` 內選擇各個內建命令。

```go
// Dispatcher 透過已設定的輸出執行內建命令。
type Dispatcher struct {
	output io.Writer // 已完成初始化的命令回覆輸出目的地。
}

// NewDispatcher 以指定的輸出目的地初始化命令執行器。
//
//   - output 必須是已完成初始化的非 nil writer。
func NewDispatcher(output io.Writer) *Dispatcher {
	return &Dispatcher{output: output}
}

// Run 執行 name 指定的內建命令。
//
//   - 分派器必須已透過 NewDispatcher 初始化。
func (dispatcher *Dispatcher) Run(ctx context.Context, name string) error {
	var err error
	switch name {
	case "ping":
		err = ping(ctx, dispatcher.output)
	case "status":
		err = status(ctx, dispatcher.output)
	default:
		return fmt.Errorf("unknown command: %s", name)
	}
	if err != nil {
		return fmt.Errorf("run %s: %w", name, err)
	}
	return nil
}
```

- 調整後：將命令選擇資料存在分派器內，執行端提供相同的命令名稱。

```go
// commandHandler 透過已設定的輸出執行一個命令。
type commandHandler func(context.Context, io.Writer) error

// Dispatcher 透過已設定的輸出執行內建命令。
type Dispatcher struct {
	output   io.Writer                 // 已完成初始化的命令回覆輸出目的地。
	handlers map[string]commandHandler // 依命令名稱索引的內建執行行為。
}

// NewDispatcher 以指定的輸出目的地初始化命令執行器。
//
//   - output 必須是已完成初始化的非 nil writer。
func NewDispatcher(output io.Writer) *Dispatcher {
	return &Dispatcher{
		output: output,
		handlers: map[string]commandHandler{
			"ping":   ping,
			"status": status,
		},
	}
}

// Run 執行 name 指定的內建命令。
//
//   - 分派器必須已透過 NewDispatcher 初始化。
func (dispatcher *Dispatcher) Run(ctx context.Context, name string) error {
	handler := dispatcher.handlers[name]
	if handler == nil {
		return fmt.Errorf("unknown command: %s", name)
	}
	if err := handler(ctx, dispatcher.output); err != nil {
		return fmt.Errorf("run %s: %w", name, err)
	}
	return nil
}
```

- 前後都以 `dispatcher := NewDispatcher(output)` 初始化，並以 `err := dispatcher.Run(ctx, "ping")` 執行。`ping` 寫入 `"pong\n"`；`status` 寫入 `"ready\n"`。未註冊的 `missing` 回傳 `unknown command: missing`，且不寫入輸出。

- 脈絡已取消時，`ping` 不寫入輸出，並回傳包裝 `context.Canceled` 且附有 `run ping: ` 上下文的錯誤。輸出失敗時，前後都保留錯誤鏈與相同的命令上下文。

## Strategy

- 專案明確要求持續增加各有設定的運費演算法。依重量計費使用起始費與公斤單價，固定費率則使用每次配送費用。以共同的內部計價契約封裝各演算法的設定與計算；服務仍依訂單既有的配送方式欄位逐筆選擇策略，可保留小段選擇分支。

- 共同宣告：各項費率設定與公斤數均允許為零。未知配送方式回傳錯誤；依重量計費的結果超出回傳型別範圍時也回傳錯誤。

```go
import "fmt"

// ShippingConfig 承載各配送方式的既有費率設定。
type ShippingConfig struct {
	WeightBaseCents  uint64 // 依重量計費的起始費，單位為分；允許為零。
	FlatCents        uint64 // 固定費率配送的每次費用，單位為分；允許為零。
	PerKilogramCents uint64 // 每整數公斤的費用，單位為分；允許為零。
}

// ShippingOrder 承載一次運費報價的配送方式與重量。
type ShippingOrder struct {
	Method    string // 配送方式："flat" 或 "weight"。
	Kilograms uint64 // 整數公斤數；允許為零。
}
```

- 調整前：服務內選擇配送方式，並計算其費用。

```go
// ShippingService 依設定的費率計算運費。
type ShippingService struct {
	config ShippingConfig // 服務初始化時設定的費率。
}

// NewShippingService 依費率設定初始化運費計算服務。
func NewShippingService(config ShippingConfig) *ShippingService {
	return &ShippingService{config: config}
}

// ShippingFee 計算訂單所選配送方式的運費。
func (service *ShippingService) ShippingFee(order ShippingOrder) (uint64, error) {
	switch order.Method {
	case "flat":
		return service.config.FlatCents, nil
	case "weight":
		rate := service.config.PerKilogramCents
		if rate != 0 && order.Kilograms > ^uint64(0)/rate {
			return 0, fmt.Errorf("shipping fee overflow")
		}
		product := order.Kilograms * rate
		if product > ^uint64(0)-service.config.WeightBaseCents {
			return 0, fmt.Errorf("shipping fee overflow")
		}
		return service.config.WeightBaseCents + product, nil
	default:
		return 0, fmt.Errorf("unknown delivery method: %s", order.Method)
	}
}
```

- 調整後：以相同設定初始化私有策略，選擇責任仍在服務內；呼叫端提供既有的訂單資料。

```go
// shippingPolicy 封裝一種已設定的運費演算法。
type shippingPolicy interface {
	// Fee 依重量計算運費；結果無法由回傳型別表示時回傳錯誤。
	Fee(kilograms uint64) (uint64, error)
}

// flatRate 為整次配送套用已設定的固定費用。
type flatRate struct {
	cents uint64 // 每次配送的費用，單位為分。
}

// Fee 回傳已設定的配送費用。
func (policy flatRate) Fee(_ uint64) (uint64, error) {
	return policy.cents, nil
}

// perKilogram 以起始費加上依重量計算的費用計價。
type perKilogram struct {
	baseCents uint64 // 每次配送的起始費，單位為分。
	cents     uint64 // 每整數公斤的費用，單位為分。
}

// Fee 計算依重量計價的運費，拒絕無法由回傳型別表示的結果。
func (policy perKilogram) Fee(kilograms uint64) (uint64, error) {
	if policy.cents != 0 && kilograms > ^uint64(0)/policy.cents {
		return 0, fmt.Errorf("shipping fee overflow")
	}
	product := kilograms * policy.cents
	if product > ^uint64(0)-policy.baseCents {
		return 0, fmt.Errorf("shipping fee overflow")
	}
	return policy.baseCents + product, nil
}

// ShippingService 依設定的費率計算運費。
type ShippingService struct {
	flat   flatRate    // 已設定的固定費率計算策略。
	weight perKilogram // 已設定的依重量計費策略。
}

// NewShippingService 依費率設定初始化運費計算服務。
func NewShippingService(config ShippingConfig) *ShippingService {
	return &ShippingService{
		flat:   flatRate{cents: config.FlatCents},
		weight: perKilogram{baseCents: config.WeightBaseCents, cents: config.PerKilogramCents},
	}
}

// ShippingFee 計算訂單所選配送方式的運費。
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

- 前後都以 `service := NewShippingService(config)` 初始化，並以 `fee, err := service.ShippingFee(order)` 執行。公開型別、初始化方式、輸入含意、結果與錯誤均維持相同。策略屬於實作細節。

- 設定 `FlatCents: 50`、`PerKilogramCents: 20` 與 `WeightBaseCents: 0` 時，三公斤的 `"flat"` 訂單前後均回傳 `50, nil`，三公斤的 `"weight"` 訂單均回傳 `60, nil`。零公斤時分別回傳 `50, nil` 與 `0, nil`。若依重量計費的起始費為 `10`，上述重量計費結果則為 `70, nil` 與 `10, nil`。所有費率設定均為零時，有效配送方式的費用均為零。

- 方法為 `"drone"` 時，前後均回傳 `0` 與 `unknown delivery method: drone`。乘法與加法溢位均回傳 `0` 與 `shipping fee overflow`，例如公斤單價 `20` 搭配 `^uint64(0)` 公斤，或起始費 `^uint64(0)` 搭配一公斤、公斤單價 `1`。調整後，這些檢查僅位於 `perKilogram.Fee`。

- 新演算法可能需要調整內部選擇與組裝；既有操作呼叫端不必選擇策略物件。若初始化需要新增必填設定，檢查其建立與載入來源，並依[變更原則](../SKILL_ch.md#變更原則)處理相容性。
