---
name: misty-release
description: >-
  Prepare release versions, notes, and publication using the current context and
  project skills; use the fallback workflow only when no release process is defined.
---

# Misty Release

## Choose the Release Process

1. Check the user's instructions, conversation context, repository rules, release documentation, applicable skills, and release automation for the process governing this release. Read applicable release skills before choosing a workflow.
2. If a governing process exists, follow it. MUST NOT load or impose the fallback's branch, note retention, commit language, or tag model. If that process leaves a necessary decision unresolved, ask only about that decision; missing detail does not authorize the entire fallback.
3. Only when no governing release process exists, read [Default Release Workflow](references/default-release.md) and use it as the fallback. Explicit user constraints still apply; resolve conflicts before executing affected steps.

## Basic Questions and Authorization

1. Establish the release unit, source candidate, previous applicable release, version or version-selection rule, and requested result: notes only, local preparation, or publication. Reuse answers and authorization already present; ask only for information that cannot be established from the available context.
2. Before changing release files or integrating, present the current branch, intended target, release scope, and publication effects. Ask whether to proceed if explicit approval for the same source, target, and scope is absent. MUST NOT treat approval for local preparation as approval to push or publish.
3. For notes-only requests, return the draft without changing Git state. Verify results using the chosen process before reporting completion; distinguish prepared content, published results, and pending checks.

## Routing Examples

- Commit and release guidance are resolved separately: a project's commit-message convention does not by itself define a release process, and a release process does not by itself define ordinary commit conventions.
- A project release skill uses a maintenance branch, keeps all notes, and publishes through CI: follow that skill without loading the fallback.
- The user selects a version but no release process exists: use the fallback with that version, and ask only for unresolved release decisions or authorization.
- A project process defines tagging but omits a required note destination: ask for that destination; do not silently impose the fallback's path or retention policy.
