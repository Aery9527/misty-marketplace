# 參數數量範例

- 以下範例使用 Go，請依目標語言調整語法與型別。
- 每個章節是一個重構的教學情境：先列調整前的實作，再列判斷與調整後的實作。調整前後的實作是替代方案，同名的宣告不會同時存在。有共同宣告的章節，共同宣告在調整前後都使用。

## 同組資料

- 空間查詢判斷查詢點是否位於矩形搜尋範圍內，使用四個邊界值與查詢點的兩個座標。

- 調整前：`Contains` 接收六個參數。

```go
// Contains 判斷查詢點是否位於矩形搜尋範圍內，包含其邊界。
//
//   - minX、maxX 是搜尋範圍的左邊界與右邊界。
//   - minY、maxY 是搜尋範圍的下邊界與上邊界。
//   - x、y 是查詢點的座標。
func Contains(minX, maxX, minY, maxY, x, y float64) bool {
	return x >= minX && x <= maxX && y >= minY && y <= maxY
}
```

- 判斷：四個邊界值描述同一個搜尋範圍，會一起在儲存與查詢間傳遞；`Contains` 只有判斷這一項責任。因此引入 `Bounds` 包裝四個邊界值，而不是拆分 func。

- 調整後：`Contains` 接收 `Bounds` 與查詢點的兩個座標，共三個參數。判斷的邏輯仍在 func `Contains`，`Bounds` 只宣告欄位；改變的只有參數的傳遞方式。

```go
// Bounds 是矩形搜尋範圍，包含其邊界。
type Bounds struct {
	MinX float64 // 搜尋範圍的左邊界。
	MaxX float64 // 搜尋範圍的右邊界。
	MinY float64 // 搜尋範圍的下邊界。
	MaxY float64 // 搜尋範圍的上邊界。
}

// Contains 判斷查詢點是否位於搜尋範圍內。
//
//   - bounds 是搜尋範圍。
//   - x、y 是查詢點的座標。
func Contains(bounds Bounds, x, y float64) bool {
	return x >= bounds.MinX && x <= bounds.MaxX &&
		y >= bounds.MinY && y <= bounds.MaxY
}
```

## 獨立操作

- 商品計價與運費估算各使用兩個輸入，而兩個操作可分別請求。

- 調整前：`Total` 接收四個參數，回傳商品金額與運費的總額。

```go
// Total 計算商品金額與運費的總額，單位為分。
//
//   - 前置條件：操作入口已驗證總額可由回傳型別表示。
//   - 只需要其中一項金額時，另一項的兩個參數傳入 0。
//   - unitCents 是商品單價，單位為分；quantity 是購買數量。
//   - kilograms 是整數公斤數；centsPerKilogram 是每公斤的運費，單位為分。
func Total(unitCents, quantity, kilograms, centsPerKilogram uint64) uint64 {
	return unitCents*quantity + kilograms*centsPerKilogram
}
```

- 判斷：商品金額與運費各自是有含意的計算，可能被單獨使用；`Total` 把兩者寫在一起，就只能一起計算。`unitCents` 與 `quantity` 只用於商品金額，`kilograms` 與 `centsPerKilogram` 只用於運費，所以只需要運費的呼叫端必須寫成 `Total(0, 0, kilograms, centsPerKilogram)`，為用不到的參數傳入 `0`。因此拆成兩個 func，而不是把四個參數包裝成一個 struct；包裝之後兩個計算仍然綁在一起，呼叫端仍須為用不到的欄位填 `0`。

- 調整後：每個 func 只接收自己使用的兩個參數；需要總額的呼叫端把兩個結果相加；調整前「總額可由回傳型別表示」的前置條件，改由需要總額的操作入口負責。兩者都是內部計算，接收操作入口已驗證的資料。

```go
// Subtotal 依單價與數量計算商品金額，單位為分。
//
//   - 前置條件：操作入口已驗證乘積可由回傳型別表示。
//   - unitCents 是商品單價，單位為分；quantity 是購買數量。
func Subtotal(unitCents, quantity uint64) uint64 {
	return unitCents * quantity
}

// ShippingCost 依整數公斤數估算運費，單位為分。
//
//   - 前置條件：操作入口已驗證乘積可由回傳型別表示。
//   - kilograms 是整數公斤數；centsPerKilogram 是每公斤的運費，單位為分。
func ShippingCost(kilograms, centsPerKilogram uint64) uint64 {
	return kilograms * centsPerKilogram
}
```

## 多欄位、單一操作

- 建立會員使用姓名、email、電話、地址與語系。姓名或 email 為空字串或全空白時回傳錯誤 `name required` 或 `email required`，且不呼叫儲存服務；語系為空字串時使用 `zh-TW`；其他欄位原樣儲存。調整前後的行為相同。

- 共同宣告：

```go
import (
	"fmt"
	"strings"
)

// defaultLocale 是未指定語系時使用的語系。
const defaultLocale = "zh-TW"

// MemberService 透過儲存服務建立會員資料。
type MemberService struct {
	store MemberStore // 會員資料的儲存服務。
}

// NewMemberService 以指定的儲存服務建立會員服務。
//
//   - store 是會員資料的儲存服務，必須是非 nil 的值。
func NewMemberService(store MemberStore) *MemberService {
	return &MemberService{store: store}
}

// requireText 確認必填的文字欄位含非空白文字。
//
//   - value 是欄位的值；field 是欄位名稱，用於錯誤訊息，例如 "email"。
//   - value 為空字串或全空白時回傳錯誤，訊息為欄位名稱加上 " required"。
func requireText(value, field string) error {
	if strings.TrimSpace(value) == "" {
		return fmt.Errorf("%s required", field)
	}
	return nil
}
```

- 調整前：`CreateMember` 與 `Insert` 各接收五個參數。

```go
// MemberStore 儲存已通過入口驗證的會員註冊資料。
type MemberStore interface {
	// Insert 儲存一位會員的註冊資料。
	//
	//   - name 是會員顯示名稱，例如 "王小明"。
	//   - email 是聯絡 email，例如 "amy@example.com"。
	//   - phone 是會員聯絡電話，例如 "0909-878-787"。
	//   - address 是會員聯絡地址，例如 "台北市信義區松仁路 1 號"。
	//   - locale 是已確定的語系，例如 "en-US"。
	Insert(name, email, phone, address, locale string) error
}

// CreateMember 驗證註冊資料後請求儲存。
//
//   - 姓名或 email 無效的註冊資料不會送到儲存服務。
//   - 未指定語系時，儲存的語系為 "zh-TW"。
//   - name 是會員顯示名稱，必填，必須含非空白文字，例如 "王小明"。
//   - email 是聯絡 email，必填，必須含非空白文字，例如 "amy@example.com"。
//   - phone 是會員聯絡電話，選填，原樣儲存，例如 "0909-878-787"。
//   - address 是會員聯絡地址，選填，原樣儲存，例如 "台北市信義區松仁路 1 號"。
//   - locale 是語系偏好，選填，例如 "en-US"；空字串使用 "zh-TW"。
func (service *MemberService) CreateMember(name, email, phone, address, locale string) error {
	if err := requireText(name, "name"); err != nil {
		return err
	}
	if err := requireText(email, "email"); err != nil {
		return err
	}
	if locale == "" {
		locale = defaultLocale
	}
	if err := service.store.Insert(name, email, phone, address, locale); err != nil {
		return fmt.Errorf("create member: %w", err)
	}
	return nil
}
```

- 判斷：五個參數都是同一位會員的註冊資料，全部用於建立會員這一項操作，沒有呼叫端只需要其中一部分，所以不拆分 func。這五個參數會一起從 `MemberService` 傳到 `MemberStore`，兩個簽名重複相同的參數；註冊資料增加欄位時，兩個簽名都要修改。因此以 `MemberRegistration` 包裝。

- 調整後：`MemberRegistration` 是唯一的參數，每個欄位是否必填與預設值集中註明在這個 struct。

```go
// MemberRegistration 是一位新會員的註冊資料。
type MemberRegistration struct {
	Name    string // 會員顯示名稱，必填，必須含非空白文字，例如 "王小明"。
	Email   string // 聯絡 email，必填，必須含非空白文字，例如 "amy@example.com"。
	Phone   string // 會員聯絡電話，選填，原樣儲存，例如 "0909-878-787"。
	Address string // 會員聯絡地址，選填，原樣儲存，例如 "台北市信義區松仁路 1 號"。
	Locale  string // 語系偏好，選填，例如 "en-US"；空字串使用 "zh-TW"。
}

// MemberStore 儲存已通過入口驗證的會員註冊資料。
type MemberStore interface {
	// Insert 儲存一位會員的註冊資料。
	//
	//   - registration 是已通過驗證，且語系已確定的註冊資料。
	Insert(registration MemberRegistration) error
}

// CreateMember 驗證註冊資料後請求儲存。
//
//   - 姓名或 email 無效的註冊資料不會送到儲存服務。
//   - 未指定語系時，儲存的語系為 "zh-TW"。
func (service *MemberService) CreateMember(registration MemberRegistration) error {
	if err := requireText(registration.Name, "name"); err != nil {
		return err
	}
	if err := requireText(registration.Email, "email"); err != nil {
		return err
	}
	if registration.Locale == "" {
		registration.Locale = defaultLocale
	}
	if err := service.store.Insert(registration); err != nil {
		return fmt.Errorf("create member: %w", err)
	}
	return nil
}
```

- `registration` 以值傳入，`CreateMember` 補上預設語系時修改的是自己的副本，呼叫端的資料不變。
