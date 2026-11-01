---
name: project-lore
description: >-
  建立或整理 repo 根目錄的 agent 指令檔（`CLAUDE.md`、`AGENTS.md`、
  `CODEX.md`、`LORE.md`、`GEMINI.md`）與 `README.md`，
  或處理專案 skill 位置時使用。不用於修改單一規則或單一 README 章節。
---

# Project LORE

- 建立或遷移 repo 的根目錄文件結構：一份共用規則檔、精簡的 host 入口檔、等價的繁體中文對應檔，以及一份精簡的人類讀者 README。
- **必要 SUB-SKILL：** 寫任何檔案前必須從英文版 `SKILL.md` 與 references 載入 `write-md`；agent 文件套用其 AI agent 規則，`README.md` 套用其人類讀者規則。

## 共用產出規則

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

- 本 skill 只在以下幾處覆蓋 `write-md`：
    - `@LORE.md` 這類 host 匯入行維持裸寫的匯入語法。
    - repo 內不存在的路徑，例如範例、佔位符或本機 link `.claude/skills`，使用 inline code，不用 Markdown link。
    - 範本文字逐字照抄；範本內以 inline code 寫的路徑維持 inline code。

## 必讀參考

- 撰寫各產出物前，必須載入下列對應參考檔；agent 文件的參考檔同時規範英文與 `_ch` 檔：
    - [LORE 產出規格](references/lore_ch.md)。
    - [AGENTS 產出規格](references/agents_ch.md)。
    - [CLAUDE 產出規格](references/claude_ch.md)。
    - [CODEX 產出規格](references/codex_ch.md)。
    - [README 產出規格](references/readme_ch.md)。

## 流程

- 已追蹤的檔案用 `git mv` 搬移；未追蹤的檔案用一般搬移，並維持未追蹤。

1. 載入 `write-md`。
2. 盤點 repo：
    - 任何深度的 agent 檔：`CLAUDE.md`、`AGENTS.md`、`AGENTS.override.md`、`CODEX.md`、`LORE.md`、`GEMINI.md`、`.github/copilot-instructions.md`；
    - 根目錄的 `README.md`、`.claude/skills`、`.agents/skills`；
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
4. 其他 host 入口檔（`GEMINI.md`、`AGENTS.override.md` 等）除非使用者要求，否則不動；在報告中逐一列出並說明其載入影響，例如根目錄有非空的 `AGENTS.override.md` 時，Codex 會略過 `AGENTS.md`。
5. Skill：
    1. 若 `.agents/skills` 是指向實體目錄 `.claude/skills` 的反向 link，只移除該 link 與其 `.gitignore` 項目；內容留在 `.claude/skills`。若它指向其他位置，保留並詢問使用者。
    2. 若 `.claude/skills` 是實體目錄，把內容搬到 `.agents/skills/`；同名 skill 在兩個實體目錄都有時，詢問使用者。
    3. 把 `.claude/skills` 加入 `.gitignore`；若 git 追蹤 `.claude/skills`，執行 `git rm --cached -r .claude/skills`。
    4. `.agents/skills` 存在時，依目前環境選擇指令，將 `.claude/skills` 建立或修復為指向它的本機 link；保留既有 skill 內容。
6. 先寫英文 agent 檔，再寫其 `_ch` 對應檔，最後寫 `README.md`。
7. 驗收，然後回報。

## 驗收

1. 遷移檔案中的每條規則都只有一個邏輯去處（英文/`_ch` 一對算一處），並保留其條件與範圍；每個保留、搬移、刪除與待決項目都列入報告。
2. 所有相對連結與 host 匯入都可解析。
3. 每對英文/`_ch` 檔的內容與規範強度等價。
4. `README.md` 符合[README 契約](references/readme_ch.md#readme-契約)。
5. `git check-ignore .claude/skills` 成功，且 `git ls-files .claude/skills` 沒有輸出；`.agents/skills` 存在時，`.claude/skills` 解析到它。
6. 再次對照本 skill 與[各產出物的參考檔](#必讀參考)檢查結果，沒有剩下要搬移或改寫的項目。
- 回報新增、修改、搬移、刪除的檔案；每個原有項目的去處；待問問題；以及任何未解決的衝突。仍有未解決衝突時，嚴禁宣稱完成。

## 常見錯誤

- README 用英文，或把標題譯成 `Getting Started` 之類 -> 標題是 `開始使用` 與 `專案概覽`。
- 寫成 `- Follow @LORE.md`（能匯入但與範本不同），或 `CLAUDE_ch.md` 缺少 `@LORE_ch.md` -> 逐字使用範本。
- 在 `_ch` 檔加上「譯本；以英文版為準」之類的標頭 -> 兩檔等價，不加標頭。
- `CODEX.md` 轉介到 LORE -> `CODEX.md` 只放 Codex 專屬規則。
- 等待使用者回答期間先寫出部分結構 -> 先問，回答後再寫。
