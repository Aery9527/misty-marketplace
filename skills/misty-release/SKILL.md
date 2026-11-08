---
name: misty-release
description: >-
  Choose release versions and write outcome-focused notes; publish a note-bearing
  tagged release commit on the default branch.
---

# Misty Release

## Release Scope

1. Confirm the release unit, candidate commit, selected remote's actual default branch, and previous applicable release. Read full commit messages and diffs to identify net delivered changes; if there are none, do not create a release.
2. Before changing release files or integrating, present the current branch, default branch, release scope, and publication effects; ask whether to integrate and release there. Reuse explicit approval for the same source, target, and release scope; when already on the default branch, no self-merge is needed.
3. For notes-only requests, return the draft without changing Git state.

## Notes and Version

- Group related commits into meaningful capabilities, fixes, or design outcomes. Notes MUST explain their impact and any required migration; MUST NOT be a list of commit subjects or file edits, or claim unsupported benefits. Omit release bookkeeping and changes fully reverted before the candidate.
- Follow the project's version scheme. For Semantic Versioning, choose the increment from actual compatibility and delivered behavior, not commit types alone.
- Use the user-specified or project-defined note location; otherwise use the output template `docs/release-note/<version>.md`. Name the file after the selected version, without silently relocating existing notes.
- Retain only the latest 10 version-note files in that directory, including the new one. Determine order from confirmed release history; prune older notes in the same release commit as the new note, preserving historical tags and unrelated documents. If the set or order is unclear, clarify before deleting.

## Release Result

1. Use the project's integration and release mechanism, including PRs or CI. The final validated release commit MUST contain the new note and correct retention result, be reachable from the default branch, and be the exact target of the release tag. Use the actual landed SHA after PR merge or CI generation; MUST NOT overwrite an existing release tag.
2. Release-commit prose MUST use Traditional Chinese, retaining necessary original technical identifiers and trailers. For CI-owned messages, check the template before triggering and verify the generated message; resolve conflicts with the user. MUST NOT rewrite landed history solely to change its language.
3. Run the project's required checks against the final release content and execute only authorized publication steps. Verify that the remote default branch reaches the release commit, the remote tag resolves to it, and the notes and required CI/artifacts match before reporting publication complete; report pending CI or partial completion accurately.

## Examples

- Five commits delivering upload retries become one note describing recovery from temporary disconnections, rather than five implementation entries.
- With 10 existing version notes, adding the next version removes the oldest confirmed note in the same release commit, leaving 10 including the new one.
- A squash-merged release PR is tagged at its validated landed commit on the default branch, not at the earlier PR head.
