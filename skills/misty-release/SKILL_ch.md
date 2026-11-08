---
name: misty-release
description: >-
  選擇發布版本並撰寫成果導向的說明，將包含該版 note 的 commit 與對應 tag 發布至 default branch。
---

# Misty Release

## 發布範圍

1. 確認發布單位、候選 commit、所選遠端的實際 default branch 與適用的前一版。閱讀完整 commit message 與 diff，清點最終交付的淨變更；沒有可發布變更時，不建立 release。
2. 修改發布檔或整合前，展示目前分支、default branch、發布範圍與對外發布效果，詢問是否整合至該分支發布。同一來源、目標與發布範圍已有明確授權時沿用；已在 default branch 時，無須合併自身。
3. 只要求 notes 時，回傳草稿，不改動 Git 狀態。

## 說明與版本

- 將相關 commit 整理成有意義的能力、修復或設計成果。Notes 必須說明其影響與必要遷移；嚴禁只列 commit subject、檔案修改或無證據的效益。省略發布紀錄項目與候選版本前已完全 revert 的變更。
- 遵循專案版本制度。採 Semantic Versioning 時，依實際相容性與交付行為決定升版幅度，不能只依 commit type 判斷。
- 使用使用者指定或專案既定的 notes 位置；未指定時使用輸出範本 `docs/release-note/<版號>.md`。依選定版號命名，嚴禁靜默搬移既有 notes。
- 該目錄只保留最近 10 份版本 notes，包含本次新檔。依可確認的發布歷史排序，舊 note 刪除與新 note 納入同一 release commit，保留歷史 tag 與無關文件。集合或順序不明時，刪除前先釐清。

## 發布成果

1. 使用專案既定的整合與發布方式，包括 PR 或 CI。最終已驗證的 release commit 必須包含新 note 與正確保留結果、可從 default branch 到達，且 release tag 直接指向該 commit。PR 合併或 CI 產生 commit 後，使用實際落地 SHA；嚴禁覆寫既有 release tag。
2. Release commit 敘述必須使用繁體中文，技術識別字與 trailer 保留必要原文。由 CI 決定訊息時，觸發前檢查模板，產生後核對訊息；若有衝突先與使用者釐清。嚴禁只為改變語言而改寫已落地歷史。
3. 對最終發布內容執行專案必要檢查，只執行已授權的發布步驟。確認遠端 default branch 可到達 release commit、遠端 tag 指向該 commit，且 notes 與必要 CI／產物相符後，才能回報發布完成；CI 尚在執行或僅部分完成時，必須如實回報。

## 範例

- 五個 commit 共同完成上傳重試，整理為一項「從暫時斷線恢復傳輸」的成果說明，而非五條實作紀錄。
- 已有 10 份版本 notes 時，新增下一版必須在同一 release commit 移除已確認最舊的一份，最後保留包含新檔的 10 份。
- Release PR 經 squash 合併後，在 default branch 上已驗證的落地 commit 打 tag，不能在先前 PR head 打 tag。
