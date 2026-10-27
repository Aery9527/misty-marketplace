# LORE

- 這個 repo 是 AI Agent Skills marketplace：維護可重複使用的 skills，並以 Plugin Bundle 發布到 Claude Code 與 Codex。
- 讀取每個 `skills/*/SKILL.md` 的 YAML frontmatter（`name`、`description`）來探索 skills；`SKILL.md` 是英文入口，同目錄的 `*_ch.md` 是其繁體中文版本。

## 目錄索引

- [skills](skills) — skill 的 source of truth；skill 目錄內的所有內容都會隨該 skill 一起發布
- [.claude-plugin/marketplace.json](.claude-plugin/marketplace.json) — 所有 host 都能安裝的 bundle 目錄；其 `metadata.version` 是整個 repo 的版本
- [.agents/plugins/codex-only-bundles.json](.agents/plugins/codex-only-bundles.json) — 只有 Codex 能安裝的 bundle 目錄
- [.agents/plugins/marketplace.json](.agents/plugins/marketplace.json) 與 [codex-plugins](codex-plugins) — 同步腳本產生的 Codex 封裝；只含英文主檔
- [scripts](scripts) — 同步與驗證腳本
- [docs](docs) — 只給維護者看的文件，每個 skill 一個 `docs/<skill-name>/` 目錄
- [release-note](release-note) — 每個版本一份 release note
- [.agents/skills](.agents/skills) — 維護本 repo 用的 repo-local `commit` 與 `release` skill

## Bundle 目錄

- 每個 bundle 只在一份目錄中宣告，依「哪些 host 能安裝它」選擇：
    - 所有 host 都能用的 bundle 宣告在 [.claude-plugin/marketplace.json](.claude-plugin/marketplace.json)；Claude Code 讀取它，Codex 也從同一筆條目封裝。
    - 只有 Codex 能用的 bundle 宣告在 [.agents/plugins/codex-only-bundles.json](.agents/plugins/codex-only-bundles.json)，例如其 skills 用來驅動另一個 agent CLI。
    - 同一個 bundle 同時出現在兩份目錄時，同步腳本會拒絕執行。
- 新增、刪除、重新命名 skill，或把 skill 移到另一個 bundle 時，先更新其所屬目錄。
- 新增、刪除、重新命名 bundle，或可安裝它的 host 改變時，更新 [README.md](README.md) 的 Plugin Bundle 表。

## Codex 封裝同步

- 修改 [skills](skills) 或任一份目錄後，執行 [sync-codex-plugins.ps1](scripts/sync-codex-plugins.ps1) 或 [sync-codex-plugins.sh](scripts/sync-codex-plugins.sh)。
- 嚴禁手動修改 [.agents/plugins/marketplace.json](.agents/plugins/marketplace.json) 或 [codex-plugins](codex-plugins) 底下的 skill 副本；改 source 後重新執行同步腳本。
- 新增 Codex package 時，先建立 `codex-plugins/<plugin>/.codex-plugin/plugin.json`，再執行同步腳本；腳本會寫入其 `version`。
- Codex package 需要的 skill 以外 plugin-root 內容，例如 `commands/`、`agents/`、`scripts/` 與 `hooks.json`，放在所屬 skill 內的 `codex-plugin/` overlay 目錄：
    - 同步腳本把 overlay 的內容提升到 plugin root，並把 overlay 排除在封裝後的 skill 之外。
    - overlay 只擁有它自己宣告的項目，且嚴禁包含 `.codex-plugin` 或 `skills`。
    - 同步腳本會依 overlay 新增或移除 `plugin.json` 的 `"hooks": "./hooks.json"` 宣告；嚴禁手動修改。

## 注意事項

- `SKILL.md` 與 `references/` 底下的 Markdown 依照 [文件結構](#文件結構) 中根目錄文件的相同規則維持雙語，例如 `SKILL.md`=`SKILL_ch.md`。
- [README.md](README.md) 只寫專案層級內容；嚴禁列出包含的 skills，因為清單會與 frontmatter 漂移。
- 只寫給 skill 維護者看的文件必須放在 `docs/<skill-name>/`，不放在 skill 目錄內。
- skill 目錄內的相對 Markdown link 必須只指向該 skill 目錄內的內容，因為只有該目錄會隨 skill 一起發布；提到其他 skill 時改用 inline code 寫出名稱，例如 `write-md`。

## 文件結構

- 所有 agent 共用的規則放在 [LORE_ch.md](LORE_ch.md)；host 入口檔只放轉介或僅適用該 host 的規則。
- `LORE`、`AGENTS`、`CLAUDE`、`CODEX` 必須各有無後綴的英文檔與加 `_ch` 後綴的等價繁體中文檔；兩者必須在同一次變更中更新。其他 agent 文件可以加 `_ch` 對應檔，加了之後兩者必須維持等價。`_ch` 檔在對應目標存在時連到 `_ch` 目標。
- agent 文件只放穩定規則；嚴禁寫入任務進度、暫時狀態或進行中的遷移。
- [README.md](README.md) 是繁體中文的人類讀者文件，也是 repo 內唯一的 `README.md`；其他目錄的概覽文件以該目錄名稱大寫命名，例如 `tools/TOOLS.md`。
- 專案 skill 放在 `.agents/skills/<skill-name>/`；嚴禁直接在 `.claude/skills` 建立 skill 檔案，它是指向 `.agents/skills` 的本機 link。

## 閱讀指引

- [scripts/SCRIPTS.md](scripts/SCRIPTS.md)：執行或修改同步或驗證腳本時。
- [docs/claude/UPSTREAM-PARITY_ch.md](docs/claude/UPSTREAM-PARITY_ch.md)：修改 `skills/claude/codex-plugin/` 底下任何內容前；並在同一次變更中更新它。
