# README Output

## README 契約

- 必須用繁體中文撰寫；專有名詞與 `write-md` 導覽標記（`Table of Contents`、`Back to top`）維持原樣。
- 專案名稱來源依序為：既有 README 的 H1、套件或模組 manifest、使用者。
- 章節順序：
    1. `# <project name>`，後接一行用途。
    2. `## Table of Contents`。
    3. `## 開始使用`：在 repo 內核對過的前置需求與指令，例如 `Makefile` target、`package.json` script、`go.mod` 的 Go 版本，或使用者提供的內容；保留既有 README 的事實。
    4. `## 專案概覽`：專案是什麼、目錄層級的頂層組成，以及下方的文件結構清單。
    5. 專案自訂章節，例如既有的授權或部署說明。
- `## 專案概覽` 必須包含以下清單；`.agents/skills` 只有在目錄存在時才用 link，否則用 inline code：

```markdown
- AI agent 的工作規則看 [LORE_ch.md](LORE_ch.md)（英文版 [LORE.md](LORE.md)）。
- 文件結構：
    - [LORE.md](LORE.md)：所有 AI agent 共用的規則與閱讀入口。
    - [AGENTS.md](AGENTS.md)：agent 通用入口，只負責轉介到 LORE；Codex 另外讀 CODEX。
    - [CLAUDE.md](CLAUDE.md)：Claude Code 入口，匯入 LORE 並放 Claude 專屬規則。
    - [CODEX.md](CODEX.md)：Codex 專屬規則。
    - `*_ch.md`：同名英文檔的等價繁體中文版本。
    - [.agents/skills](.agents/skills)：專案 skill 的唯一位置；`.claude/skills` 是指向它的本機 link。
```

- 依 `write-md` 要求放一張 Mermaid 圖：
    - 專案有不明顯的結構或流程時，畫它；
    - 否則畫文件讀取關係：`CLAUDE.md` 匯入 `LORE.md`，`AGENTS.md` 轉介到 `LORE.md`，且只對 Codex 轉介到 `CODEX.md`。
- 保持精簡：嚴禁複製會與其他資料來源漂移的完整清單，例如 skill、endpoint 或模組內的檔案；改連到資料來源。`開始使用` 需要的少量指令不屬於這類清單。
