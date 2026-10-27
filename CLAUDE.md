@LORE.md

- If `.claude/skills` is missing or does not resolve to `.agents/skills`, MUST recreate it as a link before creating or using a skill; run at the repository root:
    - Windows PowerShell: `$l = Get-Item .claude/skills -Force -ErrorAction SilentlyContinue; if ($l.LinkType -or ($l -is [System.IO.DirectoryInfo] -and -not $l.GetFileSystemInfos())) { $l.Delete() }; New-Item -ItemType Directory -Force .claude, .agents/skills | Out-Null; New-Item -ItemType Junction -Path .claude/skills -Target (Resolve-Path .agents/skills)`
    - macOS/Linux: `{ [ -L .claude/skills ] && rm .claude/skills; [ ! -e .claude/skills ] || rmdir .claude/skills; } && mkdir -p .claude .agents/skills && ln -s ../.agents/skills .claude/skills`
    - If the link was created during the current session, MUST ask the user to run `/reload-skills` before using the skills in it.
