# code-mereology 標頭區塊與 tag 表計畫

- 本計畫描述預計對 skill `code-mereology` 做的變更；所列內容均為待實作，不代表目前的 skill 已提供。
- 做法是讓每份 `bd-*.md` 與 `sd-*.md` 在開頭以結構化方式宣告它的關係與 tag，並提供一支 Node.js 腳本查詢它們。

## 目錄

- [目標](#目標)
- [背景](#背景)
- [已確認的決定](#已確認的決定)
- [區塊格式](#區塊格式)
- [tag 繼承](#tag-繼承)
- [模型上的改變](#模型上的改變)
- [文件鏈的完整性](#文件鏈的完整性)
- [腳本 list-relations.mjs](#腳本-list-relationsmjs)
- [agent 的使用時機](#agent-的使用時機)
- [不在範圍](#不在範圍)
- [執行步驟](#執行步驟)
- [驗證](#驗證)

## 目標

- agent 可以透過腳本用更少但精準的資訊來連結到所有與手上任務有關聯的文件。
- 驗收條件：
    - agent 從一份文件或一個 tag 出發，一次腳本呼叫就取得相關文件的路徑與關係型別。
    - 腳本輸出每一條關係的說明，agent 據此判斷要不要讀取對方的文件。
    - agent 不必為了找出關聯而讀取無關文件的內容。
    - agent 能自行決定要追查的深度與廣度，腳本只輸出該範圍內的資料。

[回到目錄](#目錄)

---

## 背景

- 現行 skill 的結構邊散在內文連結中。組成、依賴、指回上層的導航三種連結只能靠語意判讀，腳本無法分辨。
- agent 因此要逐份讀文件，才能判斷哪些文件是某份文件的上層、哪些是依賴者；Phase 3 的反向回溯就是這樣進行的。
- 現行 skill 沒有依主題找文件的方法。
- 連到尚未存在的文件時，現行規則靠連結後的 `(planned)` 標記與 `list-planned.mjs` 追蹤。
- partial leaf 已有一行寫在標題正下方的 `code-mereology-partial` 標記。
- skill 隨附的腳本只用 Node.js 標準函式庫。

[回到目錄](#目錄)

---

## 已確認的決定

- 區塊放在 H1 下方，寫成 Markdown 清單，不用 YAML frontmatter。
    - 原因：關係仍是可點擊的 Markdown link，`(planned)` 標記與 `list-planned.mjs` 不必修改；Node.js 標準函式庫也沒有 YAML 解析器。
- 關係分成組成（`parts`）與依賴（`depends`）兩種。
    - 原因：邊的型別是腳本無法從內文推得的資訊；分開後腳本可直接算出每份文件的上層與依賴者。
- `parts` 與 `depends` 的每個項目獨立一行，格式為「連結: 說明」，說明寫明為什麼連到它。
    - 原因：腳本把說明連同關係一起輸出，agent 不必開啟來源文件，就能判斷要不要讀取對方的文件。
    - 區塊的 `parts` 取代現行內文中的下一層節點清單，同一份清單只寫在一處。
- 總 tag 表放在 repository 根目錄的設定檔 `docs/code-mereology.json`，位於 `tags` 鍵之下，格式為 `{"tags": {"tag1": "說明", "tag2": "說明"}}`；monorepo 也只有這一份。
    - 檔名取自 skill 名稱，tag 內縮一層，讓未來的其他設定能以新的頂層鍵加入同一個檔案。
    - tag 名稱只能由小寫英文字母與數字組成，中間最多用兩個 `-` 串接，也就是最多三段；規則為 `^[a-z0-9]+(-[a-z0-9]+){0,2}$`。
        - 合格：`backend`、`oauth2`、`data-access`、`user-data-access`。
        - 不合格：`Backend`、`data_access`、`a-b-c-d`、`-backend`、`data--access`、`資料存取`。
    - 總 tag 表與文件的 `tags` 必須雙向一致：文件用到的 tag 必須在表中，表中的每個 tag 必須至少被一份文件宣告；由腳本驗證。
- tag 具有繼承性：下層文件具有上層文件的 tag，且嚴禁重複宣告；由腳本驗證。
    - 繼承沿每一條 `parts` 邊往下傳，不沿 `depends` 邊。
    - 一份文件有多個上層時，繼承的 tag 取聯集。
- 腳本的查詢提供選項，讓 agent 自行選擇追查的深度與廣度。
- 腳本檢查文件鏈是否斷裂，找出沒有被鏈連到的文件；定義見[文件鏈的完整性](#文件鏈的完整性)。
    - `depends` 的循環不檢查。現行規則允許使用者明確決定保留依賴循環，腳本不能把它當成錯誤。

[回到目錄](#目錄)

---

## 區塊格式

```markdown
# 主題

- `parts`:
- `depends`:
    - [資料表結構](../schema/sd-table-schema.md): 寫入前依結構驗證每一列的欄位
    - [列快取](../cache/sd-row-cache.md) (planned): 讀取時先查快取
- `tags`: `search`

## Table of Contents
```

- 位置：H1 之後、第一個 `## ` 標題之前。partial leaf 的 `code-mereology-partial` 標記維持在標題正下方，區塊接在它之後。
- 三個鍵 `parts`、`depends`、`tags` 都必須出現且各一次，順序固定。
    - 沒有值時，`parts` 與 `depends` 不帶子項目，`tags` 的冒號後留空。
    - 原因：腳本才能分辨「沒有」與「漏寫」。
- `parts` 與 `depends` 的項目：
    - 每個項目是鍵下方一行縮排的清單項目，格式為 `- <連結>: <說明>`；鍵的那一行冒號後不寫內容。
    - 目標尚未存在時，在連結後標 `(planned)`，格式為 `- <連結> (planned): <說明>`。
    - 連結是 inline link，形式與現行 planned link 的規定相同：單行、無 title、label 無方括號、目的地無空白或括號。一個項目只有一個連結。
    - 說明必填，只寫一行，寫明為什麼連到它：`parts` 寫該文件在這個組成中扮演的角色，`depends` 寫需要對方提供的能力。
    - 只列 `bd-*.md` 與 `sd-*.md`；不列程式碼、`-plan`、`-perf`，也不列指回上層的導航連結。
- `tags` 的項目：
    - 值是 inline code，寫在鍵的同一行，項目之間固定以半形 `,` 分隔，例如 `` `backend`, `persistence` ``。
    - 每個都必須是 `docs/code-mereology.json` 中 `tags` 的鍵，大小寫須相同。
    - 只寫這份文件自己宣告的 tag，嚴禁寫入已繼承的 tag；見 [tag 繼承](#tag-繼承)。
- 區塊計入 300 行上限；現行規則已把純連結行計入。

各角色填寫的內容：

| 文件 | `parts` | `depends` |
|---|---|---|
| `bd-*.md` | 下一層文件 | 留空 |
| overview 角色的 `sd-*.md` | 子層 `sd-*.md` | 留空 |
| leaf 角色的 `sd-*.md` | 留空 | 它依賴的 leaf |
| partial leaf | 留空 | 留空；現行規則禁止它畫依賴邊 |

[回到目錄](#目錄)

---

## tag 繼承

### 規則

- tag 沿組成邊由上往下繼承：一份文件的 `parts` 連到哪些文件，那些文件就繼承它的 tag。
- 繼承會一路往下傳：root `bd-*.md` → submodule `bd-*.md` → overview `sd-*.md` → 子層 `sd-*.md`。
- tag 不沿依賴邊繼承。`depends` 表示需要對方的能力，不表示屬於對方的主題。
- 一份文件的有效 tag 是「自己宣告的 tag」加上「所有上層的有效 tag」。
- 一份文件可以有多個上層：現行規則允許多份 `bd-*.md` 以 `parts` 連到同一份 `sd-*.md`，因為一個模組可以參與多個主題。有多個上層時，繼承的 tag 取聯集。
    - 例：`sd-table-rows.md` 同時被宣告 `backend` 的架構主題與宣告 `policy` 的業務主題連到時，它的有效 tag 包含 `backend` 與 `policy`，兩者都不得在它自己的 `tags` 重複宣告。
- 文件嚴禁宣告它已經繼承的 tag。
    - 原因：同一個事實只寫在一處。重複宣告的 tag 在上層改掉後仍會留在下層，查詢結果就不再可信。
- tag 必須宣告在它適用範圍的最上層文件。某個 tag 適用於一份文件的所有下層時，只在該文件宣告一次。
- 帶 `(planned)` 的 `parts` 連結，其目標尚未存在，不產生繼承。
- 上層文件後來補上某個 tag 時，下層原有的同名宣告即成為違規，必須在同一次變更中刪除。

### 範例

| 文件 | 上層 | `tags` 的寫法 | 有效 tag |
|---|---|---|---|
| `docs/bd-backend-layers.md` | 無 | `backend` | `backend` |
| `service/table/sd-table.md` | `bd-backend-layers.md` | `persistence` | `backend`、`persistence` |
| `service/table/rows/sd-table-rows.md` | `sd-table.md` | 留空 | `backend`、`persistence` |
| `service/query/sd-query.md` | `bd-backend-layers.md` | `search` | `backend`、`search` |

- `sd-table-rows.md` 若寫 `persistence`，違規：它已從 `sd-table.md` 繼承。
- `sd-table-rows.md` 若寫 `backend`，違規：它已經由 `sd-table.md` 從 `bd-backend-layers.md` 繼承。
- `sd-query.md` 以 `depends` 連到 `sd-table-schema.md`，不因此取得 `persistence`。

### 驗證

- `list-relations.mjs` 每次執行都檢查整個 repository，回報每一個重複宣告，並指出該 tag 繼承自哪份文件；見[錯誤處理](#錯誤處理)。

[回到目錄](#目錄)

---

## 模型上的改變

- 結構邊的定義改為「區塊中 `parts` 與 `depends` 的連結」。內文中其他指向 `.md` 的連結一律不是結構邊。
- 區塊的 `parts` 取代現行內文中的清單，內文不再重複列出：
    - `bd-*.md` 現行的「下一層節點清單，每個節點附一句話說明它在這裡扮演的角色」。
    - overview 現行的「子層文件清單，每份附一句話」。
- 區塊的 `depends` 取代 leaf 現行在內文中連到被依賴 leaf 的連結；關係圖仍必須畫出這條依賴。

[回到目錄](#目錄)

---

## 文件鏈的完整性

文件鏈有三種斷裂方式，腳本每次執行都檢查整個 repository。

| 斷裂方式 | 判定條件 |
|---|---|
| 邊斷了 | 連結沒有 `(planned)`，但目標不存在 |
| 組成成環 | `parts` 的連結形成循環 |
| 文件沒被連到 | 依下表，隨文件種類而不同 |

「文件沒被連到」的判定：

| 文件 | 判定為斷裂的條件 | 原因 |
|---|---|---|
| 一般的 `sd-*.md` | 從任何一份 `bd-*.md` 沿 `parts` 都走不到它 | 每個模組必須屬於至少一個主題 |
| partial leaf | 沒有任何文件以 `parts` 或 `depends` 連到它 | 現行規則規定，該 scope 沒有 `bd-*.md` 時嚴禁為它新建，所以它可以只被依賴 |
| `bd-*.md` | 不檢查 | 它是鏈的起點；submodule 的 `bd-*.md` 只在主題跨 submodule 時才被 root 連到 |

- 走訪只沿目標已存在的邊；帶 `(planned)` 的邊不算連到。
- 腳本以標題與第一個 `## ` 標題之間、開頭為 `` > `code-mereology-partial`: `` 的行認出 partial leaf。
- `-plan` 與 `-perf` 檔刻意不在圖裡，不列入檢查。
- 腳本不檢查 leaf 到程式碼這一段：區塊只列 `.md`，程式碼連結在內文，腳本不解析內文。

範例，以[輸出範例](#輸出範例)的檔案為基礎：

| 改動 | 結果 |
|---|---|
| 從 `sd-table.md` 的 `parts` 移除 `sd-table-rows.md` | `sd-table-rows.md` 斷裂：沒有任何 `bd-*.md` 走得到它 |
| 同上，但 `sd-query.md` 以 `depends` 連到 `sd-table-rows.md` | 仍然斷裂：`depends` 不算歸屬於主題 |
| 同上，且 `sd-table-rows.md` 帶有 `code-mereology-partial` 標記 | 不斷裂：partial leaf 被依賴即可 |
| 刪除 `bd-backend-layers.md` | 其餘四份 `sd-*.md` 全部斷裂 |

[回到目錄](#目錄)

---

## 腳本 list-relations.mjs

### 用法

```text
node <skill-root>/scripts/list-relations.mjs [--about <文件> [--follow <關係>] [--depth <深度>]] [--tag <tag>] [<repository-root>]
```

- 省略 `<repository-root>` 時使用目前目錄。
- 沒有 `--about` 也沒有 `--tag` 時，輸出整個 repository 的資料。
- `--about` 與 `--tag` 不可同時使用。

| 選項 | 意義 | 預設 |
|---|---|---|
| `--about <文件>` | 追查的起點；路徑相對於目前目錄，必須是 root 內的 `bd-*.md` 或 `sd-*.md` | 無 |
| `--follow <關係>` | 廣度：要追查哪幾種關係，以 `,` 分隔 | 四種全部 |
| `--depth <深度>` | 深度：從起點最多走幾條邊，正整數或 `all` | `1` |
| `--tag <tag>` | 列出有效 tag 包含它的所有文件 | 無 |

`--follow` 可用的關係：

| 值 | 追查的對象 |
|---|---|
| `parents` | 上層：`parts` 連到該文件的文件 |
| `children` | 下層：該文件的 `parts` 連到的文件 |
| `dependencies` | 它依賴的文件：該文件的 `depends` 連到的文件 |
| `dependents` | 依賴它的文件：`depends` 連到該文件的文件 |

- 深度大於 `1` 時，腳本對每一份走到的文件都再追查 `--follow` 指定的所有關係。
- 帶 `(planned)` 的邊會輸出，但不從它尚未存在的目標繼續追查。

### 輸出格式

- 每列一筆資料，欄位以 tab 分隔。前三欄固定是 `<文件>`、`<種類>`、`<值>`；其後的欄位隨種類而不同，`<註記>` 是選用的最後一欄。

| 種類 | 欄位 | 值 | 說明 | 註記 |
|---|---|---|---|---|
| `parts`、`depends` | `<文件>`、`<種類>`、`<值>`、`<說明>`、選用的 `<註記>` | 目標文件的路徑 | 區塊中該項目的說明，原樣輸出 | 目標尚未存在時為 `planned` |
| `tag` | `<文件>`、`<種類>`、`<值>`、選用的 `<註記>` | tag 名稱 | 無此欄 | 該 tag 是繼承來的時為 `inherited` |

- 說明屬於宣告該關係的文件，也就是第一欄的文件。追查上層或依賴者時，說明寫的是對方為什麼連到起點文件。
- 路徑相對於 repository root，使用正斜線。
- 文件依路徑不分大小寫排序。同一份文件內的順序：`parts`、`depends`、宣告的 tag，三者依區塊順序；之後是繼承的 tag，依名稱排序。
- 各模式輸出的範圍：

| 模式 | 邊 | tag |
|---|---|---|
| 無查詢選項 | 全部 | 每份文件宣告的 tag；不含繼承的 |
| `--about` | 追查時走過的每一條邊，各輸出一次 | 只有起點文件的有效 tag |
| `--tag` | 不輸出 | 有效 tag 包含它的每份文件，各一列 |

### 輸出範例

輸入：

| 檔案 | 內容 |
|---|---|
| `docs/code-mereology.json` | `{"tags": {"backend": "後端服務層", "persistence": "資料存取", "search": "查詢功能"}}` |
| `docs/bd-backend-layers.md` | `parts` 連到 `sd-table.md`（保存資料列與資料表結構）與 `sd-query.md`（依條件查出資料列）；`tags` 為 `backend` |
| `service/table/sd-table.md` | `parts` 連到 `sd-table-rows.md`（讀寫資料列）與 `sd-table-schema.md`（定義欄位與型別）；`tags` 為 `persistence` |
| `service/table/rows/sd-table-rows.md` | `depends` 連到 `sd-table-schema.md`（寫入前依結構驗證每一列的欄位），以及尚未存在並標了 `(planned)` 的 `../cache/sd-row-cache.md`（讀取時先查快取）；`tags` 留空 |
| `service/table/schema/sd-table-schema.md` | 三個鍵都留空 |
| `service/query/sd-query.md` | `depends` 連到 `sd-table-schema.md`（依結構解析查詢條件中的欄位）；`tags` 為 `search` |

- 括號內是該項目在區塊中的說明。

無查詢選項：

```text
docs/bd-backend-layers.md	parts	service/table/sd-table.md	保存資料列與資料表結構
docs/bd-backend-layers.md	parts	service/query/sd-query.md	依條件查出資料列
docs/bd-backend-layers.md	tag	backend
service/query/sd-query.md	depends	service/table/schema/sd-table-schema.md	依結構解析查詢條件中的欄位
service/query/sd-query.md	tag	search
service/table/rows/sd-table-rows.md	depends	service/table/schema/sd-table-schema.md	寫入前依結構驗證每一列的欄位
service/table/rows/sd-table-rows.md	depends	service/table/cache/sd-row-cache.md	讀取時先查快取	planned
service/table/sd-table.md	parts	service/table/rows/sd-table-rows.md	讀寫資料列
service/table/sd-table.md	parts	service/table/schema/sd-table-schema.md	定義欄位與型別
service/table/sd-table.md	tag	persistence
```

`--about service/table/schema/sd-table-schema.md`，即直接相連的所有文件：

```text
service/query/sd-query.md	depends	service/table/schema/sd-table-schema.md	依結構解析查詢條件中的欄位
service/table/rows/sd-table-rows.md	depends	service/table/schema/sd-table-schema.md	寫入前依結構驗證每一列的欄位
service/table/schema/sd-table-schema.md	tag	backend	inherited
service/table/schema/sd-table-schema.md	tag	persistence	inherited
service/table/sd-table.md	parts	service/table/schema/sd-table-schema.md	定義欄位與型別
```

`--about service/table/schema/sd-table-schema.md --follow parents --depth all`，即所有上層：

```text
docs/bd-backend-layers.md	parts	service/table/sd-table.md	保存資料列與資料表結構
service/table/schema/sd-table-schema.md	tag	backend	inherited
service/table/schema/sd-table-schema.md	tag	persistence	inherited
service/table/sd-table.md	parts	service/table/schema/sd-table-schema.md	定義欄位與型別
```

`--tag persistence`：

```text
service/table/rows/sd-table-rows.md	tag	persistence	inherited
service/table/schema/sd-table-schema.md	tag	persistence	inherited
service/table/sd-table.md	tag	persistence
```

### 錯誤處理

- 不論有沒有查詢選項，腳本每次都檢查整個 repository。
- 文件的錯誤寫到 stderr，格式為 `ERROR <路徑>[:<行號>]: <訊息>`；其餘正確的資料仍會輸出，exit code 為 `1`。
- 參數的錯誤寫到 stderr，不輸出資料，exit code 為 `2`。
- 沒有錯誤時 exit code 為 `0`。

文件的錯誤：

| 情況 | 結果 |
|---|---|
| 文件缺少某個鍵，或同一個鍵出現兩次 | 錯誤 |
| `parts` 或 `depends` 的項目不符合 `- <連結>: <說明>`，例如 reference-style link、一個項目有多個連結、鍵的那一行冒號後有內容 | 錯誤 |
| `parts` 或 `depends` 的項目沒有說明，或說明含有 tab 字元 | 錯誤 |
| `tags` 的值含有 inline code 與分隔用的 `,` 以外的內容，例如以 `、` 分隔 | 錯誤 |
| 連結沒有 `(planned)`，但目標不存在 | 錯誤 |
| 連結有 `(planned)`，但目標已存在 | 錯誤 |
| 目標不是 `bd-*.md` 或 `sd-*.md`，或是 `-plan`、`-perf` 檔 | 錯誤 |
| tag 不在 `docs/code-mereology.json` 的 `tags` 中；該檔不存在或沒有 `tags` 鍵時，視為沒有任何 tag | 錯誤 |
| 文件宣告了它已繼承的 tag | 錯誤；訊息指出 tag 名稱與宣告它的上層文件 |
| `parts` 的連結形成循環 | 錯誤；繼承在循環上沒有定義 |
| 一般的 `sd-*.md` 無法從任何 `bd-*.md` 沿 `parts` 走到 | 錯誤 |
| partial leaf 沒有被任何文件以 `parts` 或 `depends` 連到 | 錯誤 |
| `depends` 的連結形成循環 | 不算錯誤，不檢查 |
| `docs/code-mereology.json` 不是 JSON 物件，或有 `tags` 以外的頂層鍵 | 錯誤 |
| `docs/code-mereology.json` 的 `tags` 不是「字串對字串」的 JSON 物件 | 錯誤 |
| `docs/code-mereology.json` 的 tag 名稱不符合命名規則，例如 `Backend` 或 `a-b-c-d` | 錯誤 |
| `docs/code-mereology.json` 的 tag 沒有被任何文件在 `tags` 宣告 | 錯誤；繼承而來的不算宣告 |
| 檔案不是 UTF-8 | 錯誤，其他檔案照常處理 |

- 例：`sd-table-rows.md` 的 `tags` 寫了 `backend` 時，stderr 為
  `ERROR service/table/rows/sd-table-rows.md:7: tag "backend" is inherited from docs/bd-backend-layers.md`。
- 例：`sd-query.md` 的 `tags` 改為留空後，沒有文件宣告 `search`，stderr 為
  `ERROR docs/code-mereology.json: tag "search" is not declared by any document`。

參數的錯誤：

| 情況 | 結果 |
|---|---|
| 未知的選項，或選項缺少值 | 錯誤 |
| `--about` 與 `--tag` 同時使用 | 錯誤 |
| `--follow` 或 `--depth` 沒有搭配 `--about` | 錯誤 |
| `--follow` 含有四種關係以外的值 | 錯誤 |
| `--depth` 不是正整數也不是 `all` | 錯誤 |
| `--about` 的文件不在 root 內，或不是 `bd-*.md`、`sd-*.md` | 錯誤 |
| `--tag` 的值不在 `docs/code-mereology.json` 的 `tags` 中 | 錯誤 |

[回到目錄](#目錄)

---

## agent 的使用時機

規則文件必須寫明下列時機與對應的查詢，讓 agent 以腳本取代逐份讀文件。

| 時機 | 查詢 | 取得 |
|---|---|---|
| 階段之外修改既有程式碼前，已找到程式碼旁的 `sd-*.md` | `--about <該文件> --follow parents,dependents` | 指向它、修改後必須對照的文件 |
| Phase 1 修改既有設計文件前 | `--about <該文件>` | 直接相連的文件，用來判斷變更的影響 |
| Phase 1 需要找出與某個主題有關的文件 | 先讀 `docs/code-mereology.json` 的 `tags` 選出 tag，再用 `--tag <tag>` | 有效 tag 包含它的文件 |
| Phase 3 冷載入，找出 leaf 的上層與依賴者 | `--about <leaf> --follow parents,dependents` | `parts` 指向它的是上層，`depends` 指向它的是依賴者 |
| Phase 3 檢查後，某份上層或依賴者改變了它對外描述的關係 | 對那份文件再執行同一個查詢 | 下一層要檢查的文件 |

- 其他情況由 agent 依任務自行選擇 `--follow` 與 `--depth`。
- agent 依每一條關係的說明，決定要讀取哪些文件；與手上任務無關的文件不讀。

[回到目錄](#目錄)

---

## 不在範圍

- 腳本不比對區塊與內文連結是否一致。內文連結無法以程式分辨型別，只能做單向檢查。
- 腳本不檢查角色規則，例如 overview 不得有 `depends`。
- 不改動既有的 `bd-*.md` 與 `sd-*.md`；它們在執行腳本時會被回報為缺少區塊，需另行補上。已知的既有文件：
    - 本 repository 的 `skills/claude/codex-plugin/` 下有 `docs/bd-bridge-runtime.md`、`sd-broker-session-lifecycle.md`、`sd-session-transfer.md`。修改前必須先讀 `docs/claude/UPSTREAM-PARITY.md`。
    - 其他使用此 skill 的專案，例如 `fgl-developer-portal`。

[回到目錄](#目錄)

---

## 執行步驟

- 分兩個階段，每階段結束時依序執行：
    1. 執行 `scripts/sync-codex-plugins.ps1`。
    2. 送 reviewer 審查。
    3. 審查通過後，由 `.agents/skills/commit` 入口 commit。

### 階段 1：腳本與測試

- 新增 `skills/code-mereology/scripts/find-files.mjs`。
    - 把 `list-plans.mjs` 內的 `walk`、`toPosix`、`isDirectory`、`compareWithoutCase` 移到這個共用模組，匯出「依檔名規則搜尋並排序」的函式。
    - `list-plans.mjs` 改為呼叫它，行為不變，由現有測試把關。
- 新增 `skills/code-mereology/scripts/list-relations.mjs`。
    - 以 `find-files.mjs` 找出設計與組裝文件，以 `read-lines.mjs` 的 `readLines` 讀檔。
    - 連結的比對沿用 `list-planned.mjs` 的 `PLANNED` 正規表示式所定義的形式。
    - 依序處理：解析每份文件的區塊、檢查文件的錯誤、檢查[文件鏈的完整性](#文件鏈的完整性)、計算繼承的 tag、依查詢選項輸出。
- 在 `scripts/tests/code-mereology-scripts.test.mjs` 先寫失敗測試，再實作。測試涵蓋：
    - [輸出範例](#輸出範例)的四種呼叫。
    - [tag 繼承](#tag-繼承)的範例，包含多個上層取聯集。
    - [文件鏈的完整性](#文件鏈的完整性)範例表的每一列。
    - [錯誤處理](#錯誤處理)兩張表的每一列。

### 階段 2：規則文件

每份文件的英文檔與 `_ch` 檔在同一次變更中同步修改。

- `skills/code-mereology/SKILL.md`：
    - 「文件模型」新增區塊的定義與格式，並把結構邊改為由區塊宣告；`bd-*.md` 的「下一層實際節點必須另用 Markdown 連結清單列出」改為由 `parts` 列出。
    - 「文件模型」新增 tag 繼承的規則、tag 的命名規則與設定檔 `docs/code-mereology.json`。
    - 「文件模型」新增[文件鏈的完整性](#文件鏈的完整性)的兩條歸屬規則：一般的 `sd-*.md` 必須能從某份 `bd-*.md` 沿 `parts` 走到；partial leaf 必須被至少一份文件連到。
    - 新增 `list-relations.mjs` 的用法與選項。
    - 「階段之外的程式碼修改」補上[使用時機](#agent-的使用時機)表中對應的查詢。
- `skills/code-mereology/references/phase1-design.md`：
    - 組裝文件、leaf、overview 三種撰寫規則的內容順序最前面加上區塊。
    - 組裝文件與 overview 的內容順序移除最後的節點清單；「Markdown 連結清單」的規則改為描述 `parts`，包含「新增沿用相同規則的既有角色實例時只更新 `parts`」。
    - leaf 的依賴規則改為：依賴寫在 `depends`，並在關係圖中畫出。
    - 寫明 `parts` 與 `depends` 的說明要寫什麼。
    - 「partial leaf」補上標記與區塊的先後，以及 `depends` 留空。
    - 「遞迴與 gate」補上：
        - 寫節點時填區塊。
        - tag 宣告在適用範圍的最上層文件，不重複宣告已繼承的 tag。
        - 新 tag 連同說明加入 `docs/code-mereology.json` 的 `tags`，並隨文件一起交給使用者確認。
        - 最後一份宣告某個 tag 的文件移除它時，同時從 `docs/code-mereology.json` 的 `tags` 刪除該 tag。
    - 「切分程序」補上：升格時更新 `parts`，並把適用於所有子層的 tag 留在升格後的文件。
    - 補上[使用時機](#agent-的使用時機)表中 Phase 1 的兩個查詢。
    - 「產出物」補上：對 repository 執行 `list-relations.mjs` 沒有錯誤。
- `skills/code-mereology/references/phase3-tdd.md`：冷載入程序第 3 點與執行流程第 7 點，改為用[使用時機](#agent-的使用時機)表中 Phase 3 的兩個查詢。
- `skills/code-mereology/CODE-MEREOLOGY.md`：
    - 檔名規則表加上 `docs/code-mereology.json`。
    - 「值得知道的決策」加兩則：區塊的用意、tag 繼承。
    - 腳本清單加上 `list-relations.mjs`。
- `phase2-sbe.md` 與 `phase4-benchmark.md` 不需修改。

[回到目錄](#目錄)

---

## 驗證

- `node --test "scripts/tests/*.test.mjs"` 全數通過。
- 在暫存目錄建立[輸出範例](#輸出範例)的六個檔案，執行該節的四種呼叫：stdout 與範例逐字相同，exit code 為 `0`。
- 在同一個目錄把 `sd-table-rows.md` 的 `tags` 改為 `backend`：stderr 與[錯誤處理](#錯誤處理)的例子相同，exit code 為 `1`。
- `scripts/sync-codex-plugins.ps1` 執行成功；它包含 `verify-codex-plugins.mjs` 的一致性檢查。
- 逐條比對每份英文檔與 `_ch` 檔的規則，確認兩者等價。
- reviewer 逐行對照腳本，檢查規則文件中的每個事實陳述。

[回到目錄](#目錄)
