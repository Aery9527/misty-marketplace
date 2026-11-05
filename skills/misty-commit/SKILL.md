---
name: misty-commit
description: >-
  Group changes into single-intent commits and write or review Traditional Chinese
  commit messages that explain high-level intent and outcomes.
---

# Misty Commit

## Commit Boundaries

1. Inspect the actual changes in scope, including staged, unstaged, and untracked content, and identify distinct intents from the task context.
2. Each commit MUST have one coherent intent; different intents MUST be separate commits, even within one file. Keep implementation, tests, and documentation serving the same intent together.
3. Write each message against that commit's selected changes; before actually committing, check the final staged content against the intent and message. If the intent is unclear, clarify it rather than inventing one.

## Message Rules

- The subject, body, and explanatory footer prose MUST use Traditional Chinese; retain necessary original technical identifiers, types/scopes, and standard trailers.
- Follow the repository's message format; otherwise use `type(scope): summary`. Choose type and optional scope by intent.
- The subject MUST explain the high-level intent and concrete outcome: the capability, behavior, or design responsibility being changed and why it matters. MUST NOT narrate file edits, function changes, or vague activity such as "update" or "improve"; MUST NOT claim unsupported benefits.
- Add a body only when needed to explain motivation, triggering conditions, root cause, tradeoffs, or migration. Under Conventional Commits, mark breaking changes with `!` or `BREAKING CHANGE:` and explain the impact and migration.

## Amend and Push

- When making a commit, if the latest commit is confirmed unpushed and the new changes continue the same intent, offer to amend it; amend only with the user's approval. If publication status is uncertain, the commit was pushed, or the intent differs, use a new commit. Reuse explicit approval to amend within its scope.
- After completing the requested commits or amendments, ask whether to push. If the user has already authorized or declined pushing this submission, follow that instruction without asking again.

## Examples

- Retrying temporary connection failures: prefer `fix(upload): 避免暫時斷線造成上傳失敗` over `fix(upload): 修改重試次數與錯誤處理`.
- Moving expiration ownership into the cache without changing behavior: prefer `refactor(cache): 集中快取到期管理責任` over `refactor(cache): 搬移函式並調整呼叫點`.
- Upload retries and invoice-rounding corrections are two intents: create separate commits, even if both touch the same file. Tests and documentation for upload retries belong with that change.
