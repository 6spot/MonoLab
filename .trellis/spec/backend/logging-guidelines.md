# Logs, Events and Content

Sources: [formal data](../../../docs/06-state-and-formal-data.md), [transport](../../../docs/05-tool-protocol.md).

## Distinct records

| Record | Purpose |
| --- | --- |
| Service diagnostics | Failures, timing, correlation |
| Attempt Execution Log | Ordered raw Runtime/tool activity |
| Task Event | Formal lifecycle/output history |

Never promote stdout to a Task Event or canonical Planner reply. Timeline uses formal records. Managed Artifact content is immutable; a Runner path alone is not an Artifact.

## Correlation and redaction

Include relevant request/operation, Task, Node/activation, Attempt/fencing, Runner/incarnation and stream sequence. Ordinary queueing is informational; actionable failure and uncertain recovery need clear diagnostics.

Never log cookies, bearer/enrollment/provider credentials or matching sensitive values. Findings identify commit/path/digest/rule and redact values. Full immutable request payloads belong only in the service-private recovery journal, not public execution logs.

No logging library is selected by this spec. Reuse the framework logging path during scaffolding.

## Delivery and retention

Runner durably spools logs; server acknowledges persisted records. Deduplicate `(attempt_id, stream_id, sequence)`; reconnect resumes acknowledged cursors. Late logs cannot revive terminal execution. Apply backpressure and report disk failure instead of silently dropping required records.

Notifications deduplicate by formal source and activation/delivery version. Read state does not resolve the condition.

## Verification

Exercise duplicate/reordered chunks, reconnect and spool failure. Assert no duplicate formal events or secret values. Managed Artifacts survive workspace cleanup. A “done” log never completes a Node.
