# Durable selected Attempt queue

Migration 6 adds Attempt state, immutable queue-input digest and Task/Runner locality.
Existing claimed probe Attempts retain ownership; derive historical terminal state
only from committed operation/authority facts. A QUEUED Attempt has no physical
process/claim (`process_released=true`, mutation disabled). Promotion atomically
sets RUNNING/unreleased, assigns monotonic owner fencing, marks its Node RUNNING
and inserts exactly one durable Start outbox row. This reuses the existing capacity
and unresolved-owner predicates without exposing queued payloads in inventory.

`DispatchQueue.enqueue(tx, input)` is called inside an authenticated system/command
transaction with its command receipt. It locks Runner then Task, validates expected
control/revision/current Node membership and persists the chosen immutable Dispatch
identity. Reusing an Attempt ID requires the same complete queue input digest.
One queued Attempt per owner prevents duplicate selected work; active old owners
may retain the physical claim until reconciliation. Selection of Runtime/model,
Owner policies and public Start are not this leaf's responsibility.

`promoteNext(runner, connectionInstance)` locks Runner, checks ready/current connection,
capacity and locality, then Task and Attempt. Reject stale queued basis/terminal Task
by cancelling only that queued record; never silently refresh context. Skip an owner
whose previous process or operation has not settled. Task/Runner pinning is established
with first claim and reused thereafter; no automatic migration. The existing WSS
pending poll calls promotion before draining outbox, so restart needs no memory wakeup.

Outbox transmission remains at least once with stable identities. Started events
acknowledge the Start intent; terminal logical state and physical reservation remain
separate. Completion settlement succeeds an Attempt; missing formal outcomes fail
it and admit Stop; explicit revocation cancels it. Late started/output/exit facts
cannot revive terminal state. Event ACK is exact sequence, not a cumulative cursor.

Use real PostgreSQL and fake Runner events/effects, preserving canonical host data.
This gate does not establish real-model execution, reboot or native Runtime behavior.
