---
name: misty-release
description: >-
  Use when preparing or publishing a release, choosing a version, writing release
  notes from Git history, or creating release tags. Land a tagged release commit
  containing its release note on the default branch without hardcoding language,
  package manager, or branch names.
---

# Misty Release

- A completed release MUST have a validated release commit containing that version's release note on the confirmed default branch, with the release tag pointing directly to that commit.
- Track the candidate from its input commit through any generated release commit; the final notes, version, validation, and published refs or artifacts MUST agree.
- Apply user instructions and repository policy. A notes-only request MUST NOT trigger version edits, commits, merges, tags, or publication. Carry out already-authorized steps without repeated approval; clarify only missing decisions that affect the result or publication authority.

## Establish the Release Contract

1. Inspect release documentation, relevant automation, manifests, Git status, branches, remotes, and existing tags. Identify the release unit, version scheme, current source branch, previous release, required checks, note location and language, and publishing mechanism. Confirm the selected remote's actual default branch using remote or hosting metadata; a local symbolic ref alone can be stale, and branch names MUST NOT be guessed.
2. Before merging, editing release files, committing, tagging, or publishing, present the current branch, confirmed default branch, and intended release effects; ask whether to integrate the current branch into that default branch and release there. A release request alone does not authorize an arbitrary branch merge. Reuse explicit approval for the same source, target, and release scope; when already on the default branch, state that no merge is needed.
3. Follow the project's permitted integration mechanism, including a PR for a protected default branch. If project policy requires release elsewhere or prevents the required final state, resolve that conflict before mutation; MUST NOT silently substitute a maintenance or release branch. Do not assume remote names, a tag prefix, tag type, script paths, or package registry.
4. Distinguish local preparation from external publication. Determine whether pushing a branch or tag triggers publication; include those effects in the plan and honor the user's existing authorization.
5. When policy or context does not resolve a consequential choice, propose a concrete plan and ask only for the missing decision. Do not create branches, install hooks, or add release tooling merely to match this skill.

## Inspect the Candidate

1. Record the starting branch and candidate commit. Before release mutations, require a clean working tree or an explicitly isolated set of release changes; MUST NOT stash, discard, or include unrelated work automatically.
2. For publication, refresh the relevant remote refs and tags and check divergence. If this cannot be done, state what is unverified and stop publication; a local notes draft can still proceed. MUST NOT reset, rebase, or force-push to hide divergence.
3. Select the previous release for this component and release line, and confirm it is an ancestor of the candidate. Do not choose a tag solely because it sorts highest or is newest across the repository. If no prior release exists, define the initial-release scope and version from project policy or a user decision.
4. Inspect the full commit messages and relevant diffs in the chosen range, including bodies and breaking-change footers. For component releases, include shared changes that affect that component. If there is no releasable change, report that and stop rather than creating a duplicate release.

## Draft Notes and Version

- Summarize delivered outcomes for the release's audience. Group related commits by capability and use applicable categories such as breaking changes, features, fixes, performance, and maintenance; omit empty categories.
- Describe compatibility impact and migration steps explicitly. Preserve issue or commit references when useful for traceability. MUST NOT invent benefits, fixes, or validation from a vague subject.
- Omit mechanical merge and release-bookkeeping entries, but inspect merge conflict resolutions and reverted changes so notes describe the net result. Unparseable or non-Conventional messages MUST be inspected rather than silently dropped; unresolved entries remain visible for review.
- Follow the project's version scheme, including prerelease, initial-version, or calendar-version rules. Only when Semantic Versioning applies, use incompatible public-contract changes to suggest a major increment, compatible capabilities a minor increment, and compatible fixes a patch increment; apply the project's initial-development and prerelease policy. Commit types are evidence, not a substitute for checking actual compatibility.
- Present the exact candidate/range, proposed notes, version, release tag, checks, and publication effects as a reviewable result. An exact version already authorized by the user needs no second confirmation; resolve unsupported compatibility claims or missing version decisions before mutation.

## Release Note Files

- Use the user-specified or project-defined note location. Only when neither exists, use the project-relative output path template `docs/release-note/<version>.md`; name the file after the selected version without imposing Semantic Versioning, e.g. `docs/release-note/v1.2.3.md`. MUST NOT silently relocate existing notes.
- The selected directory MUST retain at most the latest 10 version-note files, including the new note. Determine recency from confirmed release history, not filename string order or filesystem modification time. Include removal of older version notes in the same release commit as the new note; MUST NOT delete historical tags or unrelated documents.
- Before creating the release commit, identify the version-note set and the files to prune. If mixed components, unrecognized files, or ambiguous release order prevent determining that set or its latest 10, resolve the ambiguity with the user before cleanup or completion; MUST NOT guess which files to delete.

## Prepare, Validate, and Publish

- The responsibilities below follow the project's execution order and may belong to local tooling or CI, including version edits, commits, tags, and checks. Required checks before a publishing trigger MUST still run before that trigger.

1. Update the required version-bearing files and generated outputs, write the new release note, and prepare the old-note cleanup specified above. Use existing tooling where available; MUST NOT invent commands or require another agent to summarize notes.
2. Complete the approved integration into the default branch and validate the resulting content. Release-file changes may be prepared on the source branch and integrated through a PR, or committed on the default branch as permitted by project policy. Checks of a pre-merge tree alone do not validate conflict resolutions or changed content.
3. Record the final release commit containing the new note and any required old-note removals; release-commit prose MUST use Traditional Chinese, retaining necessary original types/scopes, identifiers, and standard trailers. Check CI-owned message templates before triggering; resolve incompatible templates with the user first and verify the generated message afterward. MUST NOT rewrite landed history solely to change its language. After PR merge or CI-generated commits, use the actual landed SHA rather than assuming the earlier PR head remains the release commit. Retain the input commit and verify the final content and checks. If the candidate changes after validation, rerun affected checks and revise notes or version as needed before publishing.
4. Create the tag only after the release commit has landed on the default branch. Verify that the tag resolves to the final validated commit, that this commit contains the new note and correct retention result, and that it is reachable from the default branch; it need not remain that branch's tip. For local tagging, first verify the name is unused locally and on the intended remote. For CI-owned tagging, inspect the automation's target, integration order, and collision handling before triggering it, then verify the actual result. Follow project requirements for lightweight, annotated, or signed tags. MUST NOT move or overwrite an existing release tag.
5. Execute only authorized publication steps, using explicit remote and branch/tag refs or the project's publishing mechanism. MUST NOT push all local tags indiscriminately. For CI-driven releases, use the prescribed trigger instead of duplicating its tagging or publishing work.
6. After publication, verify that the remote default branch reaches the final release commit and that the remote tag resolves to it. Check the notes, retention result, version, required CI result, and any published artifacts against the reviewed proposal; report discrepancies rather than completion. A successful push proves the refs were pushed, not that asynchronous publishing succeeded; report pending publication as pending.
7. Perform back-merges or branch restoration only when the workflow requires them or they were requested. Report the version, release commit/tag, notes location, checks, publication status, and any remaining action.

## Stop and Resume

- On failed checks, conflicts, an occupied tag, missing required signing or publication credentials, or a failed push/publish, stop dependent actions and report the exact step and completed effects. MUST NOT bypass checks, retry with force, or claim release completion.
- Before retrying a partial release, inspect local and remote state. Reuse already-completed valid steps and retry only missing operations; MUST NOT recreate or overwrite a version that was already published.

## Decision Examples

- Notes-only request for a trunk-based project: inspect the previous applicable tag through the requested commit, produce notes, and leave Git state unchanged.
- Integration-branch release: confirm the current branch to default-branch integration, validate the landed release commit containing the note, and tag that SHA. If integration is declined, stop release mutations.
- Protected default branch: after squash or rebase merge of the release PR, use and validate the landed SHA instead of tagging the earlier PR head.
- Note retention: given 10 existing version notes, adding the next version removes the oldest confirmed note in the same release commit, leaving 10 including the new one.
- Tag-triggered publication: first land the note-bearing commit on the default branch, then perform the authorized tag push; verify remote refs and CI completion before reporting publication complete.
