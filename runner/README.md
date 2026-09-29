# Go boundary probe

`monos-runner` owns the authenticated WSS client, local SQLite infrastructure
journal, attributed Unix socket, supervised process lifecycle and limited local
Git effects. `monos` validates input, gets an immutable journal acknowledgement
and an Attempt token, then sends HTTPS directly. The daemon never reads the
product database. The bundled CLI never sees Runner enrollment credentials.

```sh
go test ./...
go test -race ./...
go vet ./...
```

Run in `runner/`. Go 1.26+ and a C compiler are required. Protocol code and the
embedded JSON Schema are generated from `packages/protocol`; do not edit them
here. Shared protocol fixtures are consumed by Go tests.

Dependencies are deliberate: `coder/websocket` implements WSS absent from the
Go standard library; `mattn/go-sqlite3` supplies transactional durable SQLite;
`santhosh-tekuri/jsonschema/v6` validates the authoritative schema including
conditional frame/payload rules; `cyberphone/json-canonicalization` implements
RFC 8785. The only additional transitive Go module is `golang.org/x/text`.

The daemon journal records request bytes, start/effect identity and individual
event acknowledgements; bearer tokens stay in memory. Failed journal writes
produce no send permit. Unknown receipts remain uncertain, and an expired or
revoked Attempt is never refreshed by a recovery read.

Recovery inventory is snapshot-guarded and paginated. Every page is validated,
deduplicated and checked for complete operation ownership before reconciliation
or `ready`. A changing snapshot is retried from the beginning at most three
times; malformed pages, conflicting duplicates, repeated cursors, 64 MiB total
data or 256 pages hold ownership and require reconnect/recovery. Partial results
are never treated as proof that a process can be released. Typed capture storage
limits and invalid finalization are distinguished from recoverable host errors.

See [Linux bootstrap](../infra/runner/README.md) for the reviewed root helper,
service/execution identities, real CLI mode and explicit evidence limitations.
