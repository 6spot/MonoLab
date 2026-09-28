# PostgreSQL and Atomic Commands

Sources: [formal data](../../../docs/06-state-and-formal-data.md), [commands](../../../docs/05-tool-protocol.md), [stack](../../../docs/11-technology-and-deployment.md).

## 1. Scope / Trigger

Commands, claims, migrations, completion and delivery persistence. PostgreSQL is canonical; Runner SQLite is effect bookkeeping. Use Drizzle with reviewed SQL for explicit transaction/locking behavior.

## 2. Signatures

Conceptual records include `command_receipts`, `authorization_receipts`, `task_controls`, `node_activations`, `outbox`. Actual SQL names belong in migrations; API contracts are not ORM rows.

Required uniqueness: scoped request IDs; one Task/source proposal; successful `(node_id, activation)` completion; Task event sequence and Plan revision; active owner claim.

## 3. Contracts

Transaction sketch, not existing SQL:

```text
BEGIN
  authenticate and check scope
  find receipt by principal + scope + request_id
  return recorded result if command/digest match
  lock relevant control/owner/capacity records in stable order
  validate expected basis and exact authorization
  write state/operation + consumed authorization + event/receipt/outbox
COMMIT
run admitted external effects outside the transaction
```

Check prior receipts before stale-version checks for new effects. Owner claim and Runner capacity are claimed together. Event sequence and control version differ; proposal bookkeeping must not stale its own proposal.

Acceptance and message admission share a Task control lock; retain input cutoff and later-message attribution. See [delivery](delivery-contracts.md).

## 4. Validation & Error Matrix

| Condition | Result |
| --- | --- |
| Same key/command/digest | Existing result/operation |
| Same key, changed command/payload | Conflict, no effect |
| New effect, stale basis | Version conflict; no automatic version substitution |
| Failed transaction | No orphan consumed authorization |
| Lost worker wakeup | Durable unfinished work resumes |
| Expired lease, possibly live writer | Reconcile; no blind takeover |

## 5. Good / Base / Bad Cases

Good: two dispatchers contend for one slot; one claims it.
Base: replay returns the original receipt.
Bad: commit state then enqueue only in memory; crash strands work.

## 6. Tests Required

Use real PostgreSQL for locking/constraints. Race independent workers and inject a crash between commit and wakeup; assert one transition/event/admission. Test message/acceptance both ways and receipt replay after terminalization.

Reviewed migrations run under one migration lock before compatible server startup. Verify clean install, upgrade, constraints and persisted operation-version compatibility; document rollback/data-loss behavior.

## 7. Wrong vs Correct

Wrong: await Git inside a DB transaction.
Correct: admit, commit, execute/reconcile externally, then commit the guarded result.
