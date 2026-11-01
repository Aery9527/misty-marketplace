---
name: misty-commit
description: >-
  用於準備 Git commit、選擇提交邊界、暫存變更、撰寫或審查 commit message，
  或拆分混合變更。優先建立準確、有意義且能支援 release notes 的歷史紀錄。
---

# Misty Commit

- 每個 commit 應說明一項連貫的變更及其意義。使用者指示與儲存庫慣例優先於下列預設值。
- 依請求執行：只要求訊息時就產出訊息；暫存或建立 commit 必須在授權範圍內。本地 commit 不代表授權 push、rebase、merge 或清理工作樹。

## 檢查與選擇

1. 閱讀儲存庫的提交規則與近期歷史，確認訊息格式、語言、scope 與必要 trailer。
2. 檢查 `git status --short`、`git diff` 與 `git diff --cached`；納入未追蹤檔案前先閱讀內容。必須檢查實際內容，不能只看檔名或差異統計。
3. 從 diff 與任務情境確認預期行為或維護成果。若無法確認目的，應提出明確問題，嚴禁編造。
4. 依意圖分組。實作、測試、文件與產生檔若共同交付同一成果，應一起提交；可獨立成立的變更應拆分。保留無關修改與既有暫存；若既有暫存與預期邊界衝突，必須先釐清再提交。
5. 已授權暫存時，只暫存預期的檔案或 hunk。暫存或提交時，定稿訊息前先檢查最終 staged diff；暫存差異為空不構成建立空 commit 的理由。只要求訊息時，應描述前述步驟選定的變更，不改動 index，也不納入無關的暫存內容。

## 撰寫訊息

- Subject 必須描述具體成果、行為或設計意圖。細節應足以與其他 commit 區分，無須複製 diff。
- 優先描述受影響的能力或領域，而非檔名。內部變更應描述責任或維護效益，嚴禁宣稱有對外行為變更。
- 避免 `update files`、`misc fixes` 或 `improve handling` 等模糊摘要。嚴禁宣稱未驗證的修復、相容性保證或效能改善。
- 遵循儲存庫的訊息格式與語言。若沒有既定慣例，預設使用英文祈使句與 Conventional Commit 格式：`type(scope): summary`；沒有適合的單一 scope 時省略。
- 使用 Conventional Commits 時，`feat` 表示新能力、`fix` 表示修正行為、`refactor` 表示不改變行為的內部重構；其他依語意選用 `docs`、`test`、`perf`、`build`、`ci` 或 `chore`。依意圖判斷，不能依副檔名判斷。
- Subject 應簡潔並遵循儲存庫長度限制；嚴禁為任意字數目標犧牲意義。
- 當 subject 無法說明原因、重要取捨、非直觀行為或遷移方式時，應加入 body。說明改了什麼與為什麼，避免逐檔敘述。只有實際執行過的驗證才能寫入，並區分失敗與未執行的檢查。
- 使用 Conventional Commits 時，以 `!` 或 `BREAKING CHANGE:` footer 標示不相容變更，說明影響與必要遷移。Issue 參照、sign-off 與署名遵循儲存庫要求；嚴禁編造 trailer。

## 範例

- 上傳器加入重試行為：`feat(upload): retry interrupted transfers`。
- 報表排除重複項目：`fix(reports): count each invoice once`。
- 不改變行為，集中管理責任：`refactor(cache): centralize entry expiration`。
- 加入復原說明：`docs(backup): explain restoration after disk failure`。
- 反例：`fix: update report files` 未說明修正了什麼行為。

## 驗證與提交

1. 執行儲存庫或使用者要求的檢查，並重用仍適用的結果。嚴禁只為建立本地 commit 而啟動大範圍測試；提交請求不免除必要檢查或 hook。
2. Git 回報編碼或換行警告時，應依儲存庫格式規則檢查 diff，並在提交前修正意外轉換。
3. 只有在使用者要求或已有授權時才建立 commit。嚴禁未經授權略過失敗的 hook 或 amend 既有歷史；若 hook 改動檔案，重試前必須檢查並只納入相關變更。
4. 檢查建立的 commit 與工作樹狀態。回報識別碼、subject、已執行的檢查及剩餘變更。只要求訊息時，回傳提案且不改動 Git 狀態。
