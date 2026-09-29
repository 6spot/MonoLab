# Runner work package implementation

Status: code implemented and locally checked; Linux host/runtime acceptance is
still pending. This is work package B, not the final probe evidence report.

## Implemented boundary

- `runner/cmd/monolab-runner`: separate nonroot daemon, authenticated WSS,
  reconciliation before ready, short-lived authorization RPCs and individual
  durable stream acknowledgements. PostgreSQL is never accessed by Runner.
- `runner/cmd/monolab`: bounded JSON file/stdin input, generated-schema validation,
  service-private immutable journal acknowledgement, direct verified HTTPS send,
  exact-ID retry and scoped result lookup. Credentials are not stored with requests.
- `runner/internal/journal`: SQLite WAL/FULL durability for dispatch intent,
  original envelope bytes/digest, effect identity/results, events and atomic log
  cursor/event recording. Unknown or failed admission is not converted to a new ID.
- `runner/internal/host`: fixed no-argument root helper, root-owned manifests,
  fixed `me` execution, systemd-owned cgroups, boot/PID/birth reconciliation,
  full-tree freeze/kill and no release on ambiguous process state.
- Git: stable pre-reserved Node directories, cross-account `--no-local` clone,
  isolated worktree/common directory, stopped-writer finalization with all commit
  inputs retained before `commit-tree`, stable operation ref and exact service
  export. No remote publication.
- Planner inspection is produced as the service identity in a service-owned
  snapshot; execution receives group read access without write ownership.
- OpenCode 1.18.30 explicitly pins main/small/title/summary/compaction to the
  user-authorized free model. Shell and external-directory access are allowed;
  no global read-only filesystem, command allowlist or PID namespace is added.

The shell decision follows the Owner's later instruction and the Multica research,
superseding the earlier sandbox candidate. Cgroup lifecycle and authenticated
formal commands remain independent of a hostile-code containment claim.

## Dependency and build choices

Go module minimum: 1.26. The local task-only Go 1.27.1 download was verified
against the official release SHA256 before extraction (no global installation).

Four direct libraries: coder/websocket (WSS), mattn/go-sqlite3 (durable SQLite),
santhosh-tekuri/jsonschema/v6 (full schema including conditionals), and
cyberphone/json-canonicalization (RFC 8785). Only x/text is an additional runtime
Go module. SQLite uses CGO, so native Linux builds need a C compiler. Host Docker
builds can supply Go without replacing the system toolchain. The constrained
launcher needs Debian's signed `sudo` package; only the dedicated service user
receives permission to invoke the fixed helper without arguments.

## Completed local checks

From `runner/`, Go tests/race and vet passed on macOS. Coverage includes shared
TypeScript/Go schema and JCS corpus, missing/null/unknown fields, immutable request
conflict/reopen, forced SQLite write failure, individual event ACK gaps, durable
log cursors, duplicate dispatch with no second spawn, unknown writer/reused-PID
reconciliation guards, same-UID cgroup matching, helper input/identity limits and
deterministic Git finalization replay without an extra commit.

`GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build ./...` checked Linux-specific source
compilation only. It is **not** a working SQLite deployment build: the real host
must build and test with CGO enabled. `process_linux_test.go` supplies an actual
kernel `SO_PEERCRED`/birth/cgroup assertion when tests run on Linux.

## Host integration still required

Review `infra/runner/bootstrap.sh`; inventory collisions; install only task-owned
resources. Provision private Runner token/CA/config and the service-owned fixture
without exposing secrets. Then run native Linux Go tests/race and separate-process
backend/Runner/real OpenCode trials. Validate noninteractive tool behavior, normal
shell, snapshot write refusal, cache/journal permissions, live lazy worktree access,
two simultaneous Attempt socket callers, descendant stop, lost acknowledgement,
service restart and completion receipt recovery after credential expiry.

Do not mark these host facts passed from the local tests. Retain failed real
trials. The whole-host reboot still needs the agreed execution window. Full
PostgreSQL multi-worker claims, GitHub expected-head/check/merge and the full Stage
A/V1 loop remain separate gates.
