# Verify uncertain GitHub create and merge recovery

> Product terminology and command/path examples were normalized to `monos` on
> 2026-09-29. Exact historical names and observations remain in the original Git
> revisions and unchanged raw JSON attachments; this edit is not a new test run.

## Goal

Demonstrate remote-truth reconciliation after lost PR creation and merge responses.

## Planning status

Roadmap level: **subtask**. Status: **ready for implementation**. The Owner approved the three-level roadmap structure on 2026-09-28. Owner authorized sequential development and creation/use of the synthetic GitHub repository.

## Background and scope

Demonstrate remote-truth reconciliation after lost PR creation and merge responses.

Architecture modules remain authoritative. The existing boundary probe implements Stage A step 0 only; its local/host evidence does not establish the full Stage A or V1 gate. Reuse its code and tests after reviewing actual results instead of recreating the probe.

## Dependencies and order

- [Verify GitHub checks and exact-head merge](../09-28-github-head-checks/prd.md)

These are completion/evidence gates, not automatic scheduler dependencies. Parent/child links express scope ownership only. Evidence inspection and planning may proceed earlier; implementation must resolve upstream failures first.

## Child tasks

This is the intended implementation leaf. Split again only if design reveals more than one independently deliverable behavior or recovery boundary.

## Acceptance criteria

- [x] Dropped PR-create response is reconciled to the existing PR before another create is considered.
- [x] Dropped merge response resolves actual head/merge state rather than inventing success or failure.
- [x] Evidence includes permitted cleanup, repository identity, provider observations and reproducible failure injection.

## Out of scope

No team abstractions, generic workflow engine, cross-Runner migration/failover, permanent disk-loss recovery, mandatory live steering or native session resume. Do not alter the accepted architecture to bypass a failed feasibility gate. This task does not own unrelated roadmap packages or bootstrap-guidelines.

## Before implementation

Review upstream evidence and the current source, refine leaf boundaries and observable failure cases, and resolve any Owner-owned acceptance choices. For each complex implementation leaf, complete design.md, implement.md and curated implement/check contexts, present the final planning summary, and obtain its approval before task.py start. Stage and work-package records coordinate acceptance and are not bulk implementation targets.

- Use the already authorized synthetic repository 6spot/monos-feasibility-20260928-160020-public and current gh authentication; only new synthetic branches/PRs/statuses/merges.

## Source contracts

- [Architecture](../../../ARCHITECTURE.md)
- [Implementation sequence and acceptance matrices](../../../docs/09-first-executable-slice.md)
- [Readiness gates](../../../docs/10-architecture-readiness.md)
- [Invariants](../../../docs/08-principles-and-non-goals.md)
- [Engineering specs](../../spec/index.md)
