# Boundary probe implementation plan

Status: implementation approved; task started on `feat/stage-a-boundary-probe`. Only checked items below are complete.

Current verification checkpoint: [acceptance status](research/acceptance-status.md)
consolidates the local/Linux/database checks and real-host evidence. Model-independent
delayed-revoke and completed-result service restart pass. Real Planner, uninterrupted
Node completion after the Stop repair, concurrent live restart and agreed host reboot
remain outstanding. The Owner requests main-session-only execution for this session.

## Ownership and dependencies

Use Trellis implement/check agents after `task.py start`, with native context injection preferred. Main session coordinates scope, host access, approvals, task artifacts and final evidence. Workers must be told they share the codebase, own only their assigned files, and must preserve others' changes.

| Work package | Assigned responsibility | Dependency |
| --- | --- | --- |
| A — contract and backend foundation | Implement agent owns `packages/protocol`, minimal `apps/server`, `packages/domain`, `packages/db`, root TypeScript workspace configuration and `infra/compose` | Approved plan; schema/generation decisions documented before dependent transport work |
| B — Runner and CLI | Implement agent owns `runner`, `infra/runner`, supervision/attribution/journal and fixture Git effects | A's schemas, fixtures and authenticated backend boundary are available and reviewed; generation is coordinated through A's single source of truth |
| C — integrated Linux evidence | Main coordinates host operations; implementation agent owns probe harness and sanitized evidence; check agent reviews/tests affected product files | A and B pass their local checks; actual execution account is configured and host bootstrap is approved |

These are ordered work packages within one verifiable probe deliverable. A and B implementers have delivered their initial code; scoped reviewers are fixing findings, and C is beginning real-host validation. Do not parallelize edits to protocol schemas or root toolchain files without explicit ownership handoff.

## Before starting

- [x] Record the Owner-supplied Linux environment and installed Runtime observations without credentials.
- [x] Curate implementation/check manifests with real specs.
- [x] Owner explicitly authorized one-time provider-configuration transfer to `me`; transfer and private file/directory permissions were verified without disclosing credentials.
- [x] Converge PRD/design/implementation documents around the confirmed account arrangement.
- [x] Present the final planning summary and obtain subsequent approval.
- [x] Validate both curated context manifests (initially 13 entries each; now 15 after OpenCode/Multica research).
- [x] After final approval, run `task.py start` before implementation dispatch.

## A — minimal command and protocol foundation

- [x] First run a bounded real-provider check as `me`. Codex provider failed TLS; after explicit Owner authorization, OpenCode `opencode/mimo-v2.6-flash-free` returned the expected reply in 7.15 seconds with exit 0. Recorded catalog cost is zero. This establishes provider usability only, not the complete tool/Runner boundary.
- [x] Read architecture modules and injected backend/protocol specs; select and pin supported Node.js/pnpm, Go and minimal required libraries. Do not replace the test host's global Node installation just to build the probe.
- [x] Establish the pnpm workspace and versioned schemas; generate both TS and Go transport types using one entrypoint. Add shared acceptance/rejection fixtures and a drift check.
- [x] Scaffold Fastify and reviewed PostgreSQL migrations for the necessary claims, command receipts, operations and outbox; keep product fixture setup local and authenticated.
- [x] Implement scoped command admission, immutable-content conflict detection, current-authority checks, status/recovery reads and transactional dispatch. Keep physical effects outside DB transactions.
- [x] Provide authenticated WSS dispatch/events/RPC and HTTPS commands with distinct backend/Runner roots. Persist receipt and dispatch state across backend restart.
- [x] Validate duplicate/reordered events, stale versions/scopes and crash-around-admission behavior against real PostgreSQL. Document that this is not the complete multi-worker feasibility matrix.

## B — Runner, bundled command and real CLI boundary

- [ ] Implement service-private SQLite start/effect/request records and bounded log handling. Inject journal-write failure and ensure no unpersisted command is sent.
- [ ] Implement constrained systemd/cgroup launch, process inventory, birth/boot identity and whole-tree freeze/kill. Hold claims for ambiguous ownership; reject old connection/dispatch authority.
- [ ] Implement the existing Runner's Unix socket credential/journal service with peer-process attribution before each operation; test two concurrent same-UID Attempts and forged hints.
- [ ] Implement bundled `monolab` help, schema validation, stdin/input-file commands, immutable retry and status reads. No credentials in logs, arguments or journal records.
- [ ] Implement the OpenCode 1.18.30 Adapter with an explicitly selected verified-free model, resolved executable and explicit environment; determine supported Planner and Node permission profiles without bypassing required isolation or falling back to paid models.
- [ ] Implement reserved scratch/workspace/worktree-common paths, real cross-account cache clone/read and service-owned finalization/export fixtures; no remote publication.
- [ ] Implement completion admission and recovery independently of the stopped CLI process; verify that expired Agent credentials cannot regain mutation authority.

## C — host preparation and evidence

- [ ] Recheck host versions, available ports/unit/path names, OpenCode executable and free-model catalog availability under `me`. Preserve the earlier authorized Codex configuration copy and other Owner settings.
- [ ] Prepare a concrete bootstrap diff/script limited to task-owned accounts, paths, units, private database storage and the TLS endpoint. Do not expose the Docker socket or database to execution processes.
- [ ] Verify the selected OpenCode free model in the deployed Runner execution context, building on A's initial usability check. Record sanitized errors; never select paid fallback models or configure paid credentials.
- [ ] Run AC1–AC3: generated protocol fixtures, disjoint filesystem roots, Planner socket/HTTPS/read-only repository, Node lazy workspace grants and two-account Git operations.
- [ ] Run AC4–AC6: same-UID spoofing, background/escaped descendants, changed-input retries, journal failure and uncertain admission.
- [ ] Run AC7–AC8: lost start acknowledgement, duplicate/revoked dispatch, stale control channel, independent service restarts, completion stopping its caller and scoped terminal-result reads.
- [ ] Agree the whole-host reboot window, checkpoint unresolved ownership, then run the reboot case and verify post-boot reconciliation before new dispatch. If it cannot be run, retain a not-run result and leave full probe acceptance incomplete.
- [ ] Run repeated bounded real CLI lifecycle/commit scenarios and record attempts, failures and partial-output observations; do not rerun solely to hide earlier failures.
- [ ] Produce AC9–AC10 evidence/recommendation, including command recipes, versions, source commit, sanitized host profile, remaining gates and cleanup/recovery instructions.
- [ ] Dispatch Trellis check with the same curated contracts and host evidence; fix actual issues, rerun affected checks and report any acceptance item still unverified.

## Validation commands to establish

These interfaces now exist in the scaffold. Actual runs and their limits are recorded in work-package research and [Linux validation](research/host-validation.md):

```text
python3 .trellis/scripts/task.py validate .trellis/tasks/09-28-stage-a-boundary-probe
pnpm lint
pnpm typecheck
pnpm test
pnpm protocol:check
cd runner  # run the following from the Go module
go test ./...
go test -race ./...
```

Define the actual Linux harness command and its fixture/real-runtime/reboot modes in the probe README when it exists. Require explicit environment targeting and a reboot opt-in for the destructive interruption case. The report must give exact invoked commands rather than rely on these planned names.

## Risk and rollback points

- Generated schemas are a dependency boundary: review wire changes before parallel implementation; never hand-edit generated consumers.
- Host bootstrap is the main mutation boundary: create only task-owned resources and preserve root's config and unrelated host services. No root Agent execution.
- Privileged launcher must be constrained to fixed execution identity and task-owned units/paths; do not install a broad sudo/polkit grant.
- Stop/reconcile before cleanup or workspace reuse. Preserve unresolved command/effect journals and operation refs on any test failure.
- Credentials remain on the test host; neither SSH passwords nor provider tokens belong in task files, test output or commits.
- Provider, permission or syscall incompatibility is a probe finding. The Owner explicitly authorized the current OpenCode/free-model substitution; do not silently substitute another paid Runtime/model, weaken the boundary or declare fake tests equivalent to real evidence.
