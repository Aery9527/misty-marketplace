# CLAUDE Output

- Write these files exactly; append host-only rules after the template lines only when they exist.
- `CLAUDE.md`:

```markdown
@LORE.md

- If `.claude/skills` is missing or does not resolve to `.agents/skills`, MUST create or repair the local link before creating or using a skill, preserving existing skill contents; choose the link type and commands for the current operating system and shell.
    - If the link was created or repaired during the current session, MUST ask the user to reload skills using the current environment's supported mechanism before using the skills in it.
```

- `CLAUDE_ch.md`:

```markdown
@LORE_ch.md

- 若 `.claude/skills` 不存在或未指向 `.agents/skills`，建立或使用 skill 前必須建立或修復本機 link，並保留既有 skill 內容；依目前作業系統與 shell 自行選擇連結類型及指令。
    - 若 link 是在目前 session 中建立或修復，使用其中的 skill 前必須請使用者依目前環境支援的方式重新載入 skill。
```
