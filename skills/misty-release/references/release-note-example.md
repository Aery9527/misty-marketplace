# Release Note Example

- This complete example describes a fictional upload CLI release from 2.8.1 to 3.0.0. Its removed flag is a breaking change. Replace the version, capabilities, limits, and migration commands with verified project facts; match the project's note language.
- Group by delivered outcome. Include a breaking-change section and concrete migration steps only when the release requires them; omit empty sections.

```markdown
# 3.0.0

## New Capabilities

- Uploads automatically retry temporary connection failures up to three times. A connection restored within those attempts no longer requires restarting the command manually; after the third failed retry, the command still reports failure.

## Fixes

- Files whose names contain spaces now retain their complete names at the destination. Previously, the CLI truncated the name at the first space.

## Breaking Changes

- Removed the `--retry-count` flag in favor of `--retries`. Scripts using the old flag now fail argument validation and must be updated before upgrading.

## Migration

1. Replace `upload report.csv --retry-count 5` with `upload report.csv --retries 5` in scripts and CI jobs.
2. Run the updated command against a test destination and confirm that the uploaded file retains its expected name.
```

- Avoid entries such as “update retry module,” “fix parser,” or “bump version”: they do not explain the delivered behavior. Do not claim faster uploads without measurement evidence.
