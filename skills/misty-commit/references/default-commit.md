# Default Commit Guidance

- Read this reference only when the entrypoint determines that no governing commit guidance exists. Explicit user constraints take precedence.

## Commit Boundaries

1. Inspect the actual changes in scope, including staged, unstaged, and untracked content, and identify distinct intents from the task context. MUST NOT include unrelated changes just because they exist in the working tree or index.
2. Each commit MUST have one coherent intent; different intents MUST be separate commits, even within one file. Keep implementation, tests, and documentation serving the same intent together.
3. Run checks appropriate to the selected change, stage only its content, and verify the final staged diff against the intent and message before committing. If existing staged changes prevent a scoped commit, clarify how to handle them rather than silently including or unstaging them.

## Message Rules

- Use the Conventional Commits shape `type(scope): summary`; omit scope when no meaningful component name applies. The subject, body, and explanatory footer prose MUST use Traditional Chinese; retain necessary original technical identifiers, types/scopes, and standard trailers.
- Choose type by the delivered change: `feat` for new capabilities, `fix` for corrections, `refactor` for restructuring without behavior change, `docs` for documentation, `test` for tests, and `chore`, `build`, or `ci` for the corresponding maintenance work. A commit type alone does not determine a release increment.
- The subject MUST explain the high-level intent and concrete outcome: the capability, behavior, or design responsibility being changed and why it matters. MUST NOT narrate file edits, function changes, or vague activity such as "update" or "improve"; MUST NOT claim unsupported benefits.
- Add a body only when needed to explain motivation, triggering conditions, root cause, tradeoffs, or migration. Mark incompatible changes with `!` or `BREAKING CHANGE:` regardless of type, and explain the affected behavior and required migration. These details let a later release distinguish compatible fixes, new capabilities, and breaking changes.

## Amend, Push, and Release

- When making a commit, if the latest commit is confirmed unpushed and the new changes continue the same intent, offer to amend it; amend only with the user's approval. If publication status is uncertain, the commit was pushed, or the intent differs, use a new commit. Reuse explicit approval to amend within its scope.
- After completing the requested commits or amendments, ask whether to push unless the user already authorized or declined it. During an ongoing release workflow, return control to that workflow so it can complete release preparation and obtain any missing publication approval together; do not push independently or repeat its authorization questions.
- Report the created commit SHA and delivered intent. A later release can combine the full messages and actual diffs into outcome-focused notes and a version recommendation; ordinary commits MUST NOT create tags or trigger a release on their own.

## Examples

- Retrying temporary connection failures: prefer `fix(upload): 避免暫時斷線造成上傳失敗` over `fix(upload): 修改重試次數與錯誤處理`.
- Adding a compatible CSV export: use `feat(export): 支援將報表匯出為 CSV`.
- Removing a supported flag: use `feat(upload)!: 統一上傳重試參數`, with a body identifying the removed `--retry-count` flag and migration to `--retries`.
- Moving expiration ownership into the cache without changing behavior: prefer `refactor(cache): 集中快取到期管理責任` over `refactor(cache): 搬移函式並調整呼叫點`.
- Upload retries and invoice-rounding corrections are two intents: create separate commits, even if both touch the same file. Tests and documentation for upload retries belong with that change.
- With no project commit or release guidance, commit the fixes and new capabilities separately. When a release is requested, `misty-release` checks their full messages and diffs against the last default-branch release tag, recommends the highest-impact increment, and prepares the release note. Its note and version changes form a release-preparation commit, such as `chore(release): 發布 v2.5.0`; that bookkeeping commit is not itself a user-facing release-note entry.
