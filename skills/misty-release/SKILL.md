---
name: misty-release
description: >-
  Use when preparing or publishing a release, choosing a version, writing release
  notes from Git history, or creating release tags. Adapt to the repository's
  release policy without assuming a language, package manager, or branch model.
---

# Misty Release

- Produce a traceable release: notes, version, validated content, and tag or published artifact MUST refer to the same release candidate.
- Track the candidate from its input commit through any generated release commit; the final notes, version, validation, and published refs or artifacts MUST agree.
- Apply user instructions and repository policy. A notes-only request MUST NOT trigger version edits, commits, merges, tags, or publication. Carry out already-authorized steps without repeated approval; clarify only missing decisions that affect the result or publication authority.

## Establish the Release Contract

1. Inspect release documentation, relevant automation, manifests, Git status, branches, remotes, and existing tags. Identify the release unit, version scheme, source and target refs, previous release, required checks, note location and language, and publishing mechanism.
2. Follow the actual workflow: trunk, release branches, integration merges, hotfixes, independently versioned components, or tag-triggered CI. MUST NOT assume branch names, remote names, a tag prefix, tag type, script paths, or package registry.
3. Distinguish local preparation from external publication. Determine whether pushing a branch or tag triggers publication; include those effects in the plan and honor the user's existing authorization.
4. When policy or context does not resolve a consequential choice, propose a concrete plan and ask only for the missing decision. Do not create branches, install hooks, or add release tooling merely to match this skill.

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
- Present the exact candidate/range, proposed notes, version, tag if applicable, checks, and publication effects as a reviewable result. An exact version already authorized by the user needs no second confirmation; resolve unsupported compatibility claims or missing version decisions before mutation.

## Prepare, Validate, and Publish

- The responsibilities below follow the project's execution order and may belong to local tooling or CI, including version edits, commits, tags, and checks. Required checks before a publishing trigger MUST still run before that trigger.

1. Update only version-bearing files, release notes, and generated outputs required by the project. Use existing tooling where available; MUST NOT invent commands or require another agent to summarize notes.
2. Review the resulting diff and ensure the responsible runner checks the final content. If an integration merge is required, complete it and validate the resulting candidate; checks of a pre-merge tree alone do not validate conflict resolutions or changed content.
3. Commit release changes when the workflow calls for it. Record the final release commit and associate checks with that content; when CI generates it, retain the input commit and verify the generated commit and checks before reporting completion. If the candidate changes after validation, rerun the affected checks and revise notes or version as needed before publishing.
4. When creating a tag locally, verify that its name is unused locally and on the intended remote, and that its target is the final validated release commit. For a CI-owned tag, inspect the automation's target and collision handling before triggering it, then verify the resulting tag. Follow project requirements for lightweight, annotated, or signed tags. MUST NOT move or overwrite an existing release tag.
5. Execute only authorized publication steps, using explicit remote and branch/tag refs or the project's publishing mechanism. MUST NOT push all local tags indiscriminately. For CI-driven releases, use the prescribed trigger instead of duplicating its tagging or publishing work.
6. Verify the relevant remote refs, CI result, release entry, or artifact version after publication. For CI-generated releases, check that the resulting version, notes, tag target, and validated content match the reviewed proposal; report discrepancies rather than completion. A successful push proves the refs were pushed, not that asynchronous publishing succeeded; report pending publication as pending.
7. Perform back-merges or branch restoration only when the workflow requires them or they were requested. Report the version, release commit/tag, notes location, checks, publication status, and any remaining action.

## Stop and Resume

- On failed checks, conflicts, an occupied tag, missing required signing or publication credentials, or a failed push/publish, stop dependent actions and report the exact step and completed effects. MUST NOT bypass checks, retry with force, or claim release completion.
- Before retrying a partial release, inspect local and remote state. Reuse already-completed valid steps and retry only missing operations; MUST NOT recreate or overwrite a version that was already published.

## Decision Examples

- Notes-only request for a trunk-based project: inspect the previous applicable tag through the requested commit, produce notes, and leave Git state unchanged.
- Integration-branch release: use the documented source and target refs, validate the merged content, and tag the resulting release commit.
- Hotfix on a maintenance line: compare against that line's previous release, not the newest tag on another line; back-merge only under project policy or user instruction.
- Tag-triggered publication: review the notes, version, and trigger effects before the authorized tag push; verify CI completion before reporting the artifact as published.
