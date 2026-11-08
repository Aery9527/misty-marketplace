# Remote Integration and Conflicts

## Scope and Evidence

- Use this guidance when the calling workflow needs to integrate local and remote changes. Reuse existing authorization for the same scope; integration does not authorize an unrequested push or release. Follow an explicitly required integration strategy; otherwise prefer a merge preserving both histories. MUST NOT discard unrelated work, rewrite published history, or force-push to bypass divergence.
- Refresh the selected remote and identify the target branch, common ancestor, local SHA, and remote SHA. Compare both sides with the ancestor, read the affected code and requirements, and state each side's intended behavior with concrete input/output examples. Assess behavior and interactions, not conflict-line or file counts; a clean Git merge does not establish functional compatibility.

## Decision Rules

1. If both sides require mutually exclusive behavior for the same condition, stop before committing a chosen resolution, tagging, or publishing, and ask the user to decide. MUST NOT silently choose a side, drop a feature, or invent a configuration switch to avoid the decision.
2. If both intentions appear compatible but preserving them requires reasoning about shared logic, interfaces, state, ordering, errors, or data transformations, prepare a reviewable integration candidate and MUST call an independent reviewer before accepting the resolution or pushing/tagging it. This includes complex interactions without textual conflicts. If the resolution cannot be justified as simple, use this review path.
3. Resolve autonomously only when both intentions and their combination are clear, no behavioral tradeoff is required, and appropriate checks support the result, such as independent additions to a documentation list with unchanged meanings.

## Review and Continuation

1. Give the reviewer the common ancestor, both SHAs and diffs, requirements and expected behavior for each side, the proposed resolution, and verification results. Use the reviewer designated by the context or an available independent reviewer; self-review does not satisfy this requirement. If required review is unavailable, stop and report the blocker.
2. Verify findings against the actual changes and discuss disagreements. The review MUST check preservation of both sides' intended behavior and their interactions. Use focused checks or tests covering both sides and relevant combined cases; removing conflict markers or passing existing tests alone is insufficient evidence. State any remaining uncertainty rather than claiming complete equivalence.
3. If review and investigation still cannot establish that both intentions are preserved, or establish an incompatibility, stop before committing a chosen resolution, tagging, or publishing and ask the user to decide. Preserve the work for inspection. Report what each side requires, a concrete conflicting or unverified case, why the choice cannot be made autonomously, the options and behavioral consequences, and the current integration state.
4. Once applicable checks pass and required review has no unresolved material issue, continue only the authorized workflow. If either side changes, reassess the resulting integration; materially changed resolutions require renewed review. For a release, return to final-content and version verification before tagging or publishing.

## Examples

- Simple: both sides add independent supported options to a documentation list. Preserve both entries, verify their meanings against the implementation, and continue without a mandatory reviewer.
- Complex: one side changes the retry limit and the other changes which errors are retryable. Preserve both requirements, check transient and permanent errors at the configured limit, and MUST obtain review even if Git merges cleanly.
- Incompatible: for the same expired credential, one side requires `401` and the other requires guest fallback with `200`. Stop and present the alternatives; neither the agent nor the reviewer may choose the product behavior for the user.
