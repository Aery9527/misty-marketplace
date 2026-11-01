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

## Shared Output Rules

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

- This skill overrides `write-md` only here:
    - Host import lines such as `@LORE.md` stay bare import syntax.
    - A path that does not exist in the repository, e.g. an example, a placeholder, or the local link `.claude/skills`, uses inline code instead of a Markdown link.
    - Template text is copied verbatim; its inline-code paths stay inline code.

## Required References

- Before writing a deliverable, MUST load its reference below; each agent-document reference covers both the English and `_ch` files:
    - [LORE output](references/lore.md).
    - [AGENTS output](references/agents.md).
    - [CLAUDE output](references/claude.md).
    - [CODEX output](references/codex.md).
    - [README output](references/readme.md).

## Workflow

- Move tracked files with `git mv`; move untracked files with a plain move and keep them untracked.

1. Load `write-md`.
2. Inventory the repository:
    - agent files at any depth: `CLAUDE.md`, `AGENTS.md`, `AGENTS.override.md`, `CODEX.md`, `LORE.md`, `GEMINI.md`, `.github/copilot-instructions.md`;
    - the root `README.md`, `.claude/skills`, `.agents/skills`;
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
    4. When `.agents/skills` exists, create or repair `.claude/skills` as a local link to it using commands suited to the current environment; preserve existing skill contents.
6. Write the English agent files, then their `_ch` counterparts, then `README.md`.
7. Verify, then report.

## Verification

1. Every rule in the migrated files has exactly one logical destination, counting an English/`_ch` pair as one, with its condition and scope preserved; every kept, moved, deleted, and pending item is in the report.
2. Every relative link and host import resolves.
3. Each English/`_ch` pair is equivalent in content and normative strength.
4. `README.md` follows the [README Contract](references/readme.md#readme-contract).
5. `git check-ignore .claude/skills` succeeds and `git ls-files .claude/skills` prints nothing; when `.agents/skills` exists, `.claude/skills` resolves to it.
6. Checking the result against this skill and the [deliverable references](#required-references) again finds nothing left to move or rewrite.
- Report the created, modified, moved, and deleted files; the destination of every original item; open questions; and any unresolved conflict. MUST NOT claim completion while a conflict is unresolved.

## Common Mistakes

- English README or translated headings such as `Getting Started` -> headings are `開始使用` and `專案概覽`.
- `- Follow @LORE.md`, which imports but differs from the template, or `CLAUDE_ch.md` without `@LORE_ch.md` -> use the templates verbatim.
- A `_ch` header such as "translation; English is canonical" -> the pair is equivalent; no header.
- `CODEX.md` routing to LORE -> `CODEX.md` holds Codex-only rules only.
- Writing a partial structure while waiting for the user's answer -> ask first, write after.
