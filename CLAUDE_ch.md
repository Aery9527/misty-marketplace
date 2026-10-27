@LORE_ch.md

- 若 `.claude/skills` 不存在或未指向 `.agents/skills`，建立或使用 skill 前必須在 repo 根目錄重新建立 link：
    - Windows PowerShell：`$l = Get-Item .claude/skills -Force -ErrorAction SilentlyContinue; if ($l.LinkType -or ($l -is [System.IO.DirectoryInfo] -and -not $l.GetFileSystemInfos())) { $l.Delete() }; New-Item -ItemType Directory -Force .claude, .agents/skills | Out-Null; New-Item -ItemType Junction -Path .claude/skills -Target (Resolve-Path .agents/skills)`
    - macOS/Linux：`{ [ -L .claude/skills ] && rm .claude/skills; [ ! -e .claude/skills ] || rmdir .claude/skills; } && mkdir -p .claude .agents/skills && ln -s ../.agents/skills .claude/skills`
    - 若 link 是在目前 session 中建立，使用其中的 skill 前必須請使用者執行 `/reload-skills`。
