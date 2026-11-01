---
name: misty-commit
description: >-
  Use when preparing Git commits, choosing commit boundaries, staging changes,
  writing or reviewing commit messages, or splitting mixed changes. Prioritize
  accurate, meaningful history that can support release notes.
---

# Misty Commit

- Make each commit explain one coherent change and why it matters. Apply the user's instructions and repository conventions before the defaults below.
- Match the requested action: a message-only request produces a message; staging or creating a commit requires that action to be in scope. A local commit does not imply push, rebase, merge, or worktree cleanup.

## Inspect and Select

1. Read repository commit rules and recent history for message format, language, scope, and required trailers.
2. Inspect `git status --short`, `git diff`, and `git diff --cached`; read relevant untracked files before including them. Check the actual content, not only file names or diff statistics.
3. Identify the intended behavior or maintenance outcome from the diff and task context. If the purpose cannot be established, ask a focused question rather than inventing it.
4. Group changes by intent. Include implementation, tests, documentation, and generated files together when they deliver the same outcome; split independently useful changes. Preserve unrelated edits and pre-existing staging; if staging conflicts with the intended boundary, resolve that boundary before committing.
5. Stage only the intended files or hunks when authorized. For staging or committing, inspect the final staged diff before choosing the final message; an empty staged diff does not warrant an empty commit. For message-only work, describe the changes selected above without changing the index or including unrelated staged content.

## Write the Message

- The subject MUST describe the concrete outcome, behavior, or design intent. Use enough detail to distinguish this change from other commits without copying the diff.
- Prefer the affected capability or domain over file names. For internal changes, describe the responsibility or maintenance benefit without claiming a user-visible change.
- Avoid vague subjects such as `update files`, `misc fixes`, or `improve handling`. Do not claim an unverified fix, compatibility guarantee, or performance improvement.
- Follow the repository's message format and language. If none is established, use an English imperative subject in Conventional Commit form: `type(scope): summary`; omit scope when no useful single scope applies.
- Under Conventional Commits, use `feat` for a new capability, `fix` for corrected behavior, `refactor` for internal restructuring without behavior change, and `docs`, `test`, `perf`, `build`, `ci`, or `chore` when their meaning fits. Choose by intent, not file extension.
- Keep the subject concise and follow repository length limits; MUST NOT sacrifice meaning to an arbitrary character target.
- Add a body when the subject cannot explain the reason, important tradeoff, non-obvious behavior, or migration. Explain what and why; avoid a file-by-file narration. State validation only if it was performed, and distinguish failures or skipped checks.
- Under Conventional Commits, mark incompatible changes with `!` or a `BREAKING CHANGE:` footer and explain the impact and required migration. Follow repository requirements for issue references, sign-offs, and attribution; MUST NOT fabricate trailers.

## Examples

- Retry behavior added to an uploader: `feat(upload): retry interrupted transfers`.
- Duplicate entries removed from a report: `fix(reports): count each invoice once`.
- Ownership clarified without behavior change: `refactor(cache): centralize entry expiration`.
- Recovery instructions added: `docs(backup): explain restoration after disk failure`.
- Counterexample: `fix: update report files` hides the corrected behavior.

## Verify and Commit

1. Run repository- or user-required checks and reuse still-applicable results. Do not start a broad test run solely to create a local commit; a commit request does not waive required checks or hooks.
2. If Git reports encoding or line-ending warnings, compare the diff with repository format rules and correct accidental conversions before committing.
3. Create the commit only when requested or already authorized. MUST NOT bypass failing hooks or amend existing history without authorization; if a hook changes files, inspect and include only relevant changes before retrying.
4. Check the resulting commit and working-tree status. Report its identifier, subject, checks performed, and any remaining changes. For message-only work, return the proposed message without mutating Git state.
