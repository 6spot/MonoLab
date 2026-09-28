# Linux boundary probe evidence

Status: in progress. This records actual trials, including failures; it does not
claim Stage A or V1 completion. See `prd.md` for the acceptance criteria.

## Source and environment

- Baseline commit: `565f145`; implementation branch `feat/stage-a-boundary-probe`.
- The first backend source archive contained 48 files and had SHA256
  `17815a8d1908bd3bad9a179b20acda5ed6f4fa9c28c52625bf95568efb219772`.
  The implementation was uncommitted when staged. Later fixes are recorded below.
- Target: Owner-authorized Debian 13.6 host, kernel 6.12.107+deb13-amd64,
  systemd 257.13, cgroup v2, Docker 29.8.0 / Compose 5.5.1.
- Source: `/root/monolab-boundary-probe-src`, private to root.
- Project: `monolab-boundary-probe`; separate persistent PostgreSQL volume.
  No existing volumes or unrelated services were reset.
- Native execution user remains `me` (UID 1000). Debian's signed `sudo`
  package `1.9.16p2-3+deb13u2` was installed as a launcher prerequisite;
  no general execution-user sudo grant was added.
- Pinned Node 24.21.0, PostgreSQL 17.11 and Go 1.27.1 container manifests
  were pulled successfully. The system Node/toolchain was not replaced.

## Model catalog recheck

At approximately 2026-09-28 11:58 UTC, `opencode models opencode --verbose`
under `me`, from `/home/me`, confirmed `opencode/mimo-v2.6-flash-free`:
active; tool calls supported; input, output, cache read and cache write all 0.
Only those selected metadata fields were retained. No paid credentials or
fallback models were configured.

Two administrative catalog invocations initially exited 1 because `runuser`
inherited root's inaccessible working directory. Repeating with an explicit
execution-readable cwd succeeded. These were catalog failures, not model calls.
The Adapter must always select an accessible working directory.

## Backend and PostgreSQL

Executed from the remote source root:

```sh
node infra/compose/prepare.mjs
docker compose -f infra/compose/compose.yaml build server tests
docker compose -f infra/compose/compose.yaml up -d database server
docker compose -f infra/compose/compose.yaml --profile test run --rm tests
```

The preparation generated task-only credentials and a private localhost CA;
no credential contents were emitted. Image builds succeeded with frozen pnpm
lockfiles. At 11:57 UTC, **15/15 real PostgreSQL tests passed** (2.00 s total,
1.277 s test execution). Tests use isolated random schemas, not the canonical
Runner state. Coverage includes immutable admission/replay, scope guards,
recovery pagination and typed finalization repair. This is not the full
multi-worker claim/integration matrix.

Initial host HTTPS health check failed with connection refused. Docker showed
the server running and its HTTPS listener active, but no published host port
when attached only to an `internal: true` network. The deployment fix is to
attach the server to a separate bridge as well, while retaining the private
database network and loopback-only port publication. After that Compose-only fix, the trusted-CA HTTPS health check succeeded:
`{"schema_version":1,"database":"ready","probe":true}`. Docker reports the
published address as `127.0.0.1:18443`; the database has no published port.
Runner `runner-a` was then enrolled through JSON stdin, capacity 2.
The source archive above predates this Compose fix.

## Runner build checkpoint

The initial Runner/native source archive contained 50 files, SHA256
`fe145c70befd1328e6b4a18e1661018759d8ae169ed4d42cac572d0fa21c2172`.
It was staged for Linux CGO/race/vet/build checks in the pinned Go container.
The reviewed source was restaged as 50 files with SHA256
`7d05f5a1335f8466292332d93b0b22a32f76fb944a44f2c926465cda5bf27927`.
The bootstrap passed its local review; actual host preflight still precedes installation.

The first Linux Go invocation did not reach tests: `proxy.golang.org` timed out.
A subsequent local-cache SSH transfer was interrupted with a broken connection,
and an early build could not find all module files. The transfer was not treated
as complete. After reconnecting, missing fixed-version module archives were
retrieved from `goproxy.cn` into a task-only file proxy; all 15 zip/mod/info files
were compared against SHA256 of the local cache. The build then uses
`GOPROXY=file:///go-proxy`, `go mod verify`, checked-in `go.sum` and a container
with networking disabled. No module version or repository proxy policy changed.

## Pending native evidence

Native Linux CGO/race tests and vet passed across all Runner packages after the
Git fix; all four executables built successfully. This was the pinned Linux
build container, not yet native systemd lifecycle evidence. Runner/helper
installation, real OpenCode Tool Protocol trials, two-account Git/Planner
checks and restart/descendant fault scenarios are the next steps. Local tests are not substituted for
these facts.

Whole-host reboot remains unrun and requires the separately agreed window.
Do not interrupt unrelated workloads without it. Preserve canonical database,
Runner journals and unresolved workspaces for recovery.

## Remaining gates

Full PostgreSQL multi-worker ownership/integration claims, GitHub expected-head
publication/check/merge verification, and the complete Stage A/V1 product flow
remain separate work. This probe does not publish any repository or create PRs.


## ShellCrash proxy verification

The Owner identified the existing host proxy as ShellCrash. Read-only inspection
found `CrashCore` listening on 7890 and Docker daemon HTTP/HTTPS proxy settings
pointing to `http://127.0.0.1:7890`; there were no HTTP/HTTPS/ALL proxy variables
in the noninteractive SSH environment. No subscription, credentials or full
proxy configuration was printed, and no proxy/firewall setting was changed.

Eight curl requests (root/me × explicit proxy/no explicit proxy × Go module
metadata/OpenCode homepage) all returned HTTP 200 and TLS verification result 0,
within 0.95–2.43 seconds. Requests with `--noproxy '*'` may still traverse
ShellCrash's transparent routing; this test does not prove the physical route.

The same pinned Go image on the default Docker bridge failed direct Go access
(timeout) and explicit `host.docker.internal:7890` access (connection refused).
Docker daemon proxy configuration does not automatically configure traffic
inside build/run containers. These are network-context differences, not evidence
that execution user `me` cannot access the proxy. The host-network container with explicit `http://127.0.0.1:7890` proxy returned
HTTP 200 in 3.00 seconds with TLS verification result 0. Build-only network
access can use that already-configured host proxy without changing firewall
settings or the execution identity.

The Owner authorized root as a fallback if execution-account issues persist.
Root already performs deployment/build/admin work. Keep any root diagnostic
runtime trial separate from the two-account permission acceptance results.


## Linux Git compatibility finding

Linux Go/CGO tests reached execution after module verification. All other Runner
packages passed, but the cross-owner finalized-worktree transport test failed.
An initial exact metadata-path `safe.directory` addition did not resolve it.
The reviewer reproduced the cause on the build image's Git 2.39.5: local
transport clone removes `GIT_CONFIG_PARAMETERS` before invoking `upload-pack`,
so parent argv `-c safe.directory=...` settings do not reach the child. The same
pattern can affect service-cache clone as well as result export. The owning
Git wrapper was fixed using a temporary 0600 process-private Git config with
only exact known safe paths, passed through `GIT_CONFIG_GLOBAL` and removed
after the operation. User Git configuration is unchanged; no wildcard trust
is granted. The reviewer reran Linux `go test -race ./internal/host`: passed
in 1.202 s, including both working-tree and metadata-directory transport.
This is a real test failure, not an execution-user network problem.

Before host installation, staging file ownership was normalized to root under
the 0700 source root; local tar owner IDs are not suitable ownership for
administrative scripts. Subsequent copies preserve the protected host ownership.


The first read-only bootstrap preflight encountered a systemd 257 behavior:
`systemctl list-unit-files <unmatched-pattern>` returns 1 with no output. No
installation changes were made. The corrected preflight accepts only that explicit empty-result case while
preserving refusal of real errors or existing unit collisions. The actual
`--check` then passed with exit 0. Installation and `infra/probe/provision.py`
completed successfully; the service was explicitly started afterwards.


## Initial native service startup

`monolab-probe-runner.service` is active/running as `monolab-probe`, primary
shared-read group `monolab-probe-read`. The backend reports `runner-a` connected
and ready with capacity 2 after WSS reconciliation. The source/root-private
credential installation and service-owned fixture succeeded. Fixture commit:
`786e3f10e40a6c51ac795bf9e95ce8f14eff93ac`; tree:
`59865e9d13b9f511ef53460b129077d3f8ffbc31`. The bare fixture has no publication
remote. `profile.json` was created under root-private host evidence storage.
The first actual Node trial `node-01` failed before OpenCode started; details follow.


## First Node trial: startup failure retained

`trial node-01 --kind node` exited 2 and preserved `node-01.json`. Systemd
reported `200/CHDIR`: the requested scratch directory could not be entered.
`namei` showed the parent `/execution/node-01` as root:root 0750, while scratch
was correctly me:monolab-probe-read 2750. The helper requested parent mode 0755
but inherited Runner umask 0027 and did not apply an explicit final mode.
No real model/tool boundary success is claimed for this trial.

The task Runner was stopped while repairing the launcher. The fixed no-argv
helper verified the retained failed transient unit's identity: `known=true`,
`exists=true`, `populated=false`, `pid=0`. Its normal `status`/`stop` path retained
that evidence; no journal/manifest was deleted. The local backend admin recorded
`revoke` and its Stop operation. `node-01-start-failure-recovery.json` retains the
sanitized checkpoint; canonical release awaits normal Runner reconciliation.

## Resumed validation (session 01a0e842-f042-7143-9fc9-4722389897b2)

The requested prior session was recovered and its existing approved task resumed.
Fresh inspection confirmed `node-01` has a successful Stop, physical absence and
released claim; the original failed directory and evidence remain intact.

A rebuild exposed incomplete prior staging: `GitEffect` had its new signature
but the remote command caller was old. The first rebuild failed; its partial
artifact directory was inadvertently installed before the failure was inspected.
The idle task Runner was immediately stopped. No trial was launched with that
mixed build. The entire Runner source and generated Go protocol were restaged,
then native Linux `go test -race ./...`, `go vet ./...` and all four executable
builds succeeded into a new `artifacts/runner-resume-01` directory. Bootstrap
preflight and installation succeeded before the next trial. Future installs must
be gated on the successful final build result and use a fresh artifact directory.

Local backend lint/typecheck/build/schema checks passed (45 unit tests). The
current real PostgreSQL suite was rebuilt and rerun: **16/16 passed**, including
revocation before Start delivery. The backend was rebuilt from the staged source.

Harness review added strict-umask directory setup and exact committed-tree
comparison; three local regressions passed. The previous root-owned driver was
preserved privately and the reviewed driver explicitly installed.

`node-02` now starts under systemd with a root-owned 0755 Attempt parent. OpenCode
exits 1 after about 3.6 seconds, reporting `UnknownError` / `Unexpected server
error` before tool invocation. The trial is **failed**, not a CLI compatibility
success. Runner records started/output/exited, and its Stop succeeds with physical
absence and released claim. Evidence is retained under
`/root/monolab-probe-evidence-resume-01/node-02.json`. Internal Runtime diagnosis
is ongoing; the old CHDIR failure is resolved.

`delayed-revoke never-started-02` passed on the native host with current binaries:
Start was revoked while Runner delivery was stopped, no Runtime started, the
retained tombstone proved absence, and the successful Stop released the claim.
Evidence: `delayed-revoke-never-started-02.json` in the same resume evidence root.

## Fresh-cache diagnosis and resumed build (session 01a0e83f-0b5c-7b20-bd66-fded2aa32842)

Recovered the preceding session and resumed the same approved task. The old
`node-02` is physically absent, its Stop succeeded and its claim is released;
the pre-install snapshot is retained under `/root/monolab-probe-evidence-resume-02`.
An attempted `profile` write to the old evidence root correctly refused to
overwrite `profile.json`; it did not invalidate or replace the old evidence.

An isolated nonroot diagnostic reproduced `Unexpected server error` in 2.21 s.
OpenCode `--print-logs --log-level DEBUG` exposed `ProviderModelNotFoundError`
for the selected `opencode/mimo-v2.6-flash-free`. The default user catalog had
the model, but the Adapter's fresh XDG cache initially used an older bundled
catalog. This failure occurred before a provider call; it is not evidence of
provider overload. Private diagnostics are retained as `diagnostic-custom.*`.

In that exact diagnostic environment, `models opencode --refresh --verbose
--pure` populated the selected active, tool-capable model with zero input,
output, cache-read and cache-write prices. The unchanged custom-agent invocation
then returned `MONOLAB_DIAG_OK`, exit 0, in 6.53 s. Raw diagnostics remain private
as `diagnostic-refreshed.*`; this is a text-only diagnostic, not Tool Protocol
acceptance.

The Adapter now performs a bounded refresh and validates the selected entry in
the actual Attempt environment/cwd before model execution. Refresh exit status
alone is insufficient because OpenCode 1.18.30 swallows catalog-fetch failures.
No model substitution, paid configuration, Owner configuration change or
permission weakening was used.

Runner source archive SHA256:
`b143f39ca973af75b8775e59a232ffe381b78260381a17f0325b55b3ed90d3af`.
All 48 source files were verified after staging. Native Linux `go mod verify`,
`go test -race ./...`, `go vet ./...` and all four builds passed into the fresh
`artifacts/runner-resume-02` directory. `build.json` retains the exact source and
binary hashes and build image identity. The reviewed current harness has 25
passing local and Linux regressions; its archive SHA256 is
`b106542bde9d2dc7bcc93e93ff902921fdbd27c7199f17e4b234f70995a610e9`.

Root cause: an implicit assumption that default-user catalog state applied to
fresh per-Attempt XDG state, plus a missing real fresh-cache integration case.
The earlier CHDIR fix addressed a separate startup defect. Prevention is the
same-context runtime preflight, parser/failure regression tests and the owning
Runner execution spec; default-user smoke tests remain diagnostic evidence only.

## Completion recovery and TLS repair (sessions resume-03 through resume-05)

Recovered session `01a0e87f-be55-7d20-99e8-895c45d38713` and inspected canonical
host state directly. `node-03` invoked the real native driver, opened its lazy
workspace, committed Git and admitted the 160,000-character completion payload.
Its initial finalization failed and remains recorded in
`/root/monolab-probe-evidence-resume-02/node-03.json`. Retrying the same operation
subsequently succeeded; this is recovered completion, not an uninterrupted pass.
The Node is `COMPLETED`, Task `REVIEW`, and physical absence/claim release hold.
Its finalized tree `79d37e70f5ba1a235f1b660ede6636aa65d52c27` exactly matches the
driver's original tree. Completion operation:
`c0e05425-5950-444b-a7b8-fe2baf9621f6`.

The stop fix verifies complete process absence after a systemd control error,
with a bounded two-second reconciliation window; unknown ownership still fails.
The separate test-CA repair supplies strict key-usage/certificate extensions.
The resume-04 source archive SHA256 is
`533d7adcaebc6fb2c5755a04e414738670cf6614876fede04280c163594bfa09`.
`/root/monolab-probe-evidence-resume-04/build.json` records native Linux module
verification, race tests, vet and four successful builds. `installation.json`
confirms installed hashes, preserved old binaries and unchanged private keys
and credentials. The public CA trust copy was updated and task services restarted.

In that evidence directory, `permissions-node-03.json` passes all seven account
checks, including service-private credentials/journal and denial of same-UID
callers outside owned cgroups. `recovery-node-03.json` passes scoped result reads
after Attempt grant expiry, returning the original committed operation.
`planner-01.json` retains a failed provider-certificate trial before tool use;
that provider TLS failure is separate from the local test-CA repair.

## Provider limits and safe termination (resume-05)

`node-04` and `planner-02`, launched after the repaired deployment, both failed
before native tool invocation. Private OpenCode logs explicitly report
`AI_APICallError: Rate limit exceeded. Please try again later.` and
`AI_RetryError` after three attempts. The processes remained alive beyond the
bounded probe wait; no formal workspace or handoff receipt existed. Original
timeout results are preserved as `node-04.json` and `planner-02.json` under
resume-04. Initial inspection preceded those final files appearing; no permanent
evidence-loss claim is made for these two trials.

Saved `provider-limit-node-04.json` / `provider-limit-planner-02.json` under
`/root/monolab-probe-evidence-resume-05`, then used the authenticated local admin
surface with `{"action":"revoke","attempt_id":"<trial-id>"}`. Both Stop
operations succeeded with `writer_absent=true`, mutation authority revoked and
claims released. Separate `revoked-<trial-id>.json` snapshots retain that recovery.
Fresh canonical inspection found zero unreleased Attempts. No provider/model,
credentials, unrelated services or host reboot were changed.

The harness now persists immutable prepared/acknowledged-start evidence and pair
restart snapshots before driver release. Local harness verification passes
**28 tests**, including persistence failure, lost admission response and same-ID
rerun refusal. These checks do not satisfy real Planner or concurrent trials.

Remaining acceptance: an uninterrupted Node completion with the stop fix,
successful real Planner access, two concurrent same-UID Attempts across service
restarts, and the separately agreed whole-host reboot. Free-provider availability
currently prevents further real CLI evidence. Keep the probe `in_progress` and
retain all failures; do not mark AC1–AC10 collectively complete.

Session execution preference: the Owner requested main-session-only work from
this point; implement, review and host validation directly without sub-agents.

## Model-independent verification (resume-05/06)

At the Owner's request, continued without further model requests. Local lint,
typecheck, 45 unit tests, protocol generation check and build passed. The correct
strict TLS test command `node --test infra/compose/test-prepare.mjs` passed; an
initial invocation using the old `prepare.test.mjs` filename found no file and
ran no tests. The real Compose PostgreSQL suite passed **16/16** (1.345 s test
execution). Linux Runner race tests and vet passed using cached test results.

`delayed-revoke never-started-05` passed on the host and wrote its immutable
resume-05 result. No model request or execution process was started.
With zero unreleased Attempts, restarted only `monolab-probe-runner.service`
and Compose `server`; completed node-03 state, receipts, Git operations, retained
requests, ownership and runtime events remained unchanged. Scoped recovery still
returned its original committed operation; Runner was active and no claims were
created. All nine checks passed in `after-idle-service-restart.json`.
This establishes completed-result persistence, not live concurrent recovery.

That procedure is now available as `probe.py ... idle-restart node-03` and refuses
unresolved Attempts or missing committed handoffs. Checkpoint persistence precedes
service changes. Probe regressions total **31 passing tests locally and on Linux**.
The reusable `idle-restart node-03` command passed on the host; resume-06 retains
its before/after evidence and installed harness hashes. Source
and evidence locations plus all outstanding acceptance items are consolidated in
[acceptance-status.md](acceptance-status.md).

## Owner-deferred provider work

The next isolated `planner-03` trial again reported explicit provider rate limits
before tool use. Its authenticated revoke completed with physical absence and
claim release; resume-06 retains prepared/start, failure and revoked evidence.
A bounded text-only diagnostic of catalog-verified zero-price `opencode/big-pickle`
also timed out after 45.09 seconds and its private logs reported rate limits.
It did not modify the Adapter's fixed model or establish tool compatibility.

The Owner then requested deferring this provider work until tomorrow and moving
to other tasks. No further model requests are planned today. A final canonical
inspection found zero unreleased Attempts. Keep this task in progress with its
outstanding acceptance gates; do not archive or mark it passed. Next work is the
existing PostgreSQL claim/capacity leaf, with Runtime acceptance explicitly deferred.

The Owner subsequently explicitly selected `opencode/longcat-2.5-preview-free`
(LongCat 2.5 Preview Free) for future required real-model tests. Recheck zero pricing
before use and keep all historical model identities/evidence. The running Adapter
has not yet been changed; database tasks continue first per the Owner's sequencing.
