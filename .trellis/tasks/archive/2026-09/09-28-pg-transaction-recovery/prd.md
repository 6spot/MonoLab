# Verify atomic receipts and effect recovery

## Goal

Prove transactional command intent and recovery remain consistent across database worker failure.

## Planning status

Roadmap level: **subtask**. Status: **ready for implementation under the Owner’s sequential-development instruction**. The Owner approved the three-level roadmap structure on 2026-09-28. The Owner subsequently directed implementing the planned tasks in order and deferring Runtime acceptance.

## Background and scope

Extend existing admission/replay coverage with multi-worker crash cases and fake external effects; physical Runner checks remain in the Runtime probe.

Architecture modules remain authoritative. The existing boundary probe implements Stage A step 0 only; its local/host evidence does not establish the full Stage A or V1 gate. Reuse its code and tests after reviewing actual results instead of recreating the probe.

## Dependencies and order

- [Verify cross-worker claims and capacity](../09-28-pg-claim-capacity/prd.md)

These are completion/evidence gates, not automatic scheduler dependencies. Parent/child links express scope ownership only. Evidence inspection and planning may proceed earlier; the preceding claim/capacity leaf has passed all six independent-worker cases and the full 22-test database suite. Its commit bookkeeping does not block this verification.

## Child tasks

This is the intended implementation leaf. Split again only if design reveals more than one independently deliverable behavior or recovery boundary.

## Acceptance criteria

- [x] Injected rollback commits none of receipt/state/event/outbox, while successful admission commits all required records once.
- [x] Crash after admission and duplicate replay resolve the existing receipt and durable effect intent.
- [x] Lease expiry alone cannot grant concurrent workspace/delivery effects; database and physical-owner assumptions are recorded.

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
