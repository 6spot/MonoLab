# Runtime and host feasibility

## Goal

Close the existing native Runner and installed CLI probe.

## Acceptance status

Roadmap level: **work-package**. Accepted on 2026-09-29 after reviewing the existing
boundary probe's AC1–AC10 evidence. The Owner authorized continued Runtime acceptance
and the final shared-host reboot. This parent adds no subsystem implementation.

## Background and scope

Close the existing native Runner and installed CLI probe.

Architecture modules remain authoritative. The existing boundary probe implements Stage A step 0 only; its local/host evidence does not establish the full Stage A or V1 gate. Reuse its code and tests after reviewing actual results instead of recreating the probe.

## Dependencies and order

- No upstream task gate; execution still requires the planning and authorization conditions below.

These are completion/evidence gates, not automatic scheduler dependencies. Parent/child links express scope ownership only. Evidence inspection and planning may proceed earlier; implementation must resolve upstream failures first.

## Child tasks

- [Boundary feasibility probe](../09-28-stage-a-boundary-probe/prd.md), completed and archived together with this parent. Preserve its original failed trials and current acceptance evidence.

## Acceptance criteria

- [x] Existing boundary-probe AC1-AC10 have reviewed evidence.
- [x] Any unsupported Runtime/host behavior is resolved or explicitly blocks product integration.

## Reviewed result

The child's [acceptance matrix](../09-28-stage-a-boundary-probe/research/acceptance-status.md)
and [host report](../09-28-stage-a-boundary-probe/research/runtime-resume-07.md) establish
the boundary on source `5b940b0`: OpenCode 1.18.30, selected zero-price LongCat,
three Node/one Planner normal completions, concurrent live service restart, immutable
retry/expired-result recovery, two-account permissions and controlled host reboot.
Final audit: 16 Attempts released, no residual writers; prior healthy shared-host
services recovered. Initial expired reboot hold and earlier provider/implementation
failures remain recorded alongside the successful fresh trials.

Supported baseline: deterministic native-tool/Tool Protocol compatibility on the
tested Linux host. Production integration must still implement its own service
enablement and product execution flow. This test manually starts Runner after boot;
it does not establish automatic boot enablement, autonomous planning reliability,
token streaming, power-loss durability or additional Runtime/model compatibility.
No installation/login automation or paid fallback is authorized by acceptance.

PostgreSQL and GitHub gates retain their independent ownership/review. This parent
does not accept the complete Stage 0, Stage A or V1 release.

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
