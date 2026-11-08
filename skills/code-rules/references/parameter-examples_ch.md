# 參數數量範例

- 以下範例使用 Go，請依目標語言調整語法與輸入型別。

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
