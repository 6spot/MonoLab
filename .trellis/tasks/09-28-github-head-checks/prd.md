# Verify GitHub checks and exact-head merge

## Goal

Observe GitHub merge preconditions and checks behavior on an explicitly authorized test repository.

## Planning status

Roadmap level: **subtask**. Status: **ready for implementation**. The Owner approved the three-level roadmap structure on 2026-09-28. The Owner now authorizes sequential implementation and creating a dedicated test repository for remote PR/check/merge experiments.

## Background and scope

Bounded provider experiment only; no production delivery coordinator. Resolve test repository, allowed create/push/merge effects and credentials before execution.

Architecture modules remain authoritative. The existing boundary probe implements Stage A step 0 only; its local/host evidence does not establish the full Stage A or V1 gate. Reuse its code and tests after reviewing actual results instead of recreating the probe.

## Dependencies and order

- No upstream task gate; execution still requires the planning and authorization conditions below.

These are completion/evidence gates, not automatic scheduler dependencies. Parent/child links express scope ownership only. Evidence inspection and planning may proceed earlier; implementation must resolve upstream failures first.

## Child tasks

This is the intended implementation leaf. Split again only if design reveals more than one independently deliverable behavior or recovery boundary.

## Acceptance criteria

- [x] Record permitted repository/effects before any remote mutation.
- [x] A head changed after acceptance cannot be merged using the old expected head.
- [x] Pending/failing required checks and unavailable access yield distinguishable recoverable outcomes with sanitized evidence.

## Out of scope

No team abstractions, generic workflow engine, cross-Runner migration/failover, permanent disk-loss recovery, mandatory live steering or native session resume. Do not alter the accepted architecture to bypass a failed feasibility gate. This task does not own unrelated roadmap packages or bootstrap-guidelines.

## Before implementation

Review upstream evidence and the current source, refine leaf boundaries and observable failure cases, and resolve any Owner-owned acceptance choices. For each complex implementation leaf, complete design.md, implement.md and curated implement/check contexts, present the final planning summary, and obtain its approval before task.py start. Stage and work-package records coordinate acceptance and are not bulk implementation targets.

- Owner authorized creating a dedicated synthetic test repository and the described push/PR/check/merge effects. Current gh authentication is account 6spot. Use a unique monolab-feasibility-* repository, private by default; if private branch protection is unavailable, retain that finding and use a separate public synthetic-only repository for enforcement evidence. No MonoLab source or credentials are published.

## Source contracts

- [Architecture](../../../ARCHITECTURE.md)
- [Implementation sequence and acceptance matrices](../../../docs/09-first-executable-slice.md)
- [Readiness gates](../../../docs/10-architecture-readiness.md)
- [Invariants](../../../docs/08-principles-and-non-goals.md)
- [Engineering specs](../../spec/index.md)
