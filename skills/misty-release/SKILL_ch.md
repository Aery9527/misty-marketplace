---
name: misty-release
description: >-
  用於準備或發布版本、選擇版本號、從 Git 歷史整理 release notes，或建立 release tag。
  將包含該版 release note 的 commit 與對應 tag 落在 default branch，
  不固定程式語言、套件管理器或分支名稱。
---

# Misty Release

- 完成 release 時，經確認的 default branch 上必須有包含該版 release note 的已驗證 release commit，且 release tag 直接指向該 commit。
- 追蹤候選版本從輸入 commit 到產生的 release commit；最終 notes、版本、驗證與已發布 ref 或產物必須一致。
- 遵循使用者指示與儲存庫政策。只要求 notes 時，嚴禁修改版本、commit、merge、打 tag 或發布。已有授權的步驟應持續執行，無須重複確認；只有影響結果或發布權限的缺漏決策才需釐清。

## 確認發布契約

1. 檢查發布文件、相關自動化、manifest、Git 狀態、分支、遠端與既有 tag。確認發布單位、版本制度、目前來源分支、前一版、必要檢查、notes 位置與語言，以及發布機制。必須透過遠端或代管平台資訊確認所選遠端的實際 default branch；本地 symbolic ref 可能過期，嚴禁猜測分支名稱。
2. Merge、修改發布檔、commit、打 tag 或發布前，必須展示目前分支、已確認的 default branch 與預期發布效果，詢問是否將目前分支整合進該 default branch 執行發布。一般 release 請求不代表任意分支合併的授權。同一來源、目標與發布範圍已有明確授權時，不重複詢問；已在 default branch 時，說明無須合併自身。
3. 遵循專案允許的整合方式，包括受保護 default branch 的 PR 流程。若專案政策要求在別處發布，或無法達成必要最終狀態，改動前必須先釐清衝突；嚴禁靜默改用維護分支或 release branch。嚴禁假設遠端名稱、tag 前綴、tag 類型、腳本路徑或套件 registry。
4. 區分本地準備與外部發布。確認推送分支或 tag 是否會觸發發布；計畫必須包含這些效果，並遵循使用者既有授權。
5. 政策或情境無法決定重要選項時，應提出具體計畫，僅詢問缺漏的決策。嚴禁只為符合此 skill 而建立分支、安裝 hook 或新增發布工具。

## 檢查候選版本

1. 記錄起始分支與候選 commit。改動發布內容前，必須有乾淨工作樹或明確隔離的發布變更集合；嚴禁自動 stash、丟棄或納入無關工作。
2. 要發布時，更新相關遠端 ref 與 tag，並檢查分歧。若無法更新，必須說明哪些資訊未驗證並停止發布；仍可產出本地 notes 草稿。嚴禁用 reset、rebase 或 force-push 掩蓋分歧。
3. 選擇此元件與發布線的前一版，確認其為候選版本的祖先。嚴禁只按全儲存庫 tag 的排序或時間挑選。若沒有前一版，依專案政策或使用者決策定義首次發布範圍與版本。
4. 檢查所選範圍內的完整 commit message 與相關 diff，包括 body 與 breaking-change footer。元件發布必須包含影響該元件的共用變更。若沒有可發布變更，必須回報並停止，避免建立重複 release。

## 草擬說明與版本

- 為發布對象摘要已交付的成果。依能力合併相關 commit，使用適用的分類，例如重大變更、功能、修復、效能與維護；省略空分類。
- 明確說明相容性影響與遷移步驟。保留有助追溯的 issue 或 commit 參照。嚴禁從模糊 subject 編造效益、修復或驗證結果。
- 省略機械式 merge 與發布紀錄項目，但必須檢查衝突解法與已 revert 的變更，讓 notes 描述最終淨結果。無法解析或不符合 Conventional Commits 的訊息必須檢查，嚴禁直接丟棄；尚未釐清的項目必須保留供審查。
- 遵循專案版本制度，包括預發布、初始版本或日期版本規則。只有採用 Semantic Versioning 時，才依不相容的公開契約變更建議 major、相容的新能力建議 minor、相容修復建議 patch；初始開發與預發布依專案政策。Commit type 是證據，不能取代實際相容性檢查。
- 展示確切的候選版本／範圍、notes 提案、版本號、release tag、檢查與發布效果，形成可審查結果。使用者已授權確切版本時，無須再次確認；改動前必須釐清無證據的相容性宣稱或缺漏的版本決策。

## Release Note 檔案

- 優先使用使用者指定或專案既定的 notes 位置。兩者皆未指定時，才使用專案相對輸出路徑範本 `docs/release-note/<版號>.md`；依選定版號命名，不強制 Semantic Versioning，例如 `docs/release-note/v1.2.3.md`。嚴禁靜默搬移既有 notes。
- 所選目錄的版本 notes 檔案必須最多只保留最近 10 份，包含本次新增的檔案。依可確認的發布歷史判斷先後，不能依檔名字串排序或檔案修改時間判斷。較舊版本 notes 的刪除必須與新 note 納入同一個 release commit；嚴禁刪除歷史 tag 或無關文件。
- 建立 release commit 前，必須確認版本 notes 集合與預定清理檔案。若混用元件、無法辨認的檔案或發布順序不明，導致無法確定集合或最近 10 份，清理或回報完成前必須先與使用者釐清；嚴禁猜測應刪哪些檔案。

## 準備、驗證與發布

- 下列責任依專案的執行順序，由本地工具或 CI 負責，包括版本更新、commit、tag 與檢查。發布觸發前的必要檢查，仍必須在觸發前完成。

1. 更新必要版本檔與產生檔，撰寫新 release note，並準備前述舊 notes 清理。優先使用既有工具；嚴禁編造命令或強制要求另一個 agent 摘要 notes。
2. 完成已授權整合至 default branch 的流程，並驗證最終內容。依專案政策，可在來源分支準備發布檔變更並透過 PR 整合，或在 default branch 提交。僅檢查合併前內容，無法驗證衝突解法或變動內容。
3. 記錄包含新 note 與必要舊 note 刪除的最終 release commit；release commit 的敘述必須使用繁體中文，type/scope、識別字與標準 trailer 保留必要原文。由 CI 決定訊息時，觸發前必須檢查模板；模板不符時先與使用者釐清，產生 commit 後再核對訊息。嚴禁只為改變語言而改寫已落地歷史。PR 合併或 CI 產生 commit 後，必須使用實際落地 SHA，嚴禁假設先前 PR head 仍是 release commit。保留輸入 commit，核對最終內容與檢查結果。候選版本在驗證後改動時，發布前必須重跑受影響檢查，並視需要修訂 notes 或版本。
4. Release commit 落在 default branch 後才能建立 tag。必須確認 tag 解析至最終已驗證 commit，該 commit 包含新 note 與正確保留結果，且可從 default branch 到達；無須永遠等於該分支 tip。本地打 tag 前，先確認名稱在本地與預定遠端皆未使用。由 CI 打 tag 時，觸發前先檢查自動化的目標、整合順序與同名處理方式，再核對實際結果。依專案要求選擇 lightweight、annotated 或 signed tag。嚴禁移動或覆寫既有 release tag。
5. 只執行已授權的發布步驟，使用明確的遠端與分支／tag ref，或專案發布機制。嚴禁無差別推送所有本地 tag。由 CI 發布時，使用既定觸發方式，避免重複其打 tag 或發布工作。
6. 發布後，必須確認遠端 default branch 可到達最終 release commit，且遠端 tag 解析至該 commit。核對 notes、保留結果、版號、必要 CI 結果與發布產物是否符合已審查提案；若有差異，必須回報差異而非完成。Push 成功只證明 ref 已推送，不代表非同步發布成功；仍在等待的發布必須回報為等待中。
7. 只有流程要求或使用者請求時，才執行回併或回到原分支。回報版本號、release commit/tag、notes 位置、檢查、發布狀態及剩餘動作。

## 停止與續行

- 檢查失敗、衝突、tag 名稱已使用、缺少必要簽署或發布憑證、push／publish 失敗時，停止相依動作，回報確切步驟與已完成效果。嚴禁略過檢查、改用 force 重試或宣稱 release 完成。
- 重試部分完成的 release 前，必須檢查本地與遠端狀態。沿用已完成且有效的步驟，只重試缺漏操作；嚴禁重建或覆寫已發布版本。

## 決策範例

- Trunk 專案只要求 notes：檢查前一個適用 tag 到指定 commit 的範圍，產出 notes，保留 Git 狀態。
- 整合分支發布：確認將目前分支整合至 default branch，驗證已落地且含 note 的 release commit，並在該 SHA 建立 tag。若不同意整合，停止發布改動。
- 受保護 default branch：release PR 經 squash 或 rebase 合併後，使用並驗證落地 SHA，不能在先前 PR head 打 tag。
- Notes 保留：已有 10 份版本 notes 時，加入下一版必須在同一 release commit 移除已確認最舊的一份，最後保留包含新檔的 10 份。
- Tag 觸發發布：先將含 note 的 commit 落到 default branch，再執行已授權 tag push；確認遠端 ref 與 CI 完成後，才能回報發布完成。
