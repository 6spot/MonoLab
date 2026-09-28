# Rebuildable reads and reconnect cursors

## Goal

Expose canonical execution facts through rebuildable projections and resumable reads.

## Planning status

Roadmap level: **subtask**. Status: **implementation-ready under the Owner’s autonomous sequential-development instruction**. The Owner approved the three-level roadmap structure on 2026-09-28. The Owner authorized sequential implementation without sub-agents.

## Background and scope

Read APIs and cursor contract tests; screen design and component implementation remain in later product tasks.

Architecture modules remain authoritative. The existing boundary probe implements Stage A step 0 only; its local/host evidence does not establish the full Stage A or V1 gate. Reuse its code and tests after reviewing actual results instead of recreating the probe.

## Dependencies and order

- [Durable dispatch and event ingestion](../09-28-durable-dispatch-events/prd.md)

These are completion/evidence gates, not automatic scheduler dependencies. Parent/child links express scope ownership only. Evidence inspection and planning may proceed earlier; implementation must resolve upstream failures first.

## Child tasks

This is the intended implementation leaf. Split again only if design reveals more than one independently deliverable behavior or recovery boundary.

## Acceptance criteria

- [x] Projection rebuild reproduces current formal state and Timeline without turning logs into lifecycle truth.
- [x] Reconnect using a saved cursor does not lose or duplicate visible formal events; authorization applies to reads.
- [x] Runner-owned files are accessed through the service boundary rather than backend-local paths.

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

## Concrete read boundary

Provide authenticated Owner Task overview and formal-event pages. Rebuild overview
from canonical Task/Plan/Node/Attempt/operation records on every read, without a
second lifecycle cache. Resume append-only Task events from a Task-bound versioned
cursor; detect missing history or invalid future positions and require snapshot
refresh instead of silently skipping gaps. Separate raw Runtime events from Timeline.

Use bounded JSON pages and generated schemas/OpenAPI. No backend-local Runner file
access, UI screens, browser streaming loop or large-file transport is added here.
The cursor API is the durable foundation consumed by subsequent UI/SSE work.
