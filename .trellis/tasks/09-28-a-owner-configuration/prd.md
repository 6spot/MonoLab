# Owner access and minimum configuration

## Goal

Allow one authenticated Owner to configure the minimum Project, Role, Runtime and delivery prerequisites.

## Planning status

Roadmap level: **work-package**. Status: **planning / backlog**, not implementation-ready. The Owner approved the three-level roadmap structure on 2026-09-28. This PRD records scope and acceptance, not approval to start implementation.

## Background and scope

Allow one authenticated Owner to configure the minimum Project, Role, Runtime and delivery prerequisites.

Architecture modules remain authoritative. The existing boundary probe implements Stage A step 0 only; its local/host evidence does not establish the full Stage A or V1 gate. Reuse its code and tests after reviewing actual results instead of recreating the probe.

## Dependencies and order

- [Command and persistence foundation](../09-28-a-command-foundation/prd.md)

These are completion/evidence gates, not automatic scheduler dependencies. Parent/child links express scope ownership only. Evidence inspection and planning may proceed earlier; implementation must resolve upstream failures first.

## Child tasks

Sequential leaves after the verified command foundation:

1. [Owner login/session lifecycle](../09-29-owner-login-sessions/prd.md).
2. [Project and Role configuration](../09-29-project-role-configuration/prd.md).
3. [Runtime and provider configuration](../09-29-runtime-provider-configuration/prd.md).
4. [Protected configuration UI](../09-29-owner-configuration-ui/prd.md).

The Owner authorized autonomous sequencing and decisions on 2026-09-29; no sub-agents.

## Acceptance criteria

- [ ] Protected UI/API and separate Runner enrollment enforce their credential boundaries.
- [ ] Owner can configure one Project/repository, reusable Role, installed Runtime and GitHub integration without database edits; no CLI auto-install/login.

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
