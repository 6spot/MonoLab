# GitHub exact-head feasibility

Build a task-only Python harness using the installed authenticated gh CLI and
structured JSON stdin. Capture HTTP status separately from payload, never emit
authentication headers or tokens. All writes target a new uniquely named
monolab-feasibility-* synthetic repository; no product repository mutations.

Create a small README baseline and a test branch via GitHub Git/contents APIs.
Create a PR, record accepted head A, append synthetic head B and attempt merge
with expected SHA A: GitHub must reject and leave PR open. Protect the target
branch with one required commit-status context and enforce for administrators.
Set head B's status pending, failure, then success; observe blocked merge for
pending/failure and successful expected-SHA merge only after success. Poll bounded
mergeability when needed. An unauthenticated read of a private fixture supplies an
access-unavailable control; avoid logging provider bodies containing diagnostics.

Private branch protection may require a paid GitHub plan. If unavailable, record
that prerequisite outcome and use a separate public synthetic-only repository
for required-check enforcement. Never change an existing private repository's
visibility. Keep fixture repositories and evidence for reproducibility; cleanup
must target only the uniquely created names and need not delete audit evidence.

This is a provider experiment, not a production delivery coordinator. HTTP
failures, rate limits and unknown mergeability remain explicit outcomes. A dropped
response is not retry permission; that scenario belongs to the next leaf.
