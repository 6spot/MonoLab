# Task control and revision records

## Goal

Persist product Task control and immutable revision identities under explicit activation guards.

## Planning status

Roadmap level: **subtask**. Status: **implementation-ready under the Owner’s autonomous sequential-development instruction**. The Owner approved the three-level roadmap structure on 2026-09-28. The Owner reiterated continuation on 2026-09-29 and prohibited sub-agents.

## Background and scope

Canonical record and transition primitives tested with fakes; semantic Planner routing is deferred to Task execution.

Architecture modules remain authoritative. The existing boundary probe implements Stage A step 0 only; its local/host evidence does not establish the full Stage A or V1 gate. Reuse its code and tests after reviewing actual results instead of recreating the probe.

## Dependencies and order

- [Formal command scopes and receipts](../09-28-command-scopes-receipts/prd.md)

These are completion/evidence gates, not automatic scheduler dependencies. Parent/child links express scope ownership only. Evidence inspection and planning may proceed earlier; implementation must resolve upstream failures first.

## Child tasks

This is the intended implementation leaf. Split again only if design reveals more than one independently deliverable behavior or recovery boundary.

## Acceptance criteria

- [x] Task-owned Nodes and immutable Specification/Plan graph membership remain distinct from Attempts.
- [x] Guarded transitions reject stale activation/claim/revision inputs and retain history.
- [x] Transaction tests prove effective pointers/control records do not expose partially published revisions.

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

## Concrete foundation boundary

- Preserve the existing Task control columns as the single canonical control record;
  add no competing pointer/state table. Permit a Task without a Plan before Start.
- Persist immutable revision ancestry/bases, per-Plan Node definitions and append-only
  Node activation/completion records. Legacy probe records retain their content.
- Provide internal transaction-local Task initialization, initial Plan publication,
  pre-start exact-authorized Specification publication and settled reactivation.
- Use the records in probe fixtures and existing command/finalization guards, so
  changed Plan membership or activation cannot grant stale completion.
- Do not expose new unauthenticated HTTP operations. Public creation/Start, semantic
  Plan generation, post-start requirement settlement, Replan and scheduling remain
  with their existing later tasks. Internal helpers require the calling command
  module to authenticate and persist its receipt/outbox in the same transaction.
- Verify clean and populated upgrades, immutable history, cross-Task constraints,
  concurrent publications and rollback with real PostgreSQL.
