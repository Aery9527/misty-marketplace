---
name: windows-script
description: >-
  撰寫、修改或審查 Windows 腳本（.ps1、.bat、.cmd），或處理 PowerShell 編碼、BOM、非 ASCII 內容、
  換行及 Windows PowerShell 5.1 相容性時使用。套用僅使用 .ps1 的慣例與依版本區分的
  PowerShell 規則。
---

# Windows Script 守則

- 本指引包含 PowerShell 行為與此 skill 的腳本慣例。
- 必須使用 `.ps1`；修改現有 `.bat` 或 `.cmd` 時，必須改寫為 `.ps1` 並更新受影響的呼叫端。
- 修改前必須確認支援的 PowerShell 版本；供 5.1 使用的範例嚴禁依賴 7+ 語法或參數。
- 目標版本不明時，必須保留既有相容性與 BOM；沒有呼叫端支援的依據時，嚴禁提高版本要求。新建或修改後含非 ASCII 字元的 UTF-8 `.ps1` 必須包含 BOM，5.1 與 7+ 皆可讀取。

## 錯誤與 Exit Code

- 預設 `Continue` 會顯示 cmdlet 的非終止錯誤並繼續執行。需要遇錯即停時，必須使用 `$ErrorActionPreference = 'Stop'` 或 `-ErrorAction Stop`；`try/catch` 捕捉終止錯誤。
- 呼叫外部程式後，必須立即保存 `$LASTEXITCODE`，並依該程式的 exit code 定義判斷結果。預設設定下，非零 exit code 本身不會觸發 `$ErrorActionPreference`；支援 `$PSNativeCommandUseErrorActionPreference` 的 PowerShell 版本可啟用此行為。
- 在 5.1 中，`Stop` 可讓重導的外部程式 stderr 觸發 `NativeCommandError`，即使程式成功也一樣。若為了擷取 stderr 而覆寫偏好設定，必須限於該次呼叫、用完還原，並繼續檢查 exit code。
- `$?` 表示上一個指令是否成功，也適用於外部程式；`$LASTEXITCODE` 保存最近的外部程式或明確使用 `exit` 的腳本的 exit code。嚴禁將殘留值視為後續 cmdlet 的結果。
- CLI 入口必須向呼叫端回報失敗。使用 `powershell.exe -File` 或 `pwsh -File` 時，因未處理的例外而終止會回傳 `1`，但非終止錯誤或未檢查的外部程式失敗仍可讓 process exit code 保持 `0`。
- 在 PowerShell 內用 `throw` 傳遞失敗；CLI 入口需要明確的 process 結果時用 `exit <code>`。嚴禁一律在結尾加入 `exit $LASTEXITCODE`；只有該指令決定整支腳本結果時，才轉傳剛保存的 code。

```powershell
$ErrorActionPreference = 'Stop'
git status --short
$commandExitCode = $LASTEXITCODE
if ($commandExitCode -ne 0) { throw "git status 失敗：exit $commandExitCode" }
```

## 字串、路徑與集合

- 字面字串用單引號；需要展開變數或跳脫序列時用雙引號。
- 含空白的路徑字面值必須加引號；以字串或變數表示的執行檔路徑必須用 `&` 呼叫。
- 用 `Join-Path` 組合路徑。需要相容 5.1 時，傳入一個子路徑或巢狀呼叫；多個子路徑參數需要 PowerShell 6.0+。
- 空集合用 `@()`；後續邏輯需要將零筆、一筆或多筆結果都視為陣列時，用 `@(command)`。

```powershell
$scriptPath = Join-Path $PSScriptRoot '../scripts/go-mod.ps1'
& 'C:\Program Files\Git\bin\git.exe' status
$items = @(Get-ChildItem -LiteralPath $PSScriptRoot -Filter '*.ps1')
```

## 檔案編碼與換行

- UTF-8 `.ps1` 若含非 ASCII 字元且必須支援 Windows PowerShell 5.1，必須保留或加入 BOM。PowerShell 7+ 可讀取無 BOM 的 UTF-8，包含非 ASCII 內容。
- 必須保留 repo 的換行慣例；BOM 與 CRLF/LF 互不相依。若編碼規範與上述相容性規則衝突，必須明確解決衝突，嚴禁默默移除 BOM 或放棄相容性。
- 必須依外部文字檔的實際編碼讀取。已知是 UTF-8 時，使用 `Get-Content -LiteralPath $path -Encoding UTF8`；嚴禁對其他編碼的檔案強制使用 UTF-8。
- 缺少 BOM 且未指定編碼時，5.1 `Get-Content` 使用系統 ANSI code page。將 UTF-8 誤讀為 Big5/GBK 可造成字元錯亂及合併行，讓註解遮蔽下一行設定。
- 檔案輸出有相容性要求時，必須明確選擇編碼；追加內容時必須保持原編碼。5.1 的 `-Encoding UTF8` 會寫入 BOM，7+ 則不會，因此 7+ 需要 BOM 時用 `utf8BOM`。5.1 的 `Out-File` 與 `>` 預設為 UTF-16LE。

## 外部程式編碼

- 必須區分腳本檔編碼、文字資料檔編碼及外部程式通訊編碼；修改其中一項不會設定其他項。
- `$OutputEncoding` 控制透過 pipeline 傳給外部程式的文字編碼；`[Console]::OutputEncoding` 影響 console 輸出與擷取外部程式文字輸出時的解碼。必須配合外部程式的編碼，嚴禁直接假定為 UTF-8 或某個語系的預設值。
- 與 UTF-8 程式通訊時，依需要使用下列設定。必須在 `finally` 還原變更的編碼設定；console code page 也可由不同 process 共用。

```powershell
$originalConsoleEncoding = [Console]::OutputEncoding
$originalOutputEncoding = $OutputEncoding
try {
    $utf8 = [Text.UTF8Encoding]::new($false)
    [Console]::OutputEncoding = $utf8
    $OutputEncoding = $utf8
    # 呼叫 UTF-8 程式
} finally {
    [Console]::OutputEncoding = $originalConsoleEncoding
    $OutputEncoding = $originalOutputEncoding
}
```

## 工作目錄

- 優先使用明確路徑。腳本若在呼叫端的 PowerShell session 內切換位置，必須保存原位置並在 `finally` 還原；獨立的 PowerShell process 無法改變父程序的位置。
- 使用保存位置的還原方式，避免依賴共用的 location stack。未配對的巢狀 `Push-Location` 會讓後續 `Pop-Location` 還原到錯誤的位置。
- 一般的 `return`、`exit` 及終止錯誤都會執行 `finally`；強制終止 process 時則無法保證清理。

```powershell
$originalLocation = Get-Location
try {
    Set-Location -LiteralPath (Join-Path $PSScriptRoot '..') -ErrorAction Stop
    # 腳本主體
} finally {
    Set-Location -LiteralPath $originalLocation.Path -ErrorAction Stop
}
```

## 互動式輸出

- 互動式 terminal 腳本的狀態訊息必須使用 `Write-Host -ForegroundColor`；背景／CI 腳本除外。必須保留文字標記，嚴禁只靠顏色表示狀態。
- 主標題、資源名稱與特殊選單選項用 `Cyan`；小節標題用 `Blue`。
- `[OK]`、成功計數與選單數字用 `Green`；`[X] ERROR` 與失敗計數用 `Red`；`[!]` 警告與取消用 `Yellow`。

## 驗證

- 必須在最舊的支援版本檢查語法與相關行為；若有影響，包含失敗 exit code 與非 ASCII 資料。會產生副作用的操作應使用隔離測試資料；只檢查語法不代表已驗證執行結果。
- 必要 runtime 不可用時，必須說明尚未驗證的版本與行為；7+ 執行成功不代表相容 5.1。
- 官方參考：[字元編碼](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_character_encoding)、[自動變數](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_automatic_variables)、[偏好變數](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_preference_variables)、[Join-Path](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/join-path)。
