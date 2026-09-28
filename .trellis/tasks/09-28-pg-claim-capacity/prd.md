# Verify cross-worker claims and capacity

## Goal

Prove a shared PostgreSQL scheduler claim cannot be duplicated or exceed configured capacity.

## Planning status

Roadmap level: **subtask**. Status: **implementation and verification passed; commit pending**. The Owner requested
deferring rate-limited Runtime trials until tomorrow and continuing independent
tasks. This leaf verifies database claims without invoking a model. Runtime
acceptance remains incomplete and must not be inferred from these results.

## Background and scope

Audit and reuse the probe database tests; add only missing real-PostgreSQL claim/capacity cases. Do not implement the full product scheduler.

Architecture modules remain authoritative. The existing boundary probe implements Stage A step 0 only; its local/host evidence does not establish the full Stage A or V1 gate. Reuse its code and tests after reviewing actual results instead of recreating the probe.

## Dependencies and order

- [Runtime and host feasibility](../09-28-gate-runtime/prd.md)

The upstream probe's 16 PostgreSQL tests and source inspection establish a usable
database boundary. Its outstanding free-provider and physical Runtime scenarios
do not execute in this leaf. Proceed with isolated database verification under the
Owner's requested deferral; broad product implementation remains gated on Runtime
acceptance. Parent/child links express scope ownership, not automatic scheduling.

## Child tasks

This is the intended implementation leaf. Split again only if design reveals more than one independently deliverable behavior or recovery boundary.

## Acceptance criteria

- [x] Two separate Node worker processes with independent PostgreSQL pools race the same Attempt and retain one dispatch, one active owner and one start outbox record; identical replay returns that dispatch.
- [x] Different Attempt IDs contending for the same Node activation retain only one unresolved owner, including across different Runners.
- [x] Multiple independent workers racing distinct Attempts cannot exceed Runner capacity; losing transactions leave no orphan Task/Node/dispatch/outbox records.
- [x] Terminating a worker with an open transaction rolls back its writes and releases database locks; a survivor can proceed. Termination after commit retains the claim and one durable Start intent.
- [x] Revocation, old connection/events and lease/heartbeat age alone cannot release an unresolved slot or revive mutation authority. Only the existing validated Stop settlement permits reuse.
- [x] Reproduction commands and PostgreSQL/Node versions are recorded; workers, connections and random schemas are cleaned up even on failure.

## Confirmed implementation boundary

Reuse `createAttemptFixture`, `BoundaryService`, the transaction helper and the
`one_unresolved_owner` partial unique index. Current capacity tests use concurrent
promises in one process; the missing evidence is independently scheduled workers
and explicitly observed transaction/crash boundaries. Do not add a new scheduler,
lease mechanism, public endpoint or model invocation to obtain this evidence.

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
