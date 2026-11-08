# Logging Examples

- When no structured-field convention applies, fixed field positions let AI interpret values against the source code, reducing log space and tokens spent on repeated explanations; for example, `Enter {AGE} {NAME} "{MSG}"`.
- Request-count statistics: the `Enter {AGE} {NAME} "{MSG}"` example above represents one event each time a request enters the handler.
    - If these events are needed only to count requests, and losing unreported counts is acceptable, increment a counter at the same entry point for each request. For example, write `Request ALL 123` every 5s instead of writing each `Enter` record.
    - `ALL` means all requests at this entry point, without grouping by `AGE`, `NAME`, or `MSG`. `123` means 123 requests arrived during that 5s interval; count each interval separately.
    - If individual `Enter` records are also needed for diagnostics or auditing, retain those records; statistics may be derived from them.
