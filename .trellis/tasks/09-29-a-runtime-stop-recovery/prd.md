# Runtime Stop and restart reconciliation

## Goal

Make product Stop, failed execution and service restart preserve formal and physical ownership until safe continuation.

## Dependencies

Follow `09-29-a-runtime-runner-logs`; retain the accepted boundary probe's process and journal behavior.

## Requirements

- Owner-authorized Stop/retry controls admit durable, idempotent effects through the Tool Protocol boundary.
- Terminate the whole descendant tree and settle admitted effects before releasing a slot or workspace for a successor.
- Backend, Runner and host restart reconcile retained identities, uncertain Start/Stop and expired command results before replacement dispatch.
- Keep objective failure, queued capacity wait and Owner Stop distinct in formal state and Owner attention.

## Acceptance criteria

- [ ] Stop and failed/missing formal completion cannot release physical ownership early or permit a second writer.
- [ ] Duplicate Stop/Retry and lost acknowledgements recover the same operation/receipt.
- [ ] Backend/Runner restart preserves the Attempt lineage; interrupted host execution is blocked until verified reconciliation.

## Out of scope

Native Runtime session resume, permanent disk loss, cross-Runner failover and automatic silence-based hang detection.
