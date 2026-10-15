# LORE

- 這個 repo 是 AI Agent Skills marketplace：維護可重複使用的 skills，並以 Plugin Bundle 發布到 Claude Code、GitHub Copilot CLI 與 Codex。
- 讀取每個 `skills/*/SKILL.md` 的 YAML frontmatter（`name`、`description`）來探索 skills；`SKILL.md` 是英文入口，同目錄的 `*_zhTW.md` 是其繁體中文版本。

## 目錄索引

- [skills](skills) — skill 的 source of truth；skill 目錄內的所有內容都會隨該 skill 一起發布
- [.claude-plugin/marketplace.json](.claude-plugin/marketplace.json) — 所有 host 都能安裝的 bundle 目錄；其 `metadata.version` 是整個 repo 的版本
- [.agents/plugins/codex-only-bundles.json](.agents/plugins/codex-only-bundles.json) — 只有 Codex 能安裝的 bundle 目錄
- [.agents/plugins/marketplace.json](.agents/plugins/marketplace.json) 與 [codex-plugins](codex-plugins) — 同步腳本產生的 Codex 封裝；只含英文主檔
- [scripts](scripts) — 同步、驗證與本機 link 腳本
- [docs](docs) — 只給維護者看的文件，每個 skill 一個 `docs/<skill-name>/` 目錄
- [release-note](release-note) — 每個版本一份 release note
- [.claude/skills](.claude/skills) — 維護本 repo 用的 repo-local `commit` 與 `release` skill

## Bundle 目錄

- 每個 bundle 只在一份目錄中宣告，依「哪些 host 能安裝它」選擇：
    - 所有 host 都能用的 bundle 宣告在 [.claude-plugin/marketplace.json](.claude-plugin/marketplace.json)；Claude Code 與 Copilot CLI 讀取它，Codex 也從同一筆條目封裝。
    - 只有 Codex 能用的 bundle 宣告在 [.agents/plugins/codex-only-bundles.json](.agents/plugins/codex-only-bundles.json)，例如其 skills 用來驅動另一個 agent CLI。
    - 同一個 bundle 同時出現在兩份目錄時，同步腳本會拒絕執行。
- 新增、刪除、重新命名 skill，或把 skill 移到另一個 bundle 時，先更新其所屬目錄。

## Codex 封裝同步

- 修改 [skills](skills) 或任一份目錄後，執行 [sync-codex-plugins.ps1](scripts/sync-codex-plugins.ps1) 或 [sync-codex-plugins.sh](scripts/sync-codex-plugins.sh)。
- 嚴禁手動修改 [.agents/plugins/marketplace.json](.agents/plugins/marketplace.json) 或 [codex-plugins](codex-plugins) 底下的 skill 副本；改 source 後重新執行同步腳本。
- 新增 Codex package 時，先建立 `codex-plugins/<plugin>/.codex-plugin/plugin.json`，再執行同步腳本；腳本會寫入其 `version`。
- Codex package 需要的 skill 以外 plugin-root 內容，例如 `commands/`、`agents/`、`scripts/` 與 `hooks.json`，放在所屬 skill 內的 `codex-plugin/` overlay 目錄：
    - 同步腳本把 overlay 的內容提升到 plugin root，並把 overlay 排除在封裝後的 skill 之外。
    - overlay 只擁有它自己宣告的項目，且嚴禁包含 `.codex-plugin` 或 `skills`。
    - 同步腳本會依 overlay 新增或移除 `plugin.json` 的 `"hooks": "./hooks.json"` 宣告；嚴禁手動修改。

## 注意事項

- AI agent 文件必須維持雙語且內容等價：無後綴的檔案是英文版，同 basename 加 `_zhTW` 是繁體中文版，例如 `SKILL.md`=`SKILL_zhTW.md`、`LORE.md`=`LORE_zhTW.md`。
    - 適用於 `SKILL.md`、`references/` 底下的 Markdown，以及根目錄的 instruction 文件。
    - 兩個語系必須在同一次變更中同步更新。
    - 繁體中文檔案在目標存在 `_zhTW` 版本時，連結指向 `_zhTW` 版本。
- [README.md](README.md) 是只用繁體中文撰寫的人類讀者文件；只寫專案層級內容，嚴禁列出包含的 skills，因為清單會與 frontmatter 漂移。
- 只寫給 skill 維護者看的文件必須放在 `docs/<skill-name>/`，不放在 skill 目錄內。
- 在 `SKILL.md` 或 `references/` 內，嚴禁用相對 Markdown link 指向另一個 skill，因為安裝後的 skills 不保證相鄰；改用 inline code 寫出名稱，例如 `write-md`。

## 閱讀指引

- [scripts/README.md](scripts/README.md)：執行或修改同步、驗證、link 腳本時。
- [docs/claude/UPSTREAM-PARITY_zhTW.md](docs/claude/UPSTREAM-PARITY_zhTW.md)：修改 `skills/claude/codex-plugin/` 底下任何內容前；並在同一次變更中更新它。
