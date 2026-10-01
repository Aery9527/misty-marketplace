# AI Agent Markdown Rules

- 本文件只在 Markdown 的目標讀者是 AI agent 時讀取。
- AI agent 文件的重點是 context-efficient、精準、可執行，避免載入人類閱讀導向的導覽規則。

## 適用情境

- `SKILL.md`、agent instructions、system prompt、workflow rule、coding rule、eval spec、tool usage guideline。
- 內容目標是讓 AI agent 穩定執行規則，而不是讓人瀏覽學習。
- 文件會被長期載入 context window，重點是壓縮、精準、可執行。

## 必要輸出規格

- 嚴禁使用 Markdown table；改用條列清單或編號步驟。
- 除非使用者明確要求在 AI agent 文件中使用 Mermaid 圖表或語法，否則嚴禁使用 Mermaid。有明確要求時，必須讀取 [Mermaid 指南](mermaid-guide_zhTW.md)。
- 在繁體中文 AI agent 文件的最終產出內容中，表達強制要求時必須使用 `必須` (`MUST`)；表達強烈禁止時必須使用 `嚴禁` (`MUST NOT`)。
- 規則必須直接、無歧異；繁體中文 AI agent 文件優先使用 `必須` / `應` / `嚴禁` / 先後順序等明確語氣。
- 避免長篇例子；只保留必要的短例子、反例或判斷句。

## 文字替代格式

- 未使用 Mermaid 時，AI agent 文件以以下文字格式描述架構、流程、狀態或依賴，取代 table：
    - 依賴關係：逐項條列，格式為「元件 — 依賴 — 責任」。
    - 時序互動：編號步驟，逐步描述 actor、動作與結果。
    - 狀態轉換：`from -> event -> to` transition list。
    - 資料流：pipeline 編號步驟，逐步寫明輸入、處理與輸出。
    - 決策邏輯：優先序編號清單，使用「若 X 則 Y；否則 Z」語氣。
