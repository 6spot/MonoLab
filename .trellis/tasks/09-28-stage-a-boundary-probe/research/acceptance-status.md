# Boundary probe acceptance status

Updated after resume-05/06 model-independent verification. Overall: **in progress**.
Implementation and deterministic checks exist; outstanding real CLI and reboot
criteria prevent full acceptance. No paid model or substitute Runtime was used.

## Executed checks

| Check | Actual result | Limit |
| --- | --- | --- |
| `pnpm lint`, `pnpm typecheck`, `pnpm build` | Pass | Local source |
| `pnpm test` | 45 pass; 16 database tests intentionally skipped | Database tested separately below |
| `pnpm protocol:check` | Pass, generated outputs current | Schema generation |
| `node --test infra/compose/test-prepare.mjs` | Pass | Strict TLS chain, hostname, permissions and no-overwrite behavior |
| Compose test profile | 16 real PostgreSQL tests pass | Probe admission/recovery suite, not full multi-worker gate |
| Linux `go test -race ./...`, `go vet ./...` | Pass (Go test cache reused) | Native Linux build environment; not all real systemd scenarios |
| Python probe regressions | 31 pass locally and on Linux | Includes interruption evidence and idle-restart guards |
| `delayed-revoke never-started-05` | Pass on host | No Runtime/model invocation |
| Completed-Attempt service restart | Nine checks pass on host | Retained completion, not live concurrent execution |
| `idle-restart node-03` | Reusable command passes on host | Same completed-result boundary |

Compared 78 local and staged source files (Runner, backend, tests, protocol,
domain/database and probe). Only the newly changed two probe Python files
differed before their reviewed deployment. Existing product source matched.
The harness update preserves old files and records hashes in private host evidence.

## Acceptance matrix

| Criterion | Evidence already established | Remaining |
| --- | --- | --- |
| AC1 transport/schema | Real Node tool admission; WSS/HTTPS and scoped recovery; generated fixtures and rejection tests | Final consolidated acceptance alongside remaining CLI trials |
| AC2 real CLI/Planner | Node driver used bundled CLI, long input and structured commands | Successful real Planner; provider failures preserved |
| AC3 workspace/accounts | Node lazy worktree/common directory, exact recovered Git tree; seven host permission checks pass | Real Planner snapshot write/chmod/rename denial |
| AC4 attribution | Same-UID out-of-cgroup denial on host; kernel peer, forged hints, birth/boot tests | Two concurrent real Attempts with peer spoofing |
| AC5 tree stop | node-03 descendants absent after recovery; revoked node-04/planner-02 Stop and release pass | Uninterrupted completion with repaired Stop; live restart case |
| AC6 immutable retry | node-03 changed-file/conflict/160k-payload evidence; journal-write failure and PostgreSQL crash-window tests | Preserve limits: injected faults, not physical disk exhaustion |
| AC7 dispatch/restart | Delayed revoke passes; duplicate/start/reconnect/boot-identity tests; completed-result service restart passes | Live concurrent service restart and agreed whole-host reboot |
| AC8 completion recovery | Original node-03 operation recovered; expired Agent-grant result read passes, including after service restart | Fresh uninterrupted completion after Stop repair |
| AC9 evidence | Failures, build/source hashes, versions and commands in host-validation and harness README | Complete lifecycle results and final recommendation; task changes uncommitted |
| AC10 later gates | PostgreSQL multi-worker and GitHub expected-head/check/merge explicitly separate | Those gates and full Stage A/V1 remain outside this probe |

## Evidence locations

All paths below are on the authorized Linux host, root-private:

- `/root/monolab-probe-evidence-resume-02/node-03.json`: original failed finalization.
- `/root/monolab-probe-evidence-resume-04/`: build/installation, account permissions,
  recovered completion, original Node/Planner failures and catalog profile.
- `/root/monolab-probe-evidence-resume-05/`: provider-limit snapshots, successful
  explicit revocations, delayed-revoke result and completed-result restart snapshots.
- `/root/monolab-probe-evidence-resume-06/`: reproducible idle-restart command and
  reviewed harness deployment records.

The earlier source remains baseline `565f145` plus uncommitted task changes;
do not present the baseline commit alone as the tested implementation revision.

## Next execution order

1. When the selected free provider is usable, use fresh trial IDs for Node and
   Planner; retain all previous failures. Do not overwrite or relabel them.
2. Run `restart-pair` with two real held Attempts; verify live PID/birth/cgroup
   identity, peer-spoofing isolation and completion after both service restarts.
3. Agree the host reboot window, prepare a real held Attempt and run the recorded
   reboot checkpoint/reconciliation recipe. No reboot is authorized merely by SSH.
4. Reconcile acceptance evidence, complete final scope review and commit/archive
   only when the task's required work actually passes.

If the provider remains unavailable, the accurate result is a partial probe with
an external dependency outstanding. Local/fake checks cannot replace these gates.
