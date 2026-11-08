# LORE Output

## LORE 內容

- 兩檔的 H1 都是 `# LORE`。
- 開頭用一到三個 bullet 說明：這個 repo 是什麼；有多個單元時，如何找到它們。
- 只有 repo 有對應事實時才加其他章節；嚴禁建立空章節。常見順序與 `_ch` 標題：
    1. `## Directory Index` / `## 目錄索引`：東西在哪裡；每個頂層目錄或關鍵檔案寫一個 link 加一行用途。
    2. 依主題分組的規則章節，例如 build、test、architecture。
    3. `## Document Structure` / `## 文件結構`：一律存在；見下方。
    4. `## Reading Guide` / `## 閱讀指引`：何時讀什麼；只在特定情境需要的文件寫成 `[path](path) when <condition>`。
- 讓 LORE 保持索引性質：連到資料來源，不複製會漂移的清單。
- Git repo 的 LORE 必須包含以下共用分支規則：
    - 每次 session 開始時，必須在修改 repo 前確認目前分支。
    - 若在 `main`，且本 session 尚未詢問過工作分支，也未取得使用者的分支選擇，必須詢問是否改到 `develop` 或其他分支工作，並等使用者選擇後才修改。
    - 若在 `master`，建議切換至 `main` 並將 `main` 設為 repo 的預設分支；提出建議本身不代表獲准執行這兩項變更。
    - 使用者明確要求在 `main` 或 `master` 工作時，在其指定範圍內遵從該選擇，不重複詢問。
    - 同一個 session 嚴禁第二次詢問工作分支，包括開始新任務或分支改變後；除非使用者變更選擇，否則沿用其選擇。首次詢問尚未獲答時，繼續等待，嚴禁再次詢問。
- 產生 LORE 時，使用者若已明確指定長期分支政策，必須調整與其衝突的預設分支規則，不能保留互相矛盾的規則。僅限單次 session 或任務的允許，嚴禁改寫為長期規則。
- `## Document Structure` 必須包含以下規則；只有存在子目錄 agent 檔時才加最後一條：

```markdown
## Document Structure

- Rules shared by every agent live in [LORE.md](LORE.md); host entry files hold only routing or rules for that host alone.
- `LORE`, `AGENTS`, `CLAUDE`, and `CODEX` MUST each have an English file without suffix and an equivalent Traditional Chinese file with the `_ch` suffix; MUST update both in the same change. Any other agent document MAY add a `_ch` counterpart, and the pair MUST then stay equivalent. A `_ch` file links to `_ch` targets when they exist.
- Agent documents hold only stable rules; MUST NOT write task progress, temporary state, or ongoing migrations into them.
- [README.md](README.md) is a Traditional Chinese human-reader document.
- Project skills live in `.agents/skills/<skill-name>/`; MUST NOT create skill files directly under `.claude/skills`, which is a local link to `.agents/skills`.
- A subdirectory agent file such as `web/AGENTS.md` governs only its directory; MUST read it before working there.
```

```markdown
## 文件結構

- 所有 agent 共用的規則放在 [LORE_ch.md](LORE_ch.md)；host 入口檔只放轉介或僅適用該 host 的規則。
- `LORE`、`AGENTS`、`CLAUDE`、`CODEX` 必須各有無後綴的英文檔與加 `_ch` 後綴的等價繁體中文檔；兩者必須在同一次變更中更新。其他 agent 文件可以加 `_ch` 對應檔，加了之後兩者必須維持等價。`_ch` 檔在對應目標存在時連到 `_ch` 目標。
- agent 文件只放穩定規則；嚴禁寫入任務進度、暫時狀態或進行中的遷移。
- [README.md](README.md) 是繁體中文的人類讀者文件。
- 專案 skill 放在 `.agents/skills/<skill-name>/`；嚴禁直接在 `.claude/skills` 建立 skill 檔案，它是指向 `.agents/skills` 的本機 link。
- 子目錄 agent 檔（例如 `web/AGENTS.md`）只管轄該目錄；在該目錄工作前必須先讀它。
```
