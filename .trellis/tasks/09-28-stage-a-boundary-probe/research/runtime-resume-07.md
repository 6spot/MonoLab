# Runtime acceptance resumption — 2026-09-29

The Owner resumed deferred Runtime work, selected LongCat, required sequential
main-session execution and explicitly authorized an immediate whole-host reboot,
including temporary Chronicle/SSH interruption. No sub-agents were used.

## Tested installation

| Item | Observed value |
| --- | --- |
| Source revision | `5b940b049d4591b780b191e8f1de29777149b0d9` |
| Probe source fingerprint | `034c4eab0a437f7f14e4e09b6089032b6d7721c9c4caa5e7be6fedf1cca4d4be` |
| Host | Debian 13.6, x86_64, kernel `6.12.107+deb13-amd64` |
| systemd | `257.13-1~deb13u1`, cgroup v2 |
| Runtime | Owner-installed OpenCode `1.18.30`, `/home/linuxbrew/.linuxbrew/bin/opencode` |
| Model | `opencode/longcat-2.5-preview-free`, active, native tool calls, zero input/output/cache-read/cache-write prices |
| Build toolchains | Go `1.27.1` linux/amd64 with CGO; container Node `24.21.0`; pnpm `12.6.0` |
| Server image | `sha256:f21099e7fa8d576bbc69fb70b20836edf3b5ccd8499f70005d7c5fc6799d64fc` |
| Go build/test image | `sha256:69a7b9788769bec032d238959b61854e9ae87f57be9029ec04e9885fabf99195` |
| Agent identity | Existing `me`, UID 1000; separate service identity owns Runner journal/control credentials |

The Adapter runs `opencode run --pure --auto --format json --model <selected-model>
--agent monolab-probe --dir <scratch>`, with prompt on stdin and explicit per-Attempt
XDG paths. Its bounded catalog refresh uses the same environment/cwd. Required shell
tools are permitted; Planner snapshot immutability is enforced by Linux ownership.
The pinned CLI auto-handles asks and honors explicit denies; Runner recognizes its
documented permission-warning text as attention. No successful trial waited for
approval. This session did not force an additional real prompt failure.

Deployment began only after verifying all old claims released. Three historical
failed task units had zero PIDs and absent cgroups; their failed status was reset
after inspection. `before-update/` retains prior binaries/driver, image identity,
PostgreSQL dump and SQLite backup. Only task binaries/services were updated. Probe
migrations through 9 were applied without resetting canonical data. Installed binary
hashes are in the [sanitized evidence](runtime-resume-07-evidence.json).

## Actual trials

Commands were run from `/root/monolab-boundary-probe-src` with
`python3 -u infra/probe/probe.py --evidence /root/monolab-probe-evidence-runtime-resume-07`:

| Suffix | Observed outcome |
| --- | --- |
| `trial longcat-node-07 --kind node` | 24/24 checks; native commit equals finalized Git tree, 160k completion, descendants stopped, Node COMPLETED / Task REVIEW |
| `permissions longcat-node-07` | 7/7 checks; cache readable/not writable, private journal/credentials, service result readable, out-of-cgroup caller denied |
| `trial longcat-planner-07 --kind planner` | 24/24 checks; snapshot read succeeds, shell write/chmod/root rename denied, scratch write and 160k reply succeed; Stop releases caller |
| `restart-pair longcat-pair-07` | Two UID-1000 Nodes retain exact PID/birth/boot/cgroup across Runner/backend restart, then complete 24/24 checks each; forged peer hints stay in original scope |
| `delayed-revoke longcat-delayed-07` | 5/5 checks; revoked before delivery, no Runtime launch, tombstone and physical Stop/release |
| `recover longcat-node-07 --require-expired` | Original committed handoff readable |
| `recover longcat-planner-07 --require-expired` | Original committed handoff readable |
| `recover node-03 --require-expired` | Historical MiMo result readable without a MiMo launch |
| `reboot-hold longcat-reboot-07` | Ready checkpoint; 300-second hold expired before separate reboot command. Live guard refused reboot; explicit revoke/Stop safely released it |
| `reboot-hold longcat-reboot-08` then guarded `systemctl reboot` | Fresh ready checkpoint and intent saved; identity/hold rechecked and reboot issued in the same remote command |
| `reboot-verify longcat-reboot-08` | 10/10 checks after service recovery and explicit Runner start |

Six real LongCat launches: **four uninterrupted normal completions (three Node,
one Planner), one expired-window interruption and one intentional reboot
interruption**. The latter two are not normal completion trials. The expired-window
report's `pass` describes cleanup only. Delayed revoke/recovery add no model launches.

Fresh Node/Planner final evidence was written approximately 19.76/16.15 seconds
after admission acknowledgement (driver report writes: 16.55/14.52 seconds).
These include execution/polling overhead, not pure model latency. The pair recorded
normalized output before handoff. Token streaming and autonomous planning quality
are unproven: OpenCode invokes a deterministic driver through its real native bash
tool, and that driver exercises formal protocol calls.

## Whole-host recovery

Old boot: `d93d5044-c1ea-4a29-9ec9-945ffbe3ab09`.
New boot: `634f5290-1a55-4c0d-8f9c-71985e728562`.

The retained Attempt preserves its original dispatch/PID/birth/boot/cgroup.
Main and detached/double-fork writers are absent; Stop succeeded with
`writer_absent=true`, then ownership released. Interrupted Node/Task are BLOCKED.
Both immutable envelopes and the workspace receipt survived. Unsent `probe-handoff`
remains unknown, existing workspace result is readable through scoped recovery,
and no replacement Start occurred. Verification did not replay the request,
release the hold or launch a successor.

PostgreSQL/backend returned through existing container restart policies; verified
TLS health reports database ready. Runner was disabled at boot before the test;
`systemctl start monolab-probe-runner.service` was run after boot. Enablement remains
disabled. This proves recovery after daemon startup, not unattended Runner boot
enablement or sudden power-loss durability.

All previously healthy Chronicle/PostgreSQL containers recovered healthy with the
same images/policies. Intentionally exited init containers remain exited. The
Chronicle worker already restarting at baseline (3,837 restarts) remains a separate
preexisting issue; no unrelated repair was attempted.

The first one-off `host-after-reboot.json` audit falsely required historical cgroup
population data for PID-zero records that never acquired a cgroup. That failed audit
is retained. `final-host-audit.json` checks their absent/revoked records and changed
boot, independently scans `/proc`, systemd units and cgroup directories, and passes:
16 canonical Attempts, zero unreleased/non-absent/mutation-enabled claims, no Attempt
units/cgroups/processes. Reusable `reboot-verify` passed on its first run.

## Retention and reproduction

Raw evidence root: `/root/monolab-probe-evidence-runtime-resume-07`, mode 0700.
Checked-in sanitized JSON includes checks, identities, immutable-request digests,
installed hashes and SHA256 of original JSON evidence. Preboot profile and pair
files retain their then-current `reboot: not_run` fields; the later reboot report
supplies separate completion evidence. Nothing is relabeled.

Use fresh Attempt IDs and a fresh private evidence directory for reproduction;
existing evidence is immutable. `infra/probe/README.md` documents setup, catalog,
trial, restart, reboot and cleanup commands. Recheck selected zero-cost catalog
before new model invocation. For reboot, obtain host-wide authorization, ensure
independent reconnection works, and persist/revalidate the live checkpoint immediately
before interruption; a delayed conversational turn can outlive the bounded hold.

Preserve journals, receipts, manifests, backups and workspaces. Cleanup requires
canonical inspection plus successful physical Stop for unresolved Attempts;
elapsed deadlines never authorize release or relaunch. No teardown or remote Git
publication is needed. The temporary task-scoped SSH reconnection key was removed from the host after
verification; both local temporary key files were deleted, with all other remote
authorized-key bytes preserved. `ssh-key-cleanup.json` records completion.

Historical CHDIR/catalog/finalization defects, provider TLS/rate limits and revoked
trials remain in [host-validation.md](host-validation.md). PostgreSQL multi-worker
and GitHub expected-head/check/merge tests belong to their own gate reports, whose
leaves were completed during Runtime deferral. This report does not accept those
parents or the complete Stage A/V1 product.
