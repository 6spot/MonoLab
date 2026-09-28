# Formal command scopes and receipts

## Goal

Extend probe contracts into authenticated product command admission and immutable receipts.

## Planning status

Roadmap level: **subtask**. Status: **planning / backlog**, not implementation-ready. The Owner approved the three-level roadmap structure on 2026-09-28. This PRD records scope and acceptance, not approval to start implementation.

## Background and scope

Versioned protocol, validation, receipts and server authorization; no product UI or broad scheduler. Reuse probe schema generation and transport.

Architecture modules remain authoritative. The existing boundary probe implements Stage A step 0 only; its local/host evidence does not establish the full Stage A or V1 gate. Reuse its code and tests after reviewing actual results instead of recreating the probe.

## Dependencies and order

- [Stage 0: Feasibility gates](../09-28-stage-0-feasibility/prd.md)

These are completion/evidence gates, not automatic scheduler dependencies. Parent/child links express scope ownership only. Evidence inspection and planning may proceed earlier; implementation must resolve upstream failures first.

## Child tasks

This is the intended implementation leaf. Split again only if design reveals more than one independently deliverable behavior or recovery boundary.

## Acceptance criteria

- [ ] Owner, Runner and Attempt scopes cannot impersonate one another.
- [ ] Same request identity/content replays the existing outcome; conflicting content is rejected.
- [ ] Exact-content confirmation rejects stale or mismatched bases; command failures are distinct from admitted-operation failure.

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
