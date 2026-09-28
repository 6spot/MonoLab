# Durable dispatch and event ingestion

## Goal

Commit dispatch intent transactionally and ingest Runtime events idempotently.

## Planning status

Roadmap level: **subtask**. Status: **implementation-ready under the Owner’s autonomous sequential-development instruction**. The Owner approved the three-level roadmap structure on 2026-09-28. The Owner authorized sequential implementation without sub-agents.

## Background and scope

Backend scheduling/outbox primitives and deterministic fake-adapter tests; native Runner integration belongs to its work package.

Architecture modules remain authoritative. The existing boundary probe implements Stage A step 0 only; its local/host evidence does not establish the full Stage A or V1 gate. Reuse its code and tests after reviewing actual results instead of recreating the probe.

## Dependencies and order

- [Task control and revision records](../09-28-task-control-records/prd.md)
- [Verify atomic receipts and effect recovery](../09-28-pg-transaction-recovery/prd.md)

These are completion/evidence gates, not automatic scheduler dependencies. Parent/child links express scope ownership only. Evidence inspection and planning may proceed earlier; implementation must resolve upstream failures first.

## Child tasks

This is the intended implementation leaf. Split again only if design reveals more than one independently deliverable behavior or recovery boundary.

## Acceptance criteria

- [x] Crash between admission and send preserves one durable dispatch identity.
- [x] Duplicate/reordered events do not duplicate effects or revive terminal work.
- [x] Two workers respect claim/capacity ownership and fake Runner locality rejects unsupported movement.

## Out of scope

No team abstractions, generic workflow engine, cross-Runner migration/failover, permanent disk-loss recovery, mandatory live steering or native session resume. Do not alter the accepted architecture to bypass a failed feasibility gate. This task does not own unrelated roadmap packages or bootstrap-guidelines.

## Before implementation

Review upstream evidence and the current source, refine leaf boundaries and observable failure cases, and resolve any Owner-owned acceptance choices. For each complex implementation leaf, complete design.md, implement.md and curated implement/check contexts, present the final planning summary, and obtain its approval before task.py start. Stage and work-package records coordinate acceptance and are not bulk implementation targets.

## Source contracts

- [Architecture](../../../ARCHITECTURE.md)
- [Implementation sequence and acceptance matrices](../../../docs/09-first-executable-slice.md)
- [Readiness gates](../../../docs/10-architecture-readiness.md)
- [Invariants](../../../docs/08-principles-and-non-goals.md)
- [Engineering specs](../../spec/index.md)

## Concrete dispatch foundation

Persist selected queued Attempts separately from physical claims. Promote under
Runner capacity and Task/Node/revision guards, preserving a stable dispatch ID and
outbox intent across restart/lost replies. Pin a Task to its first execution Runner;
unsupported movement fails explicitly. Queueing while capacity is full is healthy
and does not block the Task. Reuse authenticated WSS outbox/event paths and exact
per-event acknowledgements; no new transport or model invocation.

Add explicit Attempt lifecycle and keep terminal status independent of physical
process release. Test concurrent promotions, crash/lost replies, capacity waiting,
old-owner settlement, stale queued bases, locality and late/duplicate events.
Public Owner Start and semantic Runtime/context selection remain later work; this
leaf accepts already selected immutable inputs through an internal system API.
