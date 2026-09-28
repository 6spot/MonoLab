module monolab.local/runner

go 1.26.0

require (
	github.com/coder/websocket v1.8.14
	github.com/cyberphone/json-canonicalization v0.0.0-20241213102144-19d51d7fe467
	github.com/mattn/go-sqlite3 v1.14.32
	github.com/santhosh-tekuri/jsonschema/v6 v6.0.2
	monolab.local/protocol v0.0.0
)

require golang.org/x/text v0.14.0 // indirect

replace monolab.local/protocol => ../packages/protocol/generated/go
