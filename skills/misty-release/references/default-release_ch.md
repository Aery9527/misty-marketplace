# 預設發布流程

- 只有入口檔判定沒有適用發布流程時，才讀取此參考文件。使用者限制優先於這些預設值。

## 發布範圍

1. 確認發布單位、候選 commit 與所選遠端的實際 default branch。依[版號推薦](#版號推薦)找出前一版，再閱讀截至候選版本的完整 commit message 與 diff，清點最終交付的淨變更；沒有可發布變更時，不建立 release。
2. 透過入口檔的授權確認，提議整合至該 default branch 發布。已在 default branch 時，無須合併自身。
3. 本地與遠端變更需要整合時，讀取[遠端整合與衝突](remote-integration_ch.md)，即使 Git 合併沒有衝突標記也適用。整合後依[發布成果](#發布成果)重新驗證實際發布內容、版號、notes 與 tag 目標。

## 版號推薦

1. 每次發布前，更新所選遠端的 default branch 與 tag 資訊，不覆寫既有 tag。無法驗證資訊時，回報限制並先解決，再選擇比較基準。
2. 發布 tag 使用 `vMAJOR.MINOR.PATCH`，三段皆為非負整數，不能有前導零、預發布後綴或建置中繼資料。從 default branch 頂端沿第一父系歷史向前搜尋，選取第一個帶有本發布單位適用 tag 的 commit；annotated tag 與 lightweight tag 都納入考量。嚴禁選取無關分支的 tag，或只依整個儲存庫的 tag 日期、最大版號決定基準。
3. 沒有適用 tag 時，詢問使用者確認初始版號。同一個選定 commit 上有多個適用 tag 導致基準不明，或候選版本不包含前一版 commit 時，推薦版號前先釐清。
4. 依前一版至候選版本的實際淨變更及相容性判斷，不能只依 commit type。依 [Semantic Versioning](https://semver.org/spec/v2.0.0.html) 的 major／minor／patch 模型，採用本次最高影響等級：
   - 公開介面或支援行為有不相容變更：major 加一，minor 與 patch 歸零。
   - 新增向後相容能力：minor 加一，patch 歸零。
   - 只有向後相容修復，或不改變公開行為的維護：patch 加一。
5. 展示前一版 tag、比較範圍、推薦的新 tag 及支持升版幅度的具體變更，修改發布檔前先確認版號。使用者已選定版號時，仍須驗證基準；若與推薦不符，說明衝突，不能靜默替換使用者選擇。嚴禁覆寫既有 tag。

## 發布說明

- 將相關 commit 整理成有意義的能力、修復或設計成果。Notes 必須說明其影響與必要遷移；嚴禁只列 commit subject、檔案修改或無證據的效益。省略發布紀錄項目與候選版本前已完全 revert 的變更。
- 使用使用者指定的 notes 位置；未指定時使用輸出路徑樣式 `docs/release-note/<tag>.md`，其中 `<tag>` 包含 `v` 前綴，例如 `v3.0.0.md`。若既有 notes 已使用其他位置或命名慣例，寫入前先釐清；嚴禁靜默搬移或重新命名。
- 該目錄只保留最近 10 份版本 notes，包含本次新檔。依可確認的發布歷史排序，將待清理的確切檔名納入發布範圍展示，刪除前取得涵蓋該清單的授權。同一清單展示後已取得的授權可沿用。已授權的舊 note 刪除與新 note 納入同一 release commit，保留歷史 tag 與無關文件。集合或順序不明時，提議刪除前先釐清。
- 撰寫 notes 時，讀取 [Release Note 範例](release-note-example_ch.md)。依實際交付變更調整結構，省略不適用章節，嚴禁將虛構內容複製為專案事實。

## 發布成果

1. 準備選定版號的相關檔案與 release note，再建立發布準備 commit。若可用則使用 `misty-commit`，傳入選定範圍與既有授權；否則核對暫存 diff，為該範圍撰寫成果導向訊息。無關修改不能納入 release commit。最終已驗證的 release commit 必須包含新 note 與正確保留結果、位於 default branch 第一父系歷史，且 release tag 直接指向該 commit。整合或 CI 產生 commit 後，使用實際落地 SHA；本地或 PR 合併產生 merge commit 時，必須在該 merge commit 打 tag，不能在被合併分支的準備 commit 打 tag。嚴禁覆寫既有 release tag。
2. 遵循適用的 commit message 指引，包括從近期 commit 歷史確認的清楚一致慣例；沒有指引時，release commit 敘述必須使用繁體中文，技術識別字與 trailer 保留必要原文。由 CI 決定訊息時，觸發前檢查模板，產生後核對訊息；若有衝突先與使用者釐清。嚴禁只為改變語言而改寫已落地歷史。
3. 打 tag 前，更新所選遠端的 default branch 與 tag 資訊，重新驗證實際的最終 release commit。本地整合必須在 push 前驗證；PR 或 CI 整合必須在落地後、打 tag 前驗證。確認從更新後的遠端 default branch 頂端沿第一父系向前找到的第一個適用 tag，以及最終 commit 第一父系歷史上的前一版適用 tag，仍與已確認基準一致。比較該基準至最終 commit 的交付淨變更，排除純發布紀錄，核對升版幅度與成果／遷移 notes。若基準、交付範圍、相容性、notes、版號或清理清單改變，先停止打 tag 與發布，回到版號推薦：更新發布檔及必要提交、重跑檢查，並依既有授權規則確認改變的決策或範圍。使用者自選版號有衝突時，說明衝突，不能靜默替換；清理清單改變時，重新展示並取得授權。已落地內容以新 commit 修正，不能改寫已落地歷史。遠端前進導致整合或 push 需要重做時，必須重跑此驗證。
4. 對最終發布內容執行專案必要檢查，只執行已授權的發布步驟。確認 release commit 位於遠端 default branch 第一父系歷史、遠端 tag 指向該 commit，且 notes 與必要 CI／產物相符後，才能回報發布完成；CI 尚在執行或僅部分完成時，必須如實回報。

## 範例

- 專案沒有 commit 或 release 指引，從 `v2.4.3` 起有相容的 `fix` 與 `feat` commit：核對訊息與 diff 後推薦 `v2.5.0`，將交付成果分組寫入 note，一起提交 note 與版號檔，再於 default branch 上已驗證的 release commit 打 tag，取得授權後才對外發布。發布準備 commit 不會再次觸發升版，也不列為 note 項目。
- 從 `v2.4.3` 出發，只有相容修復時推薦 `v2.4.4`；相容新能力加修復時推薦 `v2.5.0`；移除既有支援的 CLI 旗標時推薦 `v3.0.0`。
- Default branch 最近的適用 tag 是 `v2.4.3`，尚未合併的功能分支有 `v9.0.0`：以 `v2.4.3` 為比較基準。
- 五個 commit 共同修復重試過早中止，整理為一項「暫時斷線時正確使用設定的重試次數」的成果說明，而非五條實作紀錄。
- 已有 10 份版本 notes 時，新增下一版必須在同一 release commit 移除已確認最舊的一份，最後保留包含新檔的 10 份。
- Release PR 經 squash 合併後，在 default branch 上已驗證的落地 commit 打 tag，不能在先前 PR head 打 tag。
- 發布準備 commit C 經 merge commit M 整合至 default branch 時，在已驗證的 M 打 tag；下一次沿第一父系搜尋時，就能找到該發布 tag。
- 從 `v2.4.3` 出發，candidate 只有相容新能力，原本推薦 `v2.5.0`；整合後若另包含 default branch 上尚未發布的「移除既有支援的 CLI 旗標」，則改推薦 `v3.0.0`、說明變化，並更新 note 檔名、標題、版號檔及遷移 notes。改變的版號／範圍取得確認且最終 commit 重新驗證後，才能打 tag。
