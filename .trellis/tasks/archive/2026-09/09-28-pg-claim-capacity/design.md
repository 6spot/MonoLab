# Independent PostgreSQL claim verification

## Boundary and existing behavior

`apps/server/src/fixtures.ts:createAttemptFixture` locks Runner capacity, then
Task control, then writes Attempt plus durable Start intent in one transaction.
Identical Attempt retries return the recorded dispatch. PostgreSQL's partial
unique index `one_unresolved_owner` prevents multiple unresolved claims for a
Node or Planner owner, including different Runner rows.

The existing test uses concurrent promises sharing a pool. Add a focused real-DB
suite and small subprocess worker to establish process-independent contention.
Use the pinned Node runtime with native TypeScript stripping; no new dependency.

## Worker and synchronization design

The parent owns a randomly named test schema, migrations and cleanup. Each child
opens its own pool in that schema and communicates bounded structured ready,
run, result and failure messages over IPC. Never place credentials in argv/output.
Workers invoke the existing fixture/service interfaces for actual admissions.

Coordinate contention with explicit ready barriers and database lock observation,
not sleeps as proof of overlap. Set bounded statement/lock/test deadlines and
include sanitized diagnostics when a worker fails to reach its barrier.

For pre-commit crash verification, a test-only worker holds a real transaction
and reports its checkpoint; terminate that process and verify rollback plus lock
release from a distinct connection. This proves PostgreSQL crash behavior, not
physical Runner absence. For post-commit failure, commit through the real fixture,
terminate before a simulated dispatcher wakeup, then inspect the retained owner
and Start outbox row through a fresh process/connection.

## Matrix

1. Same Attempt/input: one dispatch and one outbox intent, both replays agree.
2. Distinct Attempts, same owner: exactly one unresolved owner; test across Runner
   rows as well as within one Runner so the unique index is exercised independently.
3. More workers than capacity: exact successful count; no orphan loser records.
4. Worker termination before/after commit: rollback versus retained durable intent.
5. Revoke/stale authority: retain capacity until validated physical Stop report;
   inspect the database boundary only, using explicit fixture events.

## Compatibility and operational limits

No expected protocol/schema or migration change. If a test exposes a defect,
repair the owning transaction/guard only and add its regression. A new scheduler
or general lease design would require rescoping. Never alter canonical probe
records: all rows stay in disposable random schemas. Child shutdown and schema
cleanup run in finally/teardown; do not drop a schema while its workers are live.
No models, Git provider effects, service restarts or whole-host reboot are needed.

The resulting evidence clears only this PostgreSQL leaf. Runtime compatibility,
physical process isolation and the later transaction/effect recovery leaf remain
separate acceptance boundaries.
