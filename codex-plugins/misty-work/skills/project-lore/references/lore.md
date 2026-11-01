# LORE Output

## LORE Content

- H1 is `# LORE` in both files.
- Open with one to three bullets: what the repository is, and, when it has several units, how to find them.
- Add further sections only when the repository has facts for them; MUST NOT create empty sections. Typical order, with `_ch` headings:
    1. `## Directory Index` / `## 目錄索引` — where things are: one link plus one-line role per top-level directory or key file.
    2. Topic rule sections grouped by subject, e.g. build, test, architecture.
    3. `## Document Structure` / `## 文件結構` — always present; see below.
    4. `## Reading Guide` / `## 閱讀指引` — what to read when: `[path](path) when <condition>` for documents needed only in specific situations.
- Keep LORE an index: link to the source of truth instead of copying lists that drift.
- For a Git repository, MUST include these shared branch rules in LORE:
    - At the start of a session, MUST check the current branch before making repository changes.
    - On `main`, if no working-branch question has been asked and no branch choice has been provided in this session, MUST ask whether to work on `develop` or another branch and wait for the user's choice before making changes.
    - On `master`, recommend switching to `main` and setting `main` as the repository's default branch; the recommendation alone does not authorize either change.
    - If the user explicitly requests work on `main` or `master`, follow that choice without asking again for its stated scope.
    - MUST NOT ask about the working branch more than once in the same session, including after a new task starts or the branch changes; retain the user's choice unless the user changes it. If the first question is unanswered, keep waiting without asking again.
- When generating LORE, MUST adapt the conflicting branch defaults to any explicit standing branch policy from the user, rather than keep contradictory rules. Permission limited to one session or task MUST NOT become a standing rule.
- `## Document Structure` MUST contain these rules; append the last rule only when a subdirectory agent file exists:

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
