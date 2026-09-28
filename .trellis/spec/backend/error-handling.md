# Error and Recovery Contracts

Sources: [protocol](../../../docs/05-tool-protocol.md), [Runtime](../../../docs/03-runtime-and-execution.md), [Workspace](../../../docs/04-workspace-and-git.md).

## 1. Scope / Trigger

Command validation, asynchronous operations, Runtime failures and delivery findings. Errors do not create new Task/Node states.

## 2. Signatures

Commands return the generated `CommandResult` (`committed`, `admitted`, `error`, `unknown`) in [contracts.json](../../../packages/protocol/schemas/v1/contracts.json). `CommandError` carries a stable protocol code. [app.ts](../../../apps/server/src/app.ts) maps unauthorized to HTTP 401, denied scope to 403, internal errors to 500 and other deterministic probe errors to 409. Malformed/oversized/unsupported HTTP bodies become `invalid_input`, not internal failures.

`OperationResult` includes `operation_id`, `attempt_id`, `success`, `result` and optional `failure_kind`. Failure kind is forbidden on success; blocking kinds are accepted only for completion operations.

## 3. Contracts

Distinguish invalid input, denied scope, stale execution, version conflict, unmet precondition and unsupported operation. Preserve admitted operation identity. Timeout does not prove no effect; successful process exit does not prove completion. Healthy capacity waiting is queued work.

## 4. Validation & Error Matrix

| Failure | Behavior | Recovery |
| --- | --- | --- |
| Invalid Plan | Correctable validation, no Runtime fallback | Same Planner corrects |
| Objective CLI failure | End Attempt, bounded fallback | Same Node/activation |
| Exit without lifecycle outcome | Node BLOCKED | Owner Retry |
| Planner exit without formal reply | Surrounding Task state unchanged; attention/stop recorded | Planner recovery |
| Uncertain admitted completion | Node RUNNING with recovery | Reconcile existing operation |
| `capture_hard_limit` / `invalid_finalization` | No completion; Node BLOCKED | Preserve original operation, repair/reconcile, Retry |
| Publication-only size/content finding | Completed Node; Task REVIEW; no remote write | Correction or eligible policy override |
| Provider hard size/permission limit | REVIEW | Correct/configure; no override |
| Failed accepted delivery | REVIEW, retain frozen batch | Retry; later chat does not gate it |

## 5. Good / Base / Bad Cases

Good: storage repair settles the admitted operation without duplicate integration.
Base: version conflict explains the rejected basis.
Bad: timeout starts a second PR or adds Task FAILED.

## 6. Tests Required

Assert category and committed effects, not only HTTP status. Use separate local capture and publication limits; assert BLOCKED versus REVIEW. Test scoped overrides, non-overridable provider limits and uncertain-effect reconciliation.

Current probe regressions are in [app.test.ts](../../../apps/server/test/app.test.ts), [auth.test.ts](../../../apps/server/test/auth.test.ts) and [postgres.test.ts](../../../apps/server/test/postgres.test.ts). Malformed signed identities fail authentication; an expired Agent token cannot mutate while Runner-scoped reads can recover admitted results. Typed failure -> transient failure -> repaired success must keep the same operation and reject a changed activation. Publication/override cases remain unimplemented product gates.

## 7. Wrong vs Correct

Wrong: mark Node complete after a Git failure and only log the error.
Correct: persist failed/recoverable operation facts without granting completion evidence.
