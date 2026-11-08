---
name: release
description: >-
  採用 misty-release 發布本儲存庫，補充 marketplace 版號、README 版本連結與 Codex 套件同步及驗證。
---

# release

## 流程委派

- 此 skill 明確採用 `misty-release` 及其預設發布流程，只補充下列專案輸入與動作，不另訂發布流程。
- 必須先讀取本儲存庫指定的 `misty-release` 來源；版號推薦、分支整合、notes 內容與保留政策、衝突審查及發布授權均依其流程執行，不能再轉回此入口判定流程。
- 必要的來源 skill 無法讀取時，停止並回報缺少依賴。

## 專案輸入與發布準備

- 版號來源為 `.claude-plugin/marketplace.json` 的 `metadata.version`；release note 沿用既有位置 `release-note/<tag>.md`，其中 `<tag>` 包含 `v` 前綴。其他選版與 notes 規則依採用的流程，不從既有檔案數量或舊指引另推政策。
- 以下動作只在已授權的發布準備階段執行；僅要求 notes 草稿時，不寫入版號、README 或執行同步。

1. 版號確認後，將 `.claude-plugin/marketplace.json` 的 `metadata.version` 更新為選定版號，值不含 tag 的 `v` 前綴。
2. 將 `README.md` 既有的 `Current version` 文字與連結更新至本次 tag 及 release note。
3. 執行 `scripts/sync-codex-plugins.ps1` 或 `scripts/sync-codex-plugins.sh`，產生 Codex marketplace、套件內容與 plugin manifests；嚴禁手動修改同步產物。
4. 提交發布準備內容前，執行 `python scripts/verify_codex_plugins.py`，並核對 marketplace 的來源版號、所有 Codex plugin manifest 的 `version`、README 與 note 的版號一致。檢查失敗時，不提交或發布。
5. 整合或修正最終發布內容後，若版號或同步輸入改變，重做相應更新與同步，再對最終內容執行上述驗證；依 `misty-release` 完成最終範圍、版號與 tag 驗證。
