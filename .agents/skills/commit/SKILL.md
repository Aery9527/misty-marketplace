---
name: commit
description: >-
  在本儲存庫準備或審查提交，將提交規範與流程委派給 misty-commit。
---

# commit

- 此 skill 僅為 repo-local 轉接入口，明確採用 `misty-commit` 及其預設提交指引，不另訂提交規則。
- 必須先讀取本儲存庫指定的 `misty-commit` 來源，依其流程處理提交邊界、訊息、檢查與授權；不能再轉回此入口判定流程。
- 必要的來源 skill 無法讀取時，停止並回報缺少依賴，嚴禁自行編造替代規則。
