# Error and Recovery Contracts

Sources: [protocol](../../../docs/05-tool-protocol.md), [Runtime](../../../docs/03-runtime-and-execution.md), [Workspace](../../../docs/04-workspace-and-git.md).

## 1. Scope / Trigger

Command validation, asynchronous operations, Runtime failures and delivery findings. Errors do not create new Task/Node states.

## 2. Signatures

Commands return a committed result, accepted operation reference, or deterministic error with stable code, explanation and relevant current-version/operation reference. Exact schemas and HTTP mappings are established in `packages/protocol` during scaffolding.

## 3. Contracts

Distinguish invalid input, denied scope, stale execution, version conflict, unmet precondition and unsupported operation. Preserve admitted operation identity. Timeout does not prove no effect; successful process exit does not prove completion. Healthy capacity waiting is queued work.

## 4. Validation & Error Matrix

| Failure | Behavior | Recovery |
| --- | --- | --- |
| Invalid Plan | Correctable validation, no Runtime fallback | Same Planner corrects |
| Objective CLI failure | End Attempt, bounded fallback | Same Node/activation |
| Exit without lifecycle outcome | Node BLOCKED | Owner Retry |
| Uncertain admitted completion | Node RUNNING with recovery | Reconcile existing operation |
| Local capture hard limit | No completion; Node BLOCKED | Preserve, repair/reconcile, Retry |
| Publication-only size/content finding | Completed Node; Task REVIEW; no remote write | Correction or eligible policy override |
| Provider hard size/permission limit | REVIEW | Correct/configure; no override |
| Failed accepted delivery | REVIEW, retain frozen batch | Retry; later chat does not gate it |

## 5. Good / Base / Bad Cases

Good: storage repair settles the admitted operation without duplicate integration.
Base: version conflict explains the rejected basis.
Bad: timeout starts a second PR or adds Task FAILED.

## 6. Tests Required

Assert category and committed effects, not only HTTP status. Use separate local capture and publication limits; assert BLOCKED versus REVIEW. Test scoped overrides, non-overridable provider limits and uncertain-effect reconciliation.

## 7. Wrong vs Correct

Wrong: mark Node complete after a Git failure and only log the error.
Correct: persist failed/recoverable operation facts without granting completion evidence.
