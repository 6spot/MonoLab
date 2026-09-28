# Native Execution, Attribution and Recovery

Sources: [Runtime](../../../docs/03-runtime-and-execution.md), [Tool Protocol](../../../docs/05-tool-protocol.md), [host identities](../../../docs/11-technology-and-deployment.md).

## 1. Scope / Trigger

Go daemon, native Adapter, process launcher, bundled command CLI and local SQLite journal. Future destinations are `runner/cmd/monolab-runner`, `runner/cmd/monolab` and `runner/internal`.

## 2. Signatures

Dispatch carries stable Attempt/dispatch ID, owner/fencing, selected target, Runner connection incarnation and versioned context references. Normalized events carry Attempt/stream/sequence. CLI local-channel operations bind the kernel peer to supervised dispatch ownership.

Exact Go interfaces are implementation choices; generate transport types from protocol schemas.

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
- No runtime install/login automation. Verify the actual execution account and existing CLI configuration.

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

## 5. Good / Base / Bad Cases

Good: lost start acknowledgement reconnects to the same supervised process.
Base: one Attempt launches with scoped paths and current context.
Bad: kill one PID, release its slot and start a successor while descendants write.

## 6. Tests Required

Real Linux cgroups/systemd tests: escaped/background descendants, freeze/kill, daemon restart, host reboot, birth identity and two concurrent same-UID Attempts. Probe read-only Planner commands, input files, worktree common-directory grants and completion-triggered CLI termination. Test local journal/spool write failure and receipt recovery after expiry.

## 7. Wrong vs Correct

Wrong: map socket callers to Attempt using an environment variable.
Correct: verify kernel peer/birth/cgroup against the daemon's durable dispatch record before each journal/credential operation.
