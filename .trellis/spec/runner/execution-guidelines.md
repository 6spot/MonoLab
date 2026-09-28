# Native Execution, Attribution and Recovery

Sources: [Runtime](../../../docs/03-runtime-and-execution.md), [Tool Protocol](../../../docs/05-tool-protocol.md), [host identities](../../../docs/11-technology-and-deployment.md).

## 1. Scope / Trigger

Go daemon, native Adapter, process launcher, bundled command CLI and local SQLite journal. Implementations live in `runner/cmd/monolab-runner`, `runner/cmd/monolab` and `runner/internal`.

## 2. Signatures

Dispatch carries stable Attempt/dispatch ID, owner/fencing, selected target, Runner connection incarnation and versioned context references. Normalized events carry Attempt/stream/sequence. CLI local-channel operations bind the kernel peer to supervised dispatch ownership.

Generate transport types from protocol schemas. Current entrypoints:

- `monolab-runner --config /etc/monolab-probe/runner.json`: endpoint, CA path, private token path, Runner ID, SQLite path, socket path and execution UID.
- `monolab <command> --input <file|-> --request-id <id> --output json`; `retry` and `command-status` take the existing ID and no replacement input.
- The service account invokes only `/usr/local/libexec/monolab-probe-launch` with no argv. Bounded JSON stdin selects a fixed action and validated dispatch/operation; it cannot choose executable, UID or arbitrary systemd properties. See [helper](../../../runner/internal/host/helper.go) and [bootstrap](../../../infra/runner/bootstrap.sh).
- [Socket attribution](../../../runner/internal/local/socket.go), [Linux process identity](../../../runner/internal/host/process_linux.go), [journal](../../../runner/internal/journal/journal.go) and [control reconciliation](../../../runner/internal/daemon/daemon.go) own the corresponding boundaries.

## 3. Contracts

- Use resolved executables and structured argument arrays with explicit environment/cwd. Prefer Go standard library; choose unavoidable WSS/SQLite/schema dependencies deliberately.
- Runner initiates authenticated WSS; it has no direct product DB access.
- Persist start intent before spawn, discover ownership across the spawn/ack crash window, and tombstone cancelled dispatches.
- Two identities: service account owns credentials/journal/cache; execution account owns Agent processes/workspaces and Owner-managed CLI logins.
- A narrow privileged launcher/systemd policy starts fixed execution-account processes in owned cgroups. No arbitrary root shell surface.
- CLI socket identity uses kernel peer credentials, process birth/boot identity and cgroup membership. UID or caller-supplied scope alone is insufficient.
- Persist immutable request envelopes outside the Agent tree before HTTPS send; no bearer credential in journal.
- Freeze/stop entire trees before workspace handoff; terminal DB state does not prove absence.
- Heartbeat loss is connectivity, not failure. Offline computation may continue; unaccepted formal mutations cannot be replayed automatically.
- Planner repository access remains read-only while CLI/socket/HTTPS and reserved scratch are usable.
- Native shell and Node workspace writes are allowed under the execution account. Do not add shell-command allowlists, global read-only mounts or PID namespaces to the baseline. Reserve paths for workspace placement, not hostile-code containment.
- Enforce Planner snapshot immutability through service-owned snapshot files/parents and execution-readable modes; an edit-tool denial alone is insufficient. Ordinary bash/external-directory access remains enabled.
- No runtime install/login automation. Verify the actual execution account and existing CLI configuration.
- Inventory reconciliation consumes all bounded snapshot pages before readiness. A changed snapshot restarts the read; incomplete, conflicting or over-limit inventory preserves ownership and cannot enable dispatch. See [inventory tests](../../../runner/internal/control/inventory_test.go).
- Missing launch evidence or mismatched process birth is uncertainty, not proof of absence. Persist the process-absence event before releasing local ownership so a daemon crash cannot strand the backend claim.
- OpenCode model preflight must use the exact Attempt environment and scratch cwd returned by the Adapter, including all XDG paths. For the pinned free-model probe, run `opencode models opencode --pure --refresh --verbose` before `run`, with a 30-second deadline and 4 MiB stdout limit. A fresh XDG cache can otherwise select OpenCode's stale bundled catalog while the Owner's default cache advertises a newer model.
- Validate the exact selected provider/model entry, active status, native tool-call support and explicit zero input/output/cache-read/cache-write prices, including any pricing tiers. Missing, malformed or nonzero pricing fails closed. OpenCode 1.18.30 can print refresh success after a fetch failure: neither exit zero nor that message substitutes for validating the resulting entry. Never select a fallback or copy Owner credentials to satisfy preflight.

## 4. Validation & Error Matrix

| Condition | Result |
| --- | --- |
| Duplicate dispatch | Reconcile same process/result |
| Cancelled delayed Start | Reject using authorization/tombstone |
| Ambiguous process ownership | Hold reservation, show recovery |
| Old connection incarnation | Reject control channel, reconcile processes |
| UID matches but dispatch does not | Deny CLI attribution |
| Journal failure | No request send; preserve recovery attention |
| Host reboot | New boot identity; reconcile old operation truth |
| Capacity full | Queue, no fallback |
| Native CLI requests approval | Objective attention, not silence-based inference |
| Planner shell writes to returned snapshot | OS ownership denies the write; snapshot tree remains unchanged |
| Node shell writes/builds in workspace | Works under the normal execution identity without a command allowlist |
| Selected model missing from Attempt catalog, invalid pricing, refresh failure/timeout or oversized catalog | Sanitized preflight failure; no model invocation |

## 5. Good / Base / Bad Cases

Good: lost start acknowledgement reconnects to the same supervised process.
Base: one Attempt launches with scoped paths and current context.
Bad: kill one PID, release its slot and start a successor while descendants write.

Model preflight: a refreshed, active, tool-capable zero-price entry permits the selected model; an already populated valid cache follows the same validation; a successful catalog command with no selected entry must not launch it.

## 6. Tests Required

Real Linux cgroups/systemd tests: escaped/background descendants, freeze/kill, daemon restart, host reboot, birth identity and two concurrent same-UID Attempts. Probe read-only Planner commands, input files, worktree common-directory grants and completion-triggered CLI termination. Test local journal/spool write failure and receipt recovery after expiry.

Verify shell-based snapshot write/chmod/root-replacement attempts fail while Node workspace writes, Planner scratch writes and socket/HTTPS commands succeed. Do not require a whole-host read-only view or same-UID hostile-process containment to pass this baseline.

[Adapter catalog tests](../../../runner/internal/adapter/catalog_test.go) must verify exact env/cwd parity, bounded output, absent/duplicate model rejection, malformed/missing/nonzero pricing and no model execution after preflight failure. Real CLI trials must include fresh Attempt caches; a smoke run with the Owner's existing cache does not establish Adapter compatibility.

## 7. Wrong vs Correct

Wrong: map socket callers to Attempt using an environment variable.
Correct: verify kernel peer/birth/cgroup against the daemon's durable dispatch record before each journal/credential operation.

Wrong: check model availability in the Owner's default XDG cache, then launch in a fresh Attempt cache.
Correct: refresh and validate the model in the same environment/cwd used by the actual invocation; retain Runtime errors separately from catalog diagnostics.

## Installation discovery

The constrained helper additionally accepts `{action:"discover",attempt_id:""}`
with no dispatch/operation. `discovery.go` executes fixed OpenCode `--version` as
`me` (non-root UID/GID), explicit home/PATH and no inherited service environment.
Output is limited to 4096 bytes and a parsed semver; deadline is 10 seconds with
process-group cancellation. Discovery on reconnect reports objective installation
facts in optional `ready.runtimes`. Missing older-client reports retain history;
they cannot mark it current for a new incarnation. A detected version establishes
neither coding-CLI login nor real tool/Stop acceptance. See the backend
[infrastructure contract](../backend/infrastructure-configuration.md).
