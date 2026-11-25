# log 範例

- 以下範例使用 Go 標準函式庫的 `log`，請依目標語言與專案的 log API 調整寫法。
- 每個章節是一個情境：先列調整前的寫法，再列調整後的寫法。只有一行的程式碼區塊是函式內的一個敘述，不是完整的檔案。
- `log` 的預設設定會在每一筆訊息前加上日期與時間；以下說明的格式是訊息本身。

## 固定欄位位置

- 請求進入處理入口時，記錄年齡、姓名與訊息；專案沒有結構化欄位慣例。本例把請求進入處理入口視為該請求的生命週期事件；專案的 log API 有 level 時，以 `INFO` 記錄。

- 調整前：文章式描述，每一筆 log 都重複欄位的說明。

```go
log.Printf("User %s whose age is %d entered and said %q", name, age, message)
```

- 調整後：採固定的欄位位置 `Enter {AGE} {NAME} "{MSG}"`。固定欄位位置讓 AI 對照程式碼解讀資料，減少重複說明占用的 log 空間與 token。

```go
log.Printf("Enter %d %s %q", age, name, message)
```

## 請求次數統計

- 處理入口的 `Enter {AGE} {NAME} "{MSG}"` 表示每筆請求進入時的一次事件。這些事件只用來統計請求次數，且允許遺失尚未輸出的計數。

- 調整前：每筆請求寫入一筆 `Enter` 紀錄，事後由這些紀錄統計次數。

```go
log.Printf("Enter %d %s %q", age, name, message)
```

- 調整後：在同一入口每收到一筆請求就將計數加一，並定時寫入一次計數，例如每 5 秒寫入 `Request ALL 123`，取代逐筆 `Enter` 紀錄。
    - `ALL` 表示該入口不依 `AGE`、`NAME` 或 `MSG` 分組的全部請求；`123` 表示該 5 秒區間共收到 123 筆請求，各區間分開計數。
    - 若逐筆 `Enter` 紀錄另有診斷或稽核用途，仍保留這些紀錄，並可由此統計。

```go
import (
	"log"
	"sync/atomic"
)

// RequestCounter 統計處理入口收到的請求數，分區間輸出。
type RequestCounter struct {
	count atomic.Int64 // 目前區間收到的請求數。
}

// Increment 記錄收到一筆請求。
func (counter *RequestCounter) Increment() {
	counter.count.Add(1)
}

// Flush 輸出目前區間的請求數，並開始下一個區間。
//
//   - 呼叫時序：必須定時呼叫，例如每 5 秒一次。
//   - 兩次呼叫之間收到的請求算作一個區間；每筆請求只計入一個區間。
func (counter *RequestCounter) Flush() {
	log.Printf("Request ALL %d", counter.count.Swap(0))
}
```
