---
name: misty-commit
description: >-
  Prepare or review Git commits, their boundaries, and messages using project
  guidance. Use when the user asks to commit changes, stage files, amend or split
  a commit, choose commit boundaries, or write or review a commit message, even
  if they only say "commit", "提交", or "幫我提交". Also use before the agent makes
  a commit as part of another authorized task, including after finishing a code
  or documentation change.
---

# Misty Commit

## Choose the Commit Process

1. Check the user's instructions, conversation context, repository rules, contribution documentation, applicable skills, commit hooks, and recent commit history for guidance governing this commit. Use history as evidence only for the aspects showing clear, consistent conventions; isolated or mixed samples MUST NOT become binding rules, and explicit instructions take precedence. Read applicable commit skills before choosing a workflow.
2. If project guidance explicitly adopts this skill's default workflow and only adds project-specific inputs or actions, read [Default Commit Guidance](references/default-commit.md) as the adopted base and apply those supplements at the relevant steps. This explicit delegation does not select an independent project workflow; MUST NOT route back to the delegating wrapper or treat it as a reason to skip the adopted base. For decisions covered by this adoption, the adopted workflow takes precedence over conventions inferred from history. Explicit user constraints and declared project supplements take precedence over the base; resolve conflicts before affected steps.
3. Otherwise, if governing guidance exists, follow it. MUST NOT load or impose the fallback's message language, format, amend policy, or push questions. If a necessary decision remains unresolved, ask only about that decision; missing detail does not authorize the entire fallback.
4. Otherwise, when no governing commit guidance exists, read [Default Commit Guidance](references/default-commit.md). Explicit user constraints still apply; resolve conflicts before executing affected steps.

## Basic Questions and Authorization

1. Establish the intended change scope and requested result: message or boundary review, local commits, or publication. Reuse available answers and authorization; ask only about information that cannot be established from the context, including whether unrelated changes belong in scope.
2. For message-only or review-only requests, return the proposal without changing Git state. Before a commit, check its final staged content against the selected scope and message; clarify an unclear intent instead of inventing one.
3. Execute only authorized mutations. Approval to create a commit does not authorize an amend, push, tag, or release. Report the commits actually created and any pending steps.

## Release Handoff

- When a release workflow invokes this skill, reuse its selected scope and authorization and return the resulting commit SHA to that workflow. Commit guidance does not replace the release process.
- When the user requests a release, follow project release guidance, including explicit delegation to `misty-release`; if none exists, use `misty-release` if available. Completing an ordinary commit alone MUST NOT initiate a release.

## Routing Examples

- A project commit skill requires English subjects and a ticket prefix: follow it without loading the fallback.
- A local entrypoint explicitly adopts `misty-commit` without defining another process: use the adopted default guidance; do not bounce between the two entrypoints.
- No commit guidance exists and the user asks to commit upload retries: use the fallback and create only the authorized local commit; do not tag or release it.
