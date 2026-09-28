# Command, Identity and Replay Contracts

Source: [Tool Protocol](../../../docs/05-tool-protocol.md).

## 1. Scope / Trigger

Owner HTTPS commands, Agent `monolab` commands, Runner WSS RPC/events and scoped recovery reads.

## 2. Signatures

Conceptual envelope from module 05:

```text
request_id, name, scope_id, payload
expected_control_version?, authorization_receipt_id?
server-authenticated binding:
  attempt_id, fencing_generation, node_activation?
```

CLI operations include `monolab retry --request-id <id> --output json` and `monolab command-status --request-id <id> --output json`. Lifecycle examples include `complete_node(summary, artifact_ids?, handled_guidance_ids?)` and `commit_task_turn(reply, source_watermark, routing)`. These are accepted interfaces, not installed binaries in this repository.

## 3. Contracts

- Schemas/versioned generated types own wire fields; domain services own transitions.
- Backend derives caller identity and scope. Owner flags, socket paths and claimed Attempt IDs cannot grant authority.
- Owner, Runner and Attempt credentials are separate. Never expose secrets in logs/prompts/arguments.
- Same principal/scope/request ID and digest replay the existing result; changed command/payload conflicts.
- Authenticated receipt lookup precedes new-effect version checks.
- Return committed result, admitted operation or deterministic error distinctly.
- Retry loads the immutable original payload; no mutable-file reread or new ID after uncertainty.
- Revoked Attempts cannot make new effects. Scoped recovery reads never renew old mutation authority.
- Owner acceptance serializes with message admission; later conversation cannot route execution changes into the accepted batch.

## 4. Validation & Error Matrix

| Condition | Behavior |
| --- | --- |
| Caller outside scope | Denied, including receipt reads |
| Terminal/stale Attempt, new request | Stale execution |
| Authorized prior receipt lookup | Existing result, no new effect |
| Same ID with changed payload | Conflict |
| New request on stale control basis | Version conflict |
| Unsupported required schema semantics | Reject/upgrade |
| Accepted asynchronous command | Return stable operation reference |
| CLI journal write fails | Do not send HTTPS |
| Receipt missing but send uncertain | Preserve uncertainty; reconcile |

## 5. Good / Base / Bad Cases

Good: completion stops its CLI; Runner reads the admitted result through its own recovery scope.
Base: transport retries return the same operation.
Bad: trusting an environment Attempt ID or retrying with a fresh current version.

## 6. Tests Required

Use common TS/Go fixtures for versions, optional/null fields and malformed messages. Assert replay/conflict, stale authority, concurrent same-UID CLI attribution, lost response, changed input file, journal failure and expired-credential recovery. Real Linux/CLI tests are required for the socket/cgroup/permission boundary.

## 7. Wrong vs Correct

Wrong: transport timeout -> generate request ID -> repeat effect.
Correct: retain original envelope -> read receipt -> explicitly retry under still-valid authority.
