---
name: windows-script
description: >-
  Use when writing, modifying, or reviewing Windows scripts (.ps1, .bat, .cmd),
  or handling PowerShell encoding, BOM, line endings, non-ASCII content, or Windows PowerShell 5.1
  compatibility. Applies .ps1-only scripting and version-aware PowerShell rules.
---

# Windows Script Rules

- These rules combine PowerShell behavior with this skill's scripting conventions.
- MUST use `.ps1`; when modifying an existing `.bat` or `.cmd`, rewrite it as `.ps1` and update the affected callers.
- MUST establish the supported PowerShell versions before editing; examples intended for 5.1 MUST NOT depend on 7+ syntax or parameters.
- When the target version is unclear, MUST preserve existing compatibility and BOMs; MUST NOT introduce a higher version requirement without evidence that the caller supports it. For new or edited UTF-8 `.ps1` files containing non-ASCII characters, MUST include a BOM, which both 5.1 and 7+ read.

## Errors and Exit Codes

- With the default `Continue` preference, cmdlets report non-terminating errors without stopping. When failure must stop execution, MUST use `$ErrorActionPreference = 'Stop'` or `-ErrorAction Stop`; `try/catch` catches terminating errors.
- For external programs, MUST capture `$LASTEXITCODE` immediately and interpret it using that program's exit-code contract. Under default settings, a nonzero exit code alone does not trigger `$ErrorActionPreference`; PowerShell versions supporting `$PSNativeCommandUseErrorActionPreference` can opt into that behavior.
- On 5.1, redirected native stderr can raise `NativeCommandError` under `Stop`, even on success. If overriding the preference to capture stderr, MUST limit the override to that call, restore it, and still check the exit code.
- `$?` reports the last command's success, including external programs; `$LASTEXITCODE` holds the last native program's or explicitly exiting script's exit code. MUST NOT treat a stale value as the result of a later cmdlet.
- CLI entrypoints MUST report failure to their caller. With `powershell.exe -File` or `pwsh -File`, termination by an unhandled exception returns `1`, but non-terminating errors or unchecked native failures can still leave the process exit code at `0`.
- Use `throw` to propagate failure within PowerShell; use `exit <code>` at a CLI entrypoint when an explicit process result is required. MUST NOT append `exit $LASTEXITCODE` indiscriminately; forward a freshly captured code only when that command determines the script's result.

```powershell
$ErrorActionPreference = 'Stop'
git status --short
$commandExitCode = $LASTEXITCODE
if ($commandExitCode -ne 0) { throw "git status failed: exit $commandExitCode" }
```

## Strings, Paths, and Collections

- Use single quotes for literal strings and double quotes when variable or escape expansion is needed.
- MUST quote literal paths containing spaces; MUST invoke an executable path held in a string or variable with `&`.
- Use `Join-Path` for path composition. For 5.1 compatibility, pass one child path or nest calls; multiple child arguments require PowerShell 6.0+.
- Use `@()` for an empty collection and `@(command)` when downstream logic needs an array for zero, one, or many results.

```powershell
$scriptPath = Join-Path $PSScriptRoot '../scripts/go-mod.ps1'
& 'C:\Program Files\Git\bin\git.exe' status
$items = @(Get-ChildItem -LiteralPath $PSScriptRoot -Filter '*.ps1')
```

## File Encoding and Line Endings

- For UTF-8 `.ps1` files that contain non-ASCII characters and must run on Windows PowerShell 5.1, MUST preserve or add a BOM. PowerShell 7+ accepts UTF-8 without BOM, including non-ASCII content.
- MUST preserve the repository's line-ending convention; BOM and CRLF/LF are independent. If its encoding policy conflicts with these compatibility rules, resolve the conflict explicitly rather than silently stripping the BOM or dropping compatibility.
- MUST read external text using its actual encoding. For known UTF-8 files, use `Get-Content -LiteralPath $path -Encoding UTF8`; MUST NOT force UTF-8 onto files encoded differently.
- Without a BOM or explicit encoding, 5.1 `Get-Content` uses the system ANSI code page. Misreading UTF-8 as Big5/GBK can corrupt characters and merge lines; comments can then hide the following setting.
- MUST choose file output encoding explicitly when compatibility matters and preserve it when appending. In 5.1, `-Encoding UTF8` writes a BOM; in 7+, it does not, so use `utf8BOM` when a BOM is required. 5.1 `Out-File` and `>` default to UTF-16LE.

## External Program Encoding

- MUST distinguish script-file encoding, text-file encoding, and communication with external programs; changing one does not configure the others.
- `$OutputEncoding` controls text sent through a pipeline to external programs; `[Console]::OutputEncoding` affects console output and decoding of captured native text output. MUST match the external program's encoding instead of assuming UTF-8 or a locale-specific default.
- When communicating with a UTF-8 program, use the following settings as needed. MUST restore changed encoding settings in `finally`; console code pages can also be shared across processes.

```powershell
$originalConsoleEncoding = [Console]::OutputEncoding
$originalOutputEncoding = $OutputEncoding
try {
    $utf8 = [Text.UTF8Encoding]::new($false)
    [Console]::OutputEncoding = $utf8
    $OutputEncoding = $utf8
    # Call the UTF-8 program
} finally {
    [Console]::OutputEncoding = $originalConsoleEncoding
    $OutputEncoding = $originalOutputEncoding
}
```

## Working Directory

- Prefer explicit paths. If a script changes location in the caller's PowerShell session, MUST save the original location and restore it in `finally`; a separate PowerShell process cannot change its parent's location.
- Use saved-location restoration rather than relying on a shared location stack. An unmatched nested `Push-Location` can make a later `Pop-Location` restore the wrong entry.
- `finally` runs on ordinary `return`, `exit`, and terminating-error paths; it cannot guarantee cleanup after forced process termination.

```powershell
$originalLocation = Get-Location
try {
    Set-Location -LiteralPath (Join-Path $PSScriptRoot '..') -ErrorAction Stop
    # Script body
} finally {
    Set-Location -LiteralPath $originalLocation.Path -ErrorAction Stop
}
```

## Interactive Output

- Interactive terminal scripts MUST use `Write-Host -ForegroundColor` for status messages; background/CI scripts are exempt. MUST retain text labels so color is not the only indication of status.
- Use `Cyan` for main titles, resource names, and special menu options; `Blue` for section headings.
- Use `Green` for `[OK]`, successful counts, and numbered menu choices; `Red` for `[X] ERROR` and failure counts; `Yellow` for `[!]` warnings and cancellation.

## Verification

- MUST check parsing and relevant behavior on the oldest supported PowerShell version, including failure exit codes and non-ASCII data when affected. Use isolated fixtures for side effects; a parse check alone does not verify execution.
- If a required runtime is unavailable, MUST state which version and behavior remain unverified; a successful 7+ run is not evidence of 5.1 compatibility.
- Official references: [character encoding](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_character_encoding), [automatic variables](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_automatic_variables), [preference variables](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_preference_variables), and [Join-Path](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/join-path).
