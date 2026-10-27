---
name: project-lore
description: >-
  建立新 repo 的根目錄文件，或重整既有專案的 agent 指令檔（`CLAUDE.md`、`AGENTS.md`、
  `CODEX.md`、`LORE.md`、`GEMINI.md`、`.cursorrules`）與 `README.md`，
  或把專案 skill 搬到 `.agents/skills` 時使用。不用於修改單一規則或單一 README 章節。
---

# Project LORE

- 建立或遷移 repo 的根目錄文件結構：一份共用規則檔、精簡的 host 入口檔、等價的繁體中文對應檔，以及一份精簡的人類讀者 README。
- **必要 SUB-SKILL：** 寫任何檔案前必須從英文版 `SKILL.md` 與 references 載入 `write-md`；agent 文件套用其 AI agent 規則，`README.md` 套用其人類讀者規則。
- 本 skill 只在以下幾處覆蓋 `write-md`：
    - `@LORE.md` 這類 host 匯入行維持裸寫的匯入語法。
    - repo 內不存在的路徑，例如範例、佔位符或本機 link `.claude/skills`，使用 inline code，不用 Markdown link。
    - 範本文字逐字照抄；範本內以 inline code 寫的路徑維持 inline code。

## 產出契約

- repo 根目錄必須包含以下九份文件：
    - `LORE.md` / `LORE_ch.md`：所有 agent 共用的全 repo 指引，也是閱讀入口。
    - `AGENTS.md` / `AGENTS_ch.md`：只負責轉介。
    - `CLAUDE.md` / `CLAUDE_ch.md`：Claude Code 入口，先匯入 LORE，再放 Claude 專屬規則。
    - `CODEX.md` / `CODEX_ch.md`：Codex 專屬規則；沒有規則時只留標題。
    - `README.md`：人類讀者入口，只用繁體中文。
- `.gitignore` 必須列出 `.claude/skills`。專案 skill 放在 `.agents/skills/<skill-name>/`；`.agents/skills` 存在時，`.claude/skills` 必須是指向它的本機 link。
- 無後綴檔為英文；`<basename>_ch.md` 是其繁體中文對應檔。
    - 兩者的內容與規範強度必須等價：`MUST` = `必須`，`MUST NOT` = `嚴禁`。
    - 嚴禁把任一檔標示為譯本或正本。
    - 兩檔的 H1 相同；其他標題要翻譯。
    - `_ch` 檔在對應的 `_ch` 目標存在時連到 `_ch` 目標，否則連到原目標。

## 入口檔範本

- 以下檔案逐字照寫；只有存在 host 專屬規則時，才接在範本內容之後。
- `AGENTS.md`：

```markdown
# AGENTS.md

- Follow [LORE.md](LORE.md).
- `codex` additionally follows [CODEX.md](CODEX.md).
```

- `AGENTS_ch.md`：

```markdown
# AGENTS.md

- 遵守 [LORE_ch.md](LORE_ch.md)。
- `codex` 另外遵守 [CODEX_ch.md](CODEX_ch.md)。
```

- `CLAUDE.md`：

```markdown
@LORE.md

- If `.claude/skills` is missing or does not resolve to `.agents/skills`, MUST recreate it as a link before creating or using a skill; run at the repository root:
    - Windows PowerShell: `$l = Get-Item .claude/skills -Force -ErrorAction SilentlyContinue; if ($l.LinkType -or ($l -is [System.IO.DirectoryInfo] -and -not $l.GetFileSystemInfos())) { $l.Delete() }; New-Item -ItemType Directory -Force .claude, .agents/skills | Out-Null; New-Item -ItemType Junction -Path .claude/skills -Target (Resolve-Path .agents/skills)`
    - macOS/Linux: `{ [ -L .claude/skills ] && rm .claude/skills; [ ! -e .claude/skills ] || rmdir .claude/skills; } && mkdir -p .claude .agents/skills && ln -s ../.agents/skills .claude/skills`
    - If the link was created during the current session, MUST ask the user to run `/reload-skills` before using the skills in it.
```

- `CLAUDE_ch.md`：

```markdown
@LORE_ch.md

- 若 `.claude/skills` 不存在或未指向 `.agents/skills`，建立或使用 skill 前必須在 repo 根目錄重新建立 link：
    - Windows PowerShell：`$l = Get-Item .claude/skills -Force -ErrorAction SilentlyContinue; if ($l.LinkType -or ($l -is [System.IO.DirectoryInfo] -and -not $l.GetFileSystemInfos())) { $l.Delete() }; New-Item -ItemType Directory -Force .claude, .agents/skills | Out-Null; New-Item -ItemType Junction -Path .claude/skills -Target (Resolve-Path .agents/skills)`
    - macOS/Linux：`{ [ -L .claude/skills ] && rm .claude/skills; [ ! -e .claude/skills ] || rmdir .claude/skills; } && mkdir -p .claude .agents/skills && ln -s ../.agents/skills .claude/skills`
    - 若 link 是在目前 session 中建立，使用其中的 skill 前必須請使用者執行 `/reload-skills`。
```

- 沒有 Codex 專屬規則時，`CODEX.md` 與 `CODEX_ch.md` 只含 `# CODEX.md`。
    - 嚴禁在 `CODEX.md` 轉介到 LORE；`AGENTS.md` 已經轉介。

## LORE 內容

- 兩檔的 H1 都是 `# LORE`。
- 開頭用一到三個 bullet 說明：這個 repo 是什麼；有多個單元時，如何找到它們。
- 只有 repo 有對應事實時才加其他章節；嚴禁建立空章節。常見順序與 `_ch` 標題：
    1. `## Directory Index` / `## 目錄索引`：東西在哪裡；每個頂層目錄或關鍵檔案寫一個 link 加一行用途。
    2. 依主題分組的規則章節，例如 build、test、architecture。
    3. `## Document Structure` / `## 文件結構`：一律存在；見下方。
    4. `## Reading Guide` / `## 閱讀指引`：何時讀什麼；只在特定情境需要的文件寫成 `[path](path) when <condition>`。
- 讓 LORE 保持索引性質：連到資料來源，不複製會漂移的清單。
- `## Document Structure` 必須包含以下規則；只有存在子目錄 agent 檔時才加最後一條：

```markdown
## Document Structure

- Rules shared by every agent live in [LORE.md](LORE.md); host entry files hold only routing or rules for that host alone.
- `LORE`, `AGENTS`, `CLAUDE`, and `CODEX` MUST each have an English file without suffix and an equivalent Traditional Chinese file with the `_ch` suffix; MUST update both in the same change. Any other agent document MAY add a `_ch` counterpart, and the pair MUST then stay equivalent. A `_ch` file links to `_ch` targets when they exist.
- Agent documents hold only stable rules; MUST NOT write task progress, temporary state, or ongoing migrations into them.
- [README.md](README.md) is a Traditional Chinese human-reader document and the only `README.md` in the repository; an overview document in another directory is named after that directory in uppercase, e.g. `tools/TOOLS.md`.
- Project skills live in `.agents/skills/<skill-name>/`; MUST NOT create skill files directly under `.claude/skills`, which is a local link to `.agents/skills`.
- A subdirectory agent file such as `web/AGENTS.md` governs only its directory; MUST read it before working there.
```

```markdown
## 文件結構

- 所有 agent 共用的規則放在 [LORE_ch.md](LORE_ch.md)；host 入口檔只放轉介或僅適用該 host 的規則。
- `LORE`、`AGENTS`、`CLAUDE`、`CODEX` 必須各有無後綴的英文檔與加 `_ch` 後綴的等價繁體中文檔；兩者必須在同一次變更中更新。其他 agent 文件可以加 `_ch` 對應檔，加了之後兩者必須維持等價。`_ch` 檔在對應目標存在時連到 `_ch` 目標。
- agent 文件只放穩定規則；嚴禁寫入任務進度、暫時狀態或進行中的遷移。
- [README.md](README.md) 是繁體中文的人類讀者文件，也是 repo 內唯一的 `README.md`；其他目錄的概覽文件以該目錄名稱大寫命名，例如 `tools/TOOLS.md`。
- 專案 skill 放在 `.agents/skills/<skill-name>/`；嚴禁直接在 `.claude/skills` 建立 skill 檔案，它是指向 `.agents/skills` 的本機 link。
- 子目錄 agent 檔（例如 `web/AGENTS.md`）只管轄該目錄；在該目錄工作前必須先讀它。
```

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

## 流程

1. 載入 `write-md`。
2. 盤點 repo：
    - 任何深度的 agent 檔：`CLAUDE.md`、`AGENTS.md`、`AGENTS.override.md`、`CODEX.md`、`LORE.md`、`GEMINI.md`、`.cursorrules`、`.cursor/rules/`、`.github/copilot-instructions.md`；
    - 所有 `README.md`、`.claude/skills`、`.agents/skills`；
    - 建置與執行入口：`Makefile`、`package.json`、`go.mod`、`pyproject.toml` 等。
    - 找不到專案名稱、用途或啟動方式時，必須詢問使用者並等到回答後才寫任何檔案；嚴禁自行編造。
3. 把既有內容拆成單一項目，再依適用範圍（全 repo 或子目錄）、host（共用或 host 專屬）、穩定性（穩定或暫時）分類：
    - 全 repo、共用、穩定 -> `LORE.md`；專案描述放到 LORE 開頭與 README；
    - host 專屬、穩定 -> 該 host 入口檔的範本內容之後；
    - 某能力改為共用後，原本綁定 host 的語法，例如指向已搬到 `.agents/skills` 之 skill 的 Claude slash command -> 改成不綁 host 的寫法放進 `LORE.md`；
    - 子目錄 -> 留在該子目錄的檔案；
    - 暫時性內容，例如進度或「接下來完成 X」-> 若有合適的既有追蹤文件，逐字附加且不重整該文件；否則拿給使用者看並詢問。嚴禁默默刪除；
    - 重複或過時 -> 只有確定時才刪除，並列入報告。
    - 保留每條規則的意義、條件與強度：原文已是要求或禁止的寫成 `MUST` / `MUST NOT`；一般指示維持一般指示。嚴禁加強或減弱規則。
4. 其他 host 入口檔（`GEMINI.md`、`.cursorrules`、`AGENTS.override.md` 等）除非使用者要求，否則不動；在報告中逐一列出並說明其載入影響，例如根目錄有非空的 `AGENTS.override.md` 時，Codex 會略過 `AGENTS.md`。
5. Skill：
    1. 若 `.agents/skills` 是指向實體目錄 `.claude/skills` 的反向 link，只移除該 link 與其 `.gitignore` 項目；內容留在 `.claude/skills`。若它指向其他位置，保留並詢問使用者。
    2. 若 `.claude/skills` 是實體目錄，把內容搬到 `.agents/skills/`；同名 skill 在兩個實體目錄都有時，詢問使用者。
    3. 把 `.claude/skills` 加入 `.gitignore`；若 git 追蹤 `.claude/skills`，執行 `git rm --cached -r .claude/skills`。
    4. `.agents/skills` 存在時，執行 `CLAUDE.md` 的 link 指令；它也會移除搬移後留下的空目錄。
6. 把所有非根目錄的 `README.md` 改名為 `<DIR>.md` 並更新引用；不改寫其內容。若新名稱撞名，或有工具依賴原名稱（例如套件 manifest），回報衝突並保留原檔。
- 已追蹤的檔案用 `git mv` 搬移；未追蹤的檔案用一般搬移，並維持未追蹤。
7. 先寫英文 agent 檔，再寫其 `_ch` 對應檔，最後寫 `README.md`。
8. 驗收，然後回報。

## 驗收

1. 遷移檔案中的每條規則都只有一個邏輯去處（英文/`_ch` 一對算一處），並保留其條件與範圍；每個保留、搬移、刪除與待決項目都列入報告。
2. 所有相對連結與 host 匯入都可解析。
3. 每對英文/`_ch` 檔的內容與規範強度等價。
4. `README.md` 符合 README 契約。
5. `git check-ignore .claude/skills` 成功，且 `git ls-files .claude/skills` 沒有輸出；`.agents/skills` 存在時，`.claude/skills` 解析到它。
6. 再次對照本 skill 檢查結果，沒有剩下要搬移、改名或改寫的項目。
- 回報新增、修改、搬移、刪除的檔案；每個原有項目的去處；待問問題；以及任何未解決的衝突。仍有未解決衝突時，嚴禁宣稱完成。

## 常見錯誤

- README 用英文，或把標題譯成 `Getting Started` 之類 -> 標題是 `開始使用` 與 `專案概覽`。
- 寫成 `- Follow @LORE.md`（能匯入但與範本不同），或 `CLAUDE_ch.md` 缺少 `@LORE_ch.md` -> 逐字使用範本。
- 在 `_ch` 檔加上「譯本；以英文版為準」之類的標頭 -> 兩檔等價，不加標頭。
- `CODEX.md` 轉介到 LORE -> `CODEX.md` 只放 Codex 專屬規則。
- Junction 的 `-Target` 用相對路徑 -> PowerShell 7 會拒絕；範本使用 `(Resolve-Path .agents/skills)`。
- 等待使用者回答期間先寫出部分結構 -> 先問，回答後再寫。
