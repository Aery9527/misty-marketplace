---
name: project-lore
description: >-
  Use when creating or organizing a repository's root agent instruction files
  (`CLAUDE.md`, `AGENTS.md`, `CODEX.md`, `LORE.md`, `GEMINI.md`) and `README.md`,
  or when handling the location of project skills. Not for routine edits to one rule or one README section.
---

# Project LORE

- Builds or migrates a repository's root document structure: one shared rule file, thin host entry files, equivalent Traditional Chinese counterparts, and a minimal human README.
- **REQUIRED SUB-SKILL:** MUST load `write-md` from its English `SKILL.md` and references before writing any file; apply its AI-agent rules to agent documents and its human-reader rules to `README.md`.
- This skill overrides `write-md` only here:
    - Host import lines such as `@LORE.md` stay bare import syntax.
    - A path that does not exist in the repository, e.g. an example, a placeholder, or the local link `.claude/skills`, uses inline code instead of a Markdown link.
    - Template text is copied verbatim; its inline-code paths stay inline code.

## Output Contract

- The repository root MUST contain these nine documents:
    - `LORE.md` / `LORE_ch.md` — repository-wide guidance shared by every agent, and the reading entry.
    - `AGENTS.md` / `AGENTS_ch.md` — routing only.
    - `CLAUDE.md` / `CLAUDE_ch.md` — Claude Code entry: imports LORE, then Claude-only rules.
    - `CODEX.md` / `CODEX_ch.md` — Codex-only rules; heading only when there are none.
    - `README.md` — human entry, Traditional Chinese only.
- `.gitignore` MUST list `.claude/skills`. Project skills live in `.agents/skills/<skill-name>/`; when `.agents/skills` exists, `.claude/skills` MUST be a local link to it.
- A file without suffix is English; `<basename>_ch.md` is its Traditional Chinese counterpart.
    - The pair MUST be equivalent in content and normative strength: `MUST` = `必須`, `MUST NOT` = `嚴禁`.
    - MUST NOT mark either file as a translation or as canonical.
    - The H1 stays the same in both files; translate other headings.
    - A `_ch` file links to the `_ch` target when that target exists; otherwise to the original target.

## Entry File Templates

- Write these files exactly; append host-only rules after the template lines only when they exist.
- `AGENTS.md`:

```markdown
# AGENTS.md

- Follow [LORE.md](LORE.md).
- `codex` additionally follows [CODEX.md](CODEX.md).
```

- `AGENTS_ch.md`:

```markdown
# AGENTS.md

- 遵守 [LORE_ch.md](LORE_ch.md)。
- `codex` 另外遵守 [CODEX_ch.md](CODEX_ch.md)。
```

- `CLAUDE.md`:

```markdown
@LORE.md

- If `.claude/skills` is missing or does not resolve to `.agents/skills`, MUST recreate it as a link before creating or using a skill; run at the repository root:
    - Windows PowerShell: `$l = Get-Item .claude/skills -Force -ErrorAction SilentlyContinue; if ($l.LinkType -or ($l -is [System.IO.DirectoryInfo] -and -not $l.GetFileSystemInfos())) { $l.Delete() }; New-Item -ItemType Directory -Force .claude, .agents/skills | Out-Null; New-Item -ItemType Junction -Path .claude/skills -Target (Resolve-Path .agents/skills)`
    - macOS/Linux: `{ [ -L .claude/skills ] && rm .claude/skills; [ ! -e .claude/skills ] || rmdir .claude/skills; } && mkdir -p .claude .agents/skills && ln -s ../.agents/skills .claude/skills`
    - If the link was created during the current session, MUST ask the user to run `/reload-skills` before using the skills in it.
```

- `CLAUDE_ch.md`:

```markdown
@LORE_ch.md

- 若 `.claude/skills` 不存在或未指向 `.agents/skills`，建立或使用 skill 前必須在 repo 根目錄重新建立 link：
    - Windows PowerShell：`$l = Get-Item .claude/skills -Force -ErrorAction SilentlyContinue; if ($l.LinkType -or ($l -is [System.IO.DirectoryInfo] -and -not $l.GetFileSystemInfos())) { $l.Delete() }; New-Item -ItemType Directory -Force .claude, .agents/skills | Out-Null; New-Item -ItemType Junction -Path .claude/skills -Target (Resolve-Path .agents/skills)`
    - macOS/Linux：`{ [ -L .claude/skills ] && rm .claude/skills; [ ! -e .claude/skills ] || rmdir .claude/skills; } && mkdir -p .claude .agents/skills && ln -s ../.agents/skills .claude/skills`
    - 若 link 是在目前 session 中建立，使用其中的 skill 前必須請使用者執行 `/reload-skills`。
```

- `CODEX.md` and `CODEX_ch.md` without Codex-only rules contain only `# CODEX.md`.
    - MUST NOT route to LORE from `CODEX.md`; `AGENTS.md` already does.

## LORE Content

- H1 is `# LORE` in both files.
- Open with one to three bullets: what the repository is, and, when it has several units, how to find them.
- Add further sections only when the repository has facts for them; MUST NOT create empty sections. Typical order, with `_ch` headings:
    1. `## Directory Index` / `## 目錄索引` — where things are: one link plus one-line role per top-level directory or key file.
    2. Topic rule sections grouped by subject, e.g. build, test, architecture.
    3. `## Document Structure` / `## 文件結構` — always present; see below.
    4. `## Reading Guide` / `## 閱讀指引` — what to read when: `[path](path) when <condition>` for documents needed only in specific situations.
- Keep LORE an index: link to the source of truth instead of copying lists that drift.
- `## Document Structure` MUST contain these rules; append the last rule only when a subdirectory agent file exists:

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

## Workflow

1. Load `write-md`.
2. Inventory the repository:
    - agent files at any depth: `CLAUDE.md`, `AGENTS.md`, `AGENTS.override.md`, `CODEX.md`, `LORE.md`, `GEMINI.md`, `.github/copilot-instructions.md`;
    - every `README.md`, `.claude/skills`, `.agents/skills`;
    - build and run entry points: `Makefile`, `package.json`, `go.mod`, `pyproject.toml`, and similar.
    - If the project name, purpose, or how to start cannot be found, MUST ask the user and wait for the answer before writing any file; MUST NOT invent them.
3. Split existing content into single items, then classify each by scope (repository-wide or subdirectory), host (shared or host-only), and stability (stable or transient):
    - repository-wide, shared, stable -> `LORE.md`; a project description goes to the LORE opening and the README;
    - host-only, stable -> that host's entry file after the template lines;
    - host-specific syntax for a capability that becomes shared, e.g. a Claude slash command for a skill moved to `.agents/skills` -> host-neutral wording in `LORE.md`;
    - subdirectory -> stays in its subdirectory file;
    - transient, e.g. progress or "next, finish X" -> append verbatim to an existing tracking document if one fits, without restructuring it; otherwise show it to the user and ask. MUST NOT delete it silently;
    - duplicate or obsolete -> delete only when certain, and report it.
    - Keep each rule's meaning, condition, and strength: wording that already requires or forbids becomes `MUST` / `MUST NOT`; a plain instruction stays plain. MUST NOT strengthen or weaken a rule.
4. Leave other host entry files (`GEMINI.md`, `AGENTS.override.md`, and similar) untouched unless the user asks; report each with its loading effect, e.g. a non-empty root `AGENTS.override.md` makes Codex skip `AGENTS.md`.
5. Skills:
    1. If `.agents/skills` is a reverse link to the real directory `.claude/skills`, remove only the link and its `.gitignore` entry; the content stays in `.claude/skills`. If it links anywhere else, keep it and ask the user.
    2. If `.claude/skills` is a real directory, move its contents into `.agents/skills/`; if a skill name exists in both real directories, ask the user.
    3. Add `.claude/skills` to `.gitignore`; if git tracks `.claude/skills`, run `git rm --cached -r .claude/skills`.
    4. When `.agents/skills` exists, run the `CLAUDE.md` link command; it also removes the empty directory the move leaves behind.
6. Rename every non-root `README.md` to `<DIR>.md` and update references; do not rewrite its content. If the new name collides or a tool depends on the original name, e.g. a package manifest, report the conflict and keep the file.
- Move tracked files with `git mv`; move untracked files with a plain move and keep them untracked.
7. Write the English agent files, then their `_ch` counterparts, then `README.md`.
8. Verify, then report.

## Verification

1. Every rule in the migrated files has exactly one logical destination, counting an English/`_ch` pair as one, with its condition and scope preserved; every kept, moved, deleted, and pending item is in the report.
2. Every relative link and host import resolves.
3. Each English/`_ch` pair is equivalent in content and normative strength.
4. `README.md` follows the README Contract.
5. `git check-ignore .claude/skills` succeeds and `git ls-files .claude/skills` prints nothing; when `.agents/skills` exists, `.claude/skills` resolves to it.
6. Checking the result against this skill again finds nothing left to move, rename, or rewrite.
- Report the created, modified, moved, and deleted files; the destination of every original item; open questions; and any unresolved conflict. MUST NOT claim completion while a conflict is unresolved.

## Common Mistakes

- English README or translated headings such as `Getting Started` -> headings are `開始使用` and `專案概覽`.
- `- Follow @LORE.md`, which imports but differs from the template, or `CLAUDE_ch.md` without `@LORE_ch.md` -> use the templates verbatim.
- A `_ch` header such as "translation; English is canonical" -> the pair is equivalent; no header.
- `CODEX.md` routing to LORE -> `CODEX.md` holds Codex-only rules only.
- Junction with a relative `-Target` -> PowerShell 7 rejects it; the template uses `(Resolve-Path .agents/skills)`.
- Writing a partial structure while waiting for the user's answer -> ask first, write after.
