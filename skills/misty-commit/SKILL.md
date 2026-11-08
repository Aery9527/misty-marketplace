---
name: misty-commit
description: >-
  Prepare or review commit boundaries and messages using the current context and
  project skills; use the basic fallback only when no commit guidance is defined.
---

# Misty Commit

## Choose the Commit Process

1. Check the user's instructions, conversation context, repository rules, contribution documentation, applicable skills, commit hooks, and recent commit history for guidance governing this commit. Use history as evidence only for the aspects showing clear, consistent conventions; isolated or mixed samples MUST NOT become binding rules, and explicit instructions take precedence. Read applicable commit skills before choosing a workflow.
2. If governing guidance exists, follow it. MUST NOT load or impose the fallback's message language, format, amend policy, or push questions. If a necessary decision remains unresolved, ask only about that decision; missing detail does not authorize the entire fallback.
3. Only when no governing commit guidance exists, read [Default Commit Guidance](references/default-commit.md). Explicit user constraints still apply; resolve conflicts before executing affected steps.

## Basic Questions and Authorization

1. Establish the intended change scope and requested result: message or boundary review, local commits, or publication. Reuse available answers and authorization; ask only about information that cannot be established from the context, including whether unrelated changes belong in scope.
2. For message-only or review-only requests, return the proposal without changing Git state. Before a commit, check its final staged content against the selected scope and message; clarify an unclear intent instead of inventing one.
3. Execute only authorized mutations. Approval to create a commit does not authorize an amend, push, tag, or release. Report the commits actually created and any pending steps.

## Release Handoff

- When a release workflow invokes this skill, reuse its selected scope and authorization and return the resulting commit SHA to that workflow. Commit guidance does not replace the release process.
- When the user requests a release and no project release process exists, use `misty-release` if available. Completing an ordinary commit alone MUST NOT initiate a release.

## Routing Examples

- A project commit skill requires English subjects and a ticket prefix: follow it without loading the fallback.
- No commit guidance exists and the user asks to commit upload retries: use the fallback and create only the authorized local commit; do not tag or release it.
