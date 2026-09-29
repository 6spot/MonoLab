# Stage A boundary feasibility probe

> Product terminology and command/path examples were normalized to `monos` on
> 2026-09-29. Exact historical names and observations remain in the original Git
> revisions and unchanged raw JSON attachments; this edit is not a new test run.

## Goal

Prove that one Owner-installed and authenticated coding CLI can operate through monos's intended Linux Runner and Tool Protocol boundaries before broad product implementation. Produce repeatable evidence that supports the first Runtime Adapter choice or identifies the precise contract that prevents it from working.

This task implements Stage A step 0, not the complete Stage A product loop.

## Background and confirmed facts

- Architecture/spec baseline: commit `565f145`, pushed to `origin/main` on 2026-09-28. The repository has documentation and Trellis tooling but no product packages or passing product tests yet.
- The selected boundary is a Fastify/TypeScript backend, PostgreSQL canonical control storage, a separate native Go Runner on Linux, and a bundled Go `monos` command client. Runner-local SQLite stores infrastructure recovery data, not domain truth.
- Agents request formal state changes through the Tool Protocol; natural-language replies cannot substitute for admitted commands. Backend and Runner communicate over versioned authenticated transports, with distinct filesystem roots and no Runner database access.
- The host profile uses separate service and execution accounts. CLI installation and authentication belong to the Owner; monos must discover and use the existing installation under the execution account.
- Current development host is macOS. A local build or fake-adapter test cannot establish Linux systemd/cgroup, two-account permissions, or installed-CLI compatibility.
- The Owner supplied Linux test host `100.120.14.84:22`. Preflight confirmed Debian 13.6, systemd 257 and cgroup v2, with Codex 0.157.1 and OpenCode 1.18.30 installed via Linuxbrew. After Codex's configured provider failed TLS handshakes, the Owner explicitly authorized switching to OpenCode with free models. The selected `opencode/mimo-v2.6-flash-free` returned the expected real reply as `me` in 7.15 seconds; its catalog lists zero input/output/cache prices and tool calling. See [host evidence](research/host-preflight.md).
- Use existing `me` (UID 1000) as the execution account, with a separate Runner service identity. The earlier Owner-authorized Codex configuration copy remains private and unchanged, but it is not used by the selected OpenCode probe. Root SSH is an administrative bootstrap path, not an Agent execution identity.
- External dependencies remain limited to concrete probe needs. The accepted frontend baseline remains React/Vite/TypeScript, Tailwind, shadcn/ui and explicitly selected Base UI; frontend scaffolding is outside this task.
- The Owner directed normal CLI shell freedom and requested Multica as the reference. Use native shell and Node writes without a command allowlist or broad filesystem/PID sandbox. Keep service/execution ownership, cgroup process supervision and Tool Protocol attribution; Planner's returned inspection snapshot is service-owned and read-only to the execution account.

## Requirements

| ID | Requirement |
| --- | --- |
| R1 | Exercise a minimal backend, Runner and bundled CLI as separate processes using authenticated HTTPS/WSS and versioned JSON Schema contracts with generated TypeScript/Go types. Runner-owned reads cross the service boundary even when services share a host. Limit the command surface to the contracts needed by this probe. |
| R2 | Run one real installed Runtime without interactive approval stalls. Demonstrate `monos` discovery, help, long-payload submission and structured results from Node and Planner Attempts. Planner repository access remains read-only while native command execution, the local socket and backend HTTPS remain usable. |
| R3 | Demonstrate lazy workspace materialization inside launch-time reserved grants, including isolated worktree Git common directories, without restarting the CLI. Exercise real cross-account repository cache access, execution-owned workspace writes and service-owned result access without exposing delivery/control credentials. |
| R4 | Attribute CLI callers through kernel peer credentials, verified process birth/boot identity and supervised cgroup membership. Neither shared UID nor caller-provided Attempt/path/environment hints grant authority. Supervise and stop the entire descendant tree; retain ownership while process existence or termination is uncertain. |
| R5 | Durably retain the complete immutable request envelope before HTTPS submission. Retry preserves the original identity, schema/version guards and payload. A journal failure prevents send; uncertain admission is reconciled rather than treated as permission to issue another mutation. Recovery storage contains no bearer credentials. |
| R6 | Recover lost start acknowledgements, duplicate or stale dispatch, connection replacement and service/host restart using stable ownership and journal evidence. Admitted completion can freeze/stop the caller independently; Runner retrieves its existing result after old Agent credentials expire without restoring Agent write authority. |
| R7 | Record reproducible commands, versions, host permissions, sanitized evidence and explicit pass/fail/not-run outcomes. Measure actual CLI lifecycle/commit-call reliability and partial-output availability. Failures must identify an Adapter/host incompatibility or recoverable condition; never weaken a contract to label the probe passed. |
| R8 | Use only explicitly selected OpenCode models listed as free/zero-cost for this probe. Do not silently fall back to a paid model or configure paid credentials. Recheck model availability/pricing before real trials; catalog availability alone does not prove tool/permission compatibility. |

## Acceptance Criteria

- [x] **AC1 — Transport and schemas (R1):** A real separate-process run completes authenticated Runner registration/dispatch, an Agent command and a Runner-owned read with disjoint filesystem roots. Shared fixtures validate both generated language representations; incompatible versions and unauthorized scopes are rejected.
- [x] **AC2 — Real CLI and Planner access (R2):** The selected installed/authenticated CLI invokes bundled `monos`, submits a payload beyond convenient inline argument size and receives structured results. A Planner can use its socket and HTTPS command path while attempted repository writes fail. An unexpected interactive permission request produces an observable failure/attention result rather than an indefinite silent wait.
- [x] **AC3 — Lazy workspace and account permissions (R3):** A running Attempt accesses a subsequently materialized reserved workspace and a worktree's Git common directory. The execution account can clone/read the service cache through permitted Git transport but cannot write the cache, service journal or control secrets; service finalization can read the execution-owned result. Record residual access under the non-hostile-Agent threat model.
- [x] **AC4 — Caller attribution (R4):** Two concurrent Attempts under the same execution UID cannot select each other's scope using forged or missing hints. Ambiguous, revoked and mismatched process attribution is denied; PID reuse and a changed boot identity cannot revive old ownership.
- [x] **AC5 — Whole-tree stop (R4):** Stop/freeze covers background and escaped descendants. Workspace reuse and slot release remain disallowed until old writer absence/isolation is established, including after Runner restart.
- [x] **AC6 — Immutable retry (R5):** After an uncertain submission, changing the original input file does not change `retry --request-id` content. Reusing that ID with different content fails deterministically. Injected journal-write failure causes zero sends; crashes around backend admission reconcile to one existing receipt/effect.
- [x] **AC7 — Dispatch and restart recovery (R6):** Losing the start acknowledgement and replaying dispatch does not spawn a second process. Reconnect fences the old channel; a revoked delayed Start is denied. Backend restart, Runner restart and a controlled Linux host reboot reconcile retained records before replacement execution; an unresolved process state holds its claim.
- [x] **AC8 — Completion recovery (R6):** An admitted completion stops its invoking process tree, survives loss of its response and remains queryable by scoped Runner recovery after the Agent credential expires. Replaying the completed request returns its existing result; recovery does not enable a fresh Agent mutation.
- [x] **AC9 — Evidence and recommendation (R7, R8):** A checked-in report records the source revision, OS/kernel/systemd profile, toolchain/Runtime/model versions, zero-cost catalog evidence, execution permissions, invocation mode, observed lifecycle/commit-call successes and failures, streaming capability and each AC result. Include reproduction and cleanup instructions without secrets. Fake-only results cannot satisfy real-host criteria; a failed compatibility result explicitly blocks use of that Adapter until resolved or the architecture is deliberately revised.
- [x] **AC10 — Separate gates (R7):** The report names PostgreSQL multi-worker transaction/claim tests and authorized GitHub expected-head/check/merge verification as separately owned pre-broad-implementation gates. This task's result does not claim either gate or the complete Stage A/V1 loop has passed.

## Out of scope and sequencing

- No frontend, complete Task/Plan scheduler, conversation/review flow, production onboarding or full GitHub delivery implementation. Implement only the minimal persistence and protocol surface required for the probe, preserving the existing domain boundaries.
- No second real Runtime, cross-Runner failover/workspace transfer, permanent disk-loss recovery, mandatory native session resume, live steering or hostile-code containment claim.
- No automatic CLI installation/login or remote repository publication. Any later GitHub write/merge test requires an explicitly authorized test repository and effects.
- Full PostgreSQL multi-worker claim checks and GitHub provider feasibility remain prerequisites before broad product implementation, even though their complete matrices are separate from this task. Public deployment also requires the accepted Owner authentication and TLS setup.
- Follow-up development begins from observed probe results. [Implementation work packages](implement.md) assign backend/protocol, Runner and integrated-evidence responsibility with explicit dependencies. Implementation and main-session review are complete; [acceptance status](research/acceptance-status.md) consolidates the current evidence and limits.

## Operational constraint

Service restarts remain limited to task-owned units. The Owner explicitly approved
an immediate whole-host reboot including Chronicle/SSH interruption. That reboot
and recovery passed on 2026-09-29; prior healthy shared-host services recovered.
Future reboot trials still require applicable host-wide authorization.

## Completion status

AC1–AC10 were reviewed and accepted against source `5b940b0`; see
[acceptance status](research/acceptance-status.md) and [resumption report](research/runtime-resume-07.md).
The Owner-selected `opencode/longcat-2.5-preview-free` replaced MiMo for new trials
following renewed zero-price/tool-capability checks in the exact Attempt environment.
Historical MiMo dispatches remain decodable and their receipts remain readable.
Four fresh normal completions, live concurrent service restart and authorized host
reboot close the previously outstanding evidence. Runner startup after reboot was
manual; semantic planning quality and production Runtime integration remain outside
this probe. Earlier failures and their recoveries remain preserved.

## Source contracts

- [Architecture](../../../ARCHITECTURE.md) and [invariants](../../../docs/08-principles-and-non-goals.md).
- [Stage A step 0 and acceptance gates](../../../docs/09-first-executable-slice.md).
- [Architecture readiness and CLI recovery gate](../../../docs/10-architecture-readiness.md).
- [Runtime and execution](../../../docs/03-runtime-and-execution.md), [workspace and Git](../../../docs/04-workspace-and-git.md), [Tool Protocol](../../../docs/05-tool-protocol.md) and [formal state](../../../docs/06-state-and-formal-data.md).
- [Technology, dependency policy and host identities](../../../docs/11-technology-and-deployment.md).
- [Engineering spec index](../../spec/index.md).
