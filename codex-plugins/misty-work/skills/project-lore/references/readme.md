# README Output

## README Contract

- MUST write in Traditional Chinese; keep proper nouns and `write-md` navigation tokens (`Table of Contents`, `Back to top`) as-is.
- Project name source, in order: the existing README H1, the package or module manifest, the user.
- Section order:
    1. `# <project name>` followed by the purpose in one line.
    2. `## Table of Contents`.
    3. `## 開始使用` — prerequisites and commands verified in the repository, e.g. a `Makefile` target, a `package.json` script, the `go.mod` Go version, or given by the user; keep facts from the existing README.
    4. `## 專案概覽` — what the project is, its top-level parts at directory level, and the document-structure list below.
    5. Project-specific sections, e.g. existing license or deployment notes.
- `## 專案概覽` MUST contain this list; link `.agents/skills` only when the directory exists, otherwise use inline code:

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

- Include one Mermaid diagram as `write-md` requires:
    - if the project has a non-obvious structure or flow, diagram that;
    - otherwise diagram the document reading relations: `CLAUDE.md` imports `LORE.md`, `AGENTS.md` routes to `LORE.md`, and to `CODEX.md` for Codex only.
- Keep it minimal: MUST NOT copy a complete list that drifts from another source of truth, e.g. skills, endpoints, or files inside a module; link to the source instead. The few commands `開始使用` needs are not such a list.
