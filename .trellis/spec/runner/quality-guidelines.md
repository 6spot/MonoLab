# Runner Verification

Sources: [Stage A](../../../docs/09-first-executable-slice.md), [readiness](../../../docs/10-architecture-readiness.md).

## Tooling status

Go testing and the race detector are selected. There is no `runner/go.mod` yet. Once scaffolded, establish `go test ./...` and `go test -race ./...` from the actual Go module, plus Linux-specific integration jobs. Do not claim a macOS run proves Linux systemd/cgroup behavior.

## Test layers

- Unit: adapter event normalization, schema validation, bounded recovery decisions.
- Local integration: SQLite durability, spool acknowledgement, Git journals and replay.
- Linux host: two identities, cgroups, descendants, reboot, credential isolation.
- Real CLI: noninteractive permission mode, bundled command access, required lifecycle call, lazy workspace grants.
- Control integration: separate filesystem roots, duplicate/reordered RPC and two fake Runner identities.
- Provider: expected-head merge, uncertain responses, remote checks and partial delivery.

Fakes establish control behavior only. Record supported CLI/version/settings and actual host profile for probes. Native session resume and live steering remain optional until independently verified.

## Review checklist

Use structured process arguments, propagate cancellation without discarding admitted operations, bound buffers and apply backpressure, protect unresolved journals/workspaces from cleanup. Do not invent a general workflow engine or a second scheduler. Explain every new Go dependency against standard-library alternatives.
