# Command and persistence foundation

## Goal

Establish authenticated formal commands, canonical control records and durable scheduling primitives.

## Planning status

Roadmap level: **work-package**. Status: **planning / backlog**, not implementation-ready. The Owner approved the three-level roadmap structure on 2026-09-28. This PRD records scope and acceptance, not approval to start implementation.

## Background and scope

Establish authenticated formal commands, canonical control records and durable scheduling primitives.

Architecture modules remain authoritative. The existing boundary probe implements Stage A step 0 only; its local/host evidence does not establish the full Stage A or V1 gate. Reuse its code and tests after reviewing actual results instead of recreating the probe.

## Dependencies and order

- [Stage 0: Feasibility gates](../09-28-stage-0-feasibility/prd.md)

These are completion/evidence gates, not automatic scheduler dependencies. Parent/child links express scope ownership only. Evidence inspection and planning may proceed earlier; implementation must resolve upstream failures first.

## Child tasks

- [Formal command scopes and receipts](../09-28-command-scopes-receipts/prd.md)
- [Task control and revision records](../09-28-task-control-records/prd.md)
- [Durable dispatch and event ingestion](../09-28-durable-dispatch-events/prd.md)
- [Rebuildable reads and reconnect cursors](../09-28-read-projections-cursors/prd.md)

## Acceptance criteria

- [ ] Scope and exact-content confirmation guards are enforced by the backend.
- [ ] Task/Plan/Node/Attempt records, event order, outbox and read projections survive duplicate commands and restart.

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
