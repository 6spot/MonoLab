# Boundary probe design

Status: implemented and accepted on 2026-09-29. See [acceptance status](research/acceptance-status.md) for the tested profile and limitations.

## Architecture and scope

Keep this as one integrated probe task with sequential work packages. Its deliverable is an observed compatibility/recovery result, not three independently shipped product subsystems. Write dependencies explicitly in [implement.md](implement.md); keep later PostgreSQL multi-worker and GitHub provider gates separate.

```text
Fastify backend + PostgreSQL (private Compose network)
    ^ HTTPS: Agent commands, scoped recovery reads
    | authenticated WSS initiated by Runner: dispatch/events/RPC
Go Runner (service account; private SQLite journal)
    | constrained privileged launcher + systemd/cgroup v2
    v
OpenCode 1.18.30 / explicit free model (me; Attempt cgroup and scratch)
    | native command tool
bundled monolab (same Attempt cgroup)
    | Unix socket: attributed credential/journal requests
    +--------------------> Runner
```

Backend never opens a Runner path or exposes PostgreSQL to execution processes. Probe fixtures create only the domain/control records needed for a Planner turn, workspace opening and Node completion through existing Tool Protocol semantics. They do not introduce a second domain scheduler or special production lifecycle states.

## Environment and identities

Use the Owner-supplied Debian host described in [host preflight](research/host-preflight.md). Resolve OpenCode directly at `/home/linuxbrew/.linuxbrew/bin/opencode`; set the execution home, PATH and working directory explicitly. Select Owner-approved `opencode/longcat-2.5-preview-free` explicitly, recheck its zero-cost catalog entry for real trials, and never fall back to another model. Retain earlier MiMo schema values solely for historical dispatch decoding/recovery. Do not launch the Agent through an interactive root shell.

| Identity | Responsibility and storage |
| --- | --- |
| root via SSH | One-time reviewed bootstrap of task-owned paths, units and the constrained launcher; never runs the coding Agent |
| Dedicated Runner service account | Daemon, SQLite journal, private enrollment material, repository cache and system Git effect coordination |
| Existing `me` account | Installed CLI/provider context, scratch, workspaces and uncredentialed execution Git |

Use a task-owned prefix such as `/var/lib/monolab-probe` and distinct service-private, execution-owned and execution-readable-cache children. Runtime sockets live under a task-owned `/run` directory. Permission tests must prove that cache readability does not expose sibling journal/credential storage. Scope Git safe-directory exceptions to actual fixture repositories.

The earlier Owner-authorized Codex configuration transfer remains private and intact, as recorded in host evidence. Its provider failed HTTPS handshakes under both root and `me`, so the Owner explicitly authorized selecting OpenCode with a free model instead. The initial OpenCode request succeeded without configuring paid credentials. This selects one working Runtime for the probe; it does not add a second Adapter implementation or automatic runtime fallback.

Use a constrained launcher with fixed execution UID, task-owned executable/unit/path validation and sanitized environment. Each Attempt and each finalization operation has its own systemd-owned cgroup. The execution account cannot select another Attempt's cgroup or launch arbitrary root commands. Validate the concrete delegation mechanism on this host before relying on it.

## Minimal code destinations

| Destination | Probe responsibility |
| --- | --- |
| `packages/protocol` | Versioned JSON Schemas, generated TS/Go types, shared compatibility fixtures |
| `apps/server` | Authenticated transport, minimal command admission/status/recovery and controlled fault hooks |
| `packages/domain`, `packages/db` | Only the existing domain guards and PostgreSQL records needed by admitted probe effects; reviewed migrations |
| `runner/cmd/monolab-runner`, `runner/cmd/monolab` | Daemon and bundled command executable |
| `runner/internal` | Adapter, supervision, socket attribution, journal, transport and fixture workspace effects |
| `infra/compose`, `infra/runner` | Isolated probe deployment and host bootstrap/cleanup configuration |

Frontend work is outside this probe (later separately accepted tasks now own `apps/web`). Prefer standard APIs and the selected stack. Choose one pinned generator path and only required WSS, SQLite, database and schema tooling after checking schema fidelity and transitive cost; tool selection is a bounded scaffolding decision, not an assumed existing package.

## Command and recovery data flow

1. Backend transaction records the current Attempt/fencing/capacity claim and dispatch outbox intent. Runner verifies connection incarnation and authorization, journals start intent, then launches discoverably supervised execution.
2. `monolab` connects to the existing Runner socket. Runner validates peer PID/UID, process birth and boot identity plus cgroup membership against the current dispatch; each journal/credential operation repeats attribution checks.
3. CLI reads input once and validates it. Runner durably stores the canonical envelope and digest outside the Agent tree, including immutable content references and expected versions, before acknowledging permission to send. The record excludes bearer credentials.
4. CLI sends the scoped HTTPS request. Backend authenticates, checks an existing receipt before new-effect guards, and commits receipt/state/operation/outbox atomically. External Git or Runner effects occur after the transaction.
5. On uncertain transport outcome, retain the original request and query its receipt. Explicit authorized retry reloads that envelope; changed input conflicts. Missing receipts do not grant a stale Attempt new authority.
6. Completion admission triggers system-owned tree freeze/finalization. The calling CLI may lose its response. Runner uses its separately authorized, Runner/operation/Attempt-scoped read access to find the admitted result after the Agent credential expires; it cannot issue a new Agent mutation.

Use real PostgreSQL for receipt durability and the limited admission tests in this probe. The complete multi-worker/capacity/integration claim matrix is still a separate pre-broad-implementation gate. Runner SQLite only journals local ownership/effects/requests. Retain schema versions and unresolved records across process and host restart.

## CLI permissions and workspace feasibility

Start with the installed OpenCode noninteractive `run --pure --auto --format json --model <free-model> --agent monolab-probe --dir <scratch>` interface and explicit permission rules. Exact config behavior is checked against release 1.18.30 before creating launch templates. Node runs start with known scratch/reserved workspace paths, including worktree Git common directories; these are placement grants, not restrictions on other execution-account paths. Planner runs receive read-only repository access with permitted scratch, socket and authenticated HTTPS access. Permission prompts must produce a structured failure/attention outcome rather than an unattended wait; verify that shell execution cannot bypass the Planner repository boundary.

Following the Owner's shell-freedom direction and Multica source review, permit normal native bash, external-directory access and Node edits. Do not implement shell-command allowlists, global read-only mounts, private PID namespaces or read-only XDG mounts solely to suppress installed-CLI maintenance. Reserved paths remain deterministic placement, not a host containment boundary. Keep the fixed nonroot execution account, service-private credentials and cgroup supervision.

Planner receives an immutable inspection snapshot created and owned by the service account, including its parent directories. Execution-account filesystem permissions permit reading/traversal but deny shell writes, mode changes and root replacement. An OpenCode edit denial may supplement this role; scratch/socket/HTTPS remain usable. This protects the supplied snapshot and does not claim that a trusted Planner shell cannot access unrelated files otherwise available to `me`. Record actual residual access and tests accurately.

Initialize a small local Git fixture under service ownership; cross-account clones use Git transport with `--no-local`, without hardlinks or shared alternates. Lazy materialization happens inside reserved paths without restarting OpenCode. Finalization runs as `me` in a system operation cgroup outside the frozen Agent tree; service-owned candidate export reads the exact finalized result without publishing it anywhere.

Use multiple bounded real CLI trials to record actual commit/lifecycle invocation outcomes and streaming availability, retaining failed trials in the report. A missing formal call is a failed case, never inferred success from prose. Deterministic fixtures cover race windows, while real-process tests establish host/CLI behavior.

## Transport and compatibility

Use an isolated backend/database deployment with separate filesystem roots. Keep PostgreSQL on the private Compose network, with no host-published database port. Bind the test HTTPS/WSS endpoint to loopback where possible; use a task-owned certificate authority trusted explicitly by both Go clients, never disable TLS verification. Probe credentials and fault controls are restricted to the isolated harness; no public unauthenticated command or fixture endpoint.

Version JSON Schema payloads and negotiate compatibility before dispatch. Test optional versus null fields, bounded integers, unknown fields according to schema, stream sequence deduplication and stale connection incarnations. Stored admitted operations retain their original schema interpretation.

## Failure evidence and operations

Map every PRD acceptance criterion to a reproducible command and evidence file. Cover lost Start acknowledgement, duplicate/revoked dispatch, two same-UID Attempts, process identity ambiguity, journal failure, modified input, admission crash, expired credentials, service restart and host reboot. Fault hooks must be explicit harness controls, unavailable to ordinary Agent commands.

Before deploying, inventory task-owned name/port collisions and prepare cleanup that stops only owned units and containers. Preserve unresolved journals/workspaces and root's source Codex configuration. Never remove existing CLI installations, unrelated services or user files. Remove a copied `me` config on rollback only if this task created it and its content has not subsequently changed.

Host reboot is a whole-machine interruption. Record the reboot checkpoint and recovery procedure first and obtain a specific execution window before running it. Until that evidence exists, mark the reboot criterion not run, not passed. This operational scheduling item does not prevent local implementation or isolated service-restart tests after plan approval.

No remote Git push, PR creation or merge belongs to this task. The final report must distinguish probe outcome, separately owned PostgreSQL multi-worker feasibility, separately owned GitHub expected-head/check feasibility and the unimplemented full Stage A/V1 flow.
