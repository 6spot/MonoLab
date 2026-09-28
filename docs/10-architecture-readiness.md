# Architecture Readiness

This document is a review/gate index. Modules 01–08 own the rules; module 09 owns implementation sequencing. A documented contract is not evidence that its implementation or a third-party CLI has passed verification.

## Current conclusion

The Task / Plan / Node / Attempt separation supports staged expansion without replacing the domain model. Readiness is conditional on implementing the control/Runner, Workspace, authorization, and recovery contracts from Stage A. Merely keeping `runner_id` fields would not be sufficient.

No paper review guarantees freedom from implementation defects. The remaining high-risk assumptions must be exercised before broad product implementation, rather than deferred until multi-Runner rollout.

## Extension checks

| Concern | Required boundary now | Later implementation | Owning module |
| --- | --- | --- | --- |
| Multiple CLI installations | Policy Runtime ID independent of machine; Registry keyed by Runner/Runtime | More installed Runtime adapters and settings discovery | [03](03-runtime-and-execution.md) |
| Remote Runner | Authenticated, serializable dispatch/events; no Runner database access or backend path reads | Additional machines and placement | [03](03-runtime-and-execution.md) |
| Workspace locality | Logical Workspace ID, recorded host/incarnation/generation; placement rejects unavailable lineage | Transfer manifests and transport | [04](04-workspace-and-git.md) |
| Same-Task distributed work | Node identities remain location-independent; completion requires integrated result | Remote result transport and authoritative integration | [03](03-runtime-and-execution.md), [04](04-workspace-and-git.md) |
| Multiple backend workers | Database claim/receipt guards plus fenced/reconciled side-effect operations | Replicated backend service | [06](06-state-and-formal-data.md) |
| Runner restart and late dispatch | Supervised process identity, durable start intent, connection incarnation and replay guards | Broader reconnect automation | [03](03-runtime-and-execution.md) |
| Rolling upgrades | Explicit command/event versions; compatibility negotiation before dispatch | Mixed-version rollout policy | [05](05-tool-protocol.md) |
| Parallel Git results | Serialized integration, revision-attributed evidence, final validation when required | Worktrees and distributed result integration | [04](04-workspace-and-git.md) |
| Multiple repositories | Workspace/delivery collections and per-item durable progress | Multi-item preparation/merge and partial-delivery UI | [04](04-workspace-and-git.md), [06](06-state-and-formal-data.md) |
| Artifact/log location | Managed immutable content and acknowledged log cursors; no bare local-path artifacts | Object storage and larger retention tiers | [06](06-state-and-formal-data.md) |
| Concurrent Tasks in one repository | Private Task workspace/PR lineage; provider checks on moving target | Greater execution concurrency | [04](04-workspace-and-git.md) |

## Failure scenarios to exercise before broad implementation

| Scenario | Architectural result to verify |
| --- | --- |
| A dispatch is accepted, Runner starts a process, acknowledgement is lost | Reconcile that process by stable dispatch identity; no duplicate spawn |
| Cancel races with a delayed Start on a reconnecting Runner | Revoked authorization denies the old Start; an already-authorized in-flight start is reconciled/terminated before capacity is released |
| A daemon reconnects while an old control connection is still alive | Old daemon channel is fenced; runtime process ownership is reconciled rather than blindly replaced |
| Two workers claim the same workspace integration after a lease timeout | Local worker ownership and operation journal prevent simultaneous mutation; timeout alone does not authorize takeover |
| A Node runs on Runner A and fallback exists only on B | Unsupported locality transition is rejected; private edits are not lost by cloning elsewhere |
| The backend filesystem differs from the Runner filesystem | Workspace/diff/artifact reads go through owning services; no accidental local file access |
| Backend receives duplicate/reordered Runtime events | Deduplicate by stream sequence; stale events do not revive terminal work |
| Backend upgrades while a completion operation is unfinished | Recover using the operation's schema version, or migrate explicitly; do not reinterpret it |
| A passes tests, B subsequently integrates nonconflicting code | A's evidence remains tied to its tested revision; final combined result is not falsely marked verified |
| Cancellation arrives after Git integration started but before formal commit | Reconcile side effects without granting current completion evidence or unlocking downstream work |
| Local worktrees are cleaned after delivery | Published managed Artifacts remain retrievable independently of those paths |

Use deterministic fault-injection tests for the control races, isolated process tests for supervision, and a real CLI/GitHub test run for Adapter/provider assumptions. The multi-Runner identities used in boundary tests can be fakes in Stage A; production transfer/failover requires separate acceptance evidence later.

## Decisions that cannot remain implicit

The selected stack and transports are defined in [Technology & Deployment](11-technology-and-deployment.md). Before broad implementation, probe native Linux process supervision and workspace access with the first Owner-installed Runtime Adapter. Verify PostgreSQL claim/transaction behavior, how the Runner journal and Git results survive supported restart, and how the GitHub adapter enforces expected-head merge. Exercise HTTPS/WSS transport and generated JSON Schema contracts in a separate-process test.

Runtime-native sandbox behavior, dynamic workspace exposure, session resume, provider check semantics, and process-tree termination must be established by observation/documentation for the chosen implementation. They are not guaranteed by naming an Adapter interface.

Do not expand scope to automatic cross-Runner failover, distributed transactions, microservices, or external workspace storage in Stage A. Preserve their boundaries now; implement them only with the corresponding recovery guarantees. Permanent Runner-disk loss remains explicitly outside V1.
