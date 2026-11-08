# Default Release Workflow

- Read this reference only when the entrypoint determines that no governing release process exists. User constraints take precedence over these defaults.

## Release Scope

1. Confirm the release unit, candidate commit, and selected remote's actual default branch. Determine the previous release using [Version Recommendation](#version-recommendation), then read full commit messages and diffs through the candidate to identify net delivered changes; if there are none, do not create a release.
2. Propose integration and release on that default branch through the entrypoint's authorization check. When already on the default branch, no self-merge is needed.

## Version Recommendation

1. Before every release, refresh the selected remote's default-branch and tag information without overwriting existing tags. If that information cannot be verified, report the limitation and resolve it before selecting a baseline.
2. Use release tags in the form `vMAJOR.MINOR.PATCH`, with three non-negative integers and no leading zeroes, prerelease suffix, or build metadata. Walk the default branch's first-parent history from its tip backward and select the first commit carrying an applicable tag for this release unit; consider both annotated and lightweight tags. MUST NOT select an unrelated branch's tag or use repository-wide tag dates or the largest version alone as the baseline.
3. If no applicable tag exists, ask the user to confirm an initial version. If multiple applicable tags on the selected commit make the baseline ambiguous, or the candidate does not contain the previous release commit, clarify before recommending a version.
4. Compare the previous release with the candidate using actual net changes and compatibility, not commit types alone. Apply the highest-impact category present, following the major/minor/patch model of [Semantic Versioning](https://semver.org/spec/v2.0.0.html):
   - Incompatible changes to public interfaces or supported behavior: increment major and reset minor and patch to zero.
   - Backward-compatible new capabilities: increment minor and reset patch to zero.
   - Only backward-compatible fixes or maintenance with no public behavior change: increment patch.
5. Present the previous tag, comparison scope, recommended new tag, and concrete changes justifying the increment; confirm the version before changing release files. If the user already selected a version, still verify the baseline and explain any conflict with the recommendation rather than silently replacing their choice. MUST NOT overwrite an existing tag.

## Release Notes

- Group related commits into meaningful capabilities, fixes, or design outcomes. Notes MUST explain their impact and any required migration; MUST NOT be a list of commit subjects or file edits, or claim unsupported benefits. Omit release bookkeeping and changes fully reverted before the candidate.
- Use the user-specified note location; otherwise use the output path pattern `docs/release-note/<tag>.md`, where `<tag>` includes the `v` prefix, for example `v3.0.0.md`. If existing notes establish another location or naming convention, clarify before writing; MUST NOT silently move or rename them.
- Retain only the latest 10 version-note files in that directory, including the new one. Determine order from confirmed release history; include the exact filenames to prune in the release-scope presentation and obtain approval covering that list before deletion. Reuse approval already given after the same list was presented. Prune approved files in the same release commit as the new note, preserving historical tags and unrelated documents. If the set or order is unclear, clarify before proposing deletion.
- Read [Release Note Example](release-note-example.md) when drafting notes. Adapt its structure to the delivered changes; omit inapplicable sections and never copy its fictional claims as project facts.

## Release Result

1. Prepare the selected version files and release note, then make a release-preparation commit. Use `misty-commit` when available, passing the selected scope and existing authorization; otherwise inspect the staged diff and write an outcome-focused message for that scope. Keep unrelated changes out of the release commit. The final validated release commit MUST contain the new note and correct retention result, lie on the default branch's first-parent history, and be the exact target of the release tag. Use the actual landed SHA after integration or CI generation; for a local or PR merge that creates a merge commit, tag that merge commit rather than the merged branch's preparation commit. MUST NOT overwrite an existing release tag.
2. Follow governing commit-message guidance; when none exists, release-commit prose MUST use Traditional Chinese, retaining necessary original technical identifiers and trailers. For CI-owned messages, check the template before triggering and verify the generated message; resolve conflicts with the user. MUST NOT rewrite landed history solely to change its language.
3. Before tagging, refresh the selected remote's default-branch and tag information and revalidate the actual final release commit. Validate local integration before pushing it; validate PR or CI integration after landing and before tagging. Confirm that the latest applicable remote release and the previous applicable tag on the final commit's first-parent history still match the approved baseline. Compare that baseline with the final commit's net delivered changes, excluding release bookkeeping, and verify the increment and outcome/migration notes. If the baseline, delivered scope, compatibility, notes, version, or pruning list changes, stop tagging and publication and return to version recommendation: update the release files and necessary commits, rerun checks, and confirm changed decisions or scope under the existing authorization rules. Explain conflicts with user-selected versions instead of replacing them silently; present and obtain approval for a changed pruning list. Correct landed content with a new commit, without rewriting landed history. Repeat this validation if remote advancement requires integration or push to be retried.
4. Run the project's required checks against the final release content and execute only authorized publication steps. Verify that the release commit lies on the remote default branch's first-parent history, the remote tag resolves to it, and the notes and required CI/artifacts match before reporting publication complete; report pending CI or partial completion accurately.

## Examples

- With neither project commit nor release guidance, compatible `fix` and `feat` commits since `v2.4.3` recommend `v2.5.0` after their messages and diffs are verified. Group their delivered outcomes in the note, commit the note and version files together, then tag the validated default-branch release commit and publish only with authorization. The release-preparation commit does not cause another version increment or become a note entry.
- From `v2.4.3`, only a compatible fix recommends `v2.4.4`; a compatible new capability plus fixes recommends `v2.5.0`; removing a supported CLI flag recommends `v3.0.0`.
- The default branch's latest applicable tag is `v2.4.3`, while an unmerged feature branch has `v9.0.0`: use `v2.4.3` as the baseline.
- Five commits fixing retries that abort prematurely become one note describing reliable use of the configured retry count during temporary disconnections, rather than five implementation entries.
- With 10 existing version notes, adding the next version removes the oldest confirmed note in the same release commit, leaving 10 including the new one.
- A squash-merged release PR is tagged at its validated landed commit on the default branch, not at the earlier PR head.
- A release-preparation commit C merged into the default branch with merge commit M is released by tagging validated M. The next first-parent lookup can then find that release tag.
- From `v2.4.3`, a candidate with only compatible new capabilities initially recommends `v2.5.0`. If integration also includes an unreleased removal of a supported CLI flag from the default branch, recommend `v3.0.0` instead, explain the change, and update the note filename, title, version files, and migration notes. Tag only after the changed version/scope is confirmed and the final commit is revalidated.
