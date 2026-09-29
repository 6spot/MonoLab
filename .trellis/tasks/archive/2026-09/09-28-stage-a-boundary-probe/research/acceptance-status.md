# Boundary probe acceptance status

> Product terminology and command/path examples were normalized to `monos` on
> 2026-09-29. Exact historical names and observations remain in the original Git
> revisions and unchanged raw JSON attachments; this edit is not a new test run.

Accepted on 2026-09-29 for the tested Linux/OpenCode boundary. **AC1–AC10 pass**
with the evidence levels and limits below. This closes Runtime feasibility,
not production Runtime integration or the complete Stage A/V1 product.

Tested source: `5b940b049d4591b780b191e8f1de29777149b0d9`. See the
[current host report](runtime-resume-07.md), [sanitized evidence](runtime-resume-07-evidence.json)
and [historical failures and repairs](host-validation.md). Raw evidence remains
root-private at `/root/monos-probe-evidence-runtime-resume-07` on `100.120.14.84`.

## Verification

| Check | Result | Evidence level |
| --- | --- | --- |
| Lint, backend/Web typecheck, protocol drift, root build | Pass | Local source before deployment |
| Vitest | 78 pass; 72 DB cases skipped locally | DB cases run separately |
| Linux database entrypoint | 74 pass (72 DB + 2 pure) | Real PostgreSQL |
| Python probe regressions | 31 pass | Deterministic harness fault/verification tests |
| Linux Go race tests, vet and four binary builds | Pass | Linux build environment; Go 1.27.1 |
| Real Node and Planner | 24 checks each pass | Installed OpenCode, native tools, systemd and two accounts |
| Two live same-UID Nodes across backend/Runner restart | 24 checks each pass; exact identities retained | Real concurrent host processes |
| Delayed revoke, permissions, expired receipt recovery | Pass | Host; delayed revoke launches no model |
| Authorized whole-host reboot | 10 checks pass | Changed boot identity, old writers absent, no replacement |
| Final shared-host/ownership audit | Pass | 16 Attempts; zero unreleased, non-absent or mutation-enabled claims |

No source code changed after those build/test checks; this final update records
acceptance evidence and documentation. Earlier test totals describe their own
source snapshots and are retained in the historical report.

## Acceptance matrix

| Criterion | Reviewed evidence | Result and limits |
| --- | --- | --- |
| AC1 transport/schema | Real WSS/HTTPS dispatch, workspace/handoff admission and scoped recovery across disjoint backend/Runner roots; generated fixtures, unauthorized/version rejection and PostgreSQL tests | Pass |
| AC2 real CLI/Planner | `longcat-node-07`, `longcat-planner-07`: native bash invokes bundled CLI, 160,000-character input-file payload, structured results; Planner snapshot read and write/chmod/rename denial | Pass for pinned noninteractive `--auto` policy. Permission behavior is source-reviewed; no interactive prompt occurred. No newly forced real permission-prompt test is claimed |
| AC3 workspace/accounts | Lazy worktree/common directory, exact native/finalized Git tree; seven permission checks; real Planner snapshot/scratch checks | Pass under the non-hostile-Agent model; ordinary access available to `me` remains |
| AC4 attribution | `longcat-pair-07`: two UID-1000 Attempts, forged peer/environment hints retain caller scope; out-of-cgroup denial; birth/PID-reuse/ambiguity tests and changed real boot | Pass; PID reuse and ambiguous identities are injected tests |
| AC5 whole-tree stop | Three fresh Node completions stop setsid/double-fork writers before release; pair restart and reboot preserve physical ownership | Pass; no old Attempt units/cgroups/processes remain |
| AC6 immutable retry | Changed-input retry, content conflict, >160k retained envelopes and matching digests; journal failure and admission crash-window tests | Pass; faults injected, not physical disk exhaustion |
| AC7 dispatch/restart | Duplicate/lost-ack/channel tests; `longcat-delayed-07`; live pair identity retention; `longcat-reboot-08` preserves identity and blocks interrupted work before verified release | Pass; Runner manually started after boot, preserving its prior disabled enablement |
| AC8 completion recovery | Four fresh handoffs stop their callers; expired-grant recovery for fresh Node/Planner and historical MiMo `node-03` returns existing receipts | Pass; no renewed Agent mutation authority |
| AC9 evidence/recommendation | Source/install hashes, fresh free-model catalog, six LongCat launches: four normal completions, one expired reboot window, one successful reboot recovery | Pass; deterministic driver compatibility, not autonomous planning reliability; pre-handoff output observed, token streaming unproven |
| AC10 separate gates | PostgreSQL multi-worker claim/transaction and GitHub expected-head/check/merge/uncertain-effect gates remain separately owned; their leaf reports were archived during Runtime deferral | Pass for scope separation; their parent acceptance and full Stage A/V1 are not established by this probe |

## Recommendation

Use installed OpenCode 1.18.30 with explicitly selected
`opencode/longcat-2.5-preview-free` as the first integration baseline on this tested
host profile. Refresh and validate active status, tool calling and every zero-price
field inside each exact Attempt environment. Keep historical MiMo dispatch decoding,
but never launch it as an automatic fallback. Prior provider TLS/rate-limit failures
remain failures; provider availability is an external dependency.

Continue production integration in the existing Runtime-integration task. It must
own production service enablement, product-driven execution and semantic behavior;
this probe supplies no power-loss, native-session-resume, cross-Runner failover or
hostile-process containment guarantee.
