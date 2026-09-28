# Command, Identity and Replay Contracts

Source: [Tool Protocol](../../../docs/05-tool-protocol.md).

## 1. Scope / Trigger

Owner HTTPS commands, Agent `monolab` commands, Runner WSS RPC/events and scoped recovery reads.

## 2. Signatures

Implemented probe envelope from [contracts.json](../../../packages/protocol/schemas/v1/contracts.json):

```text
schema_version=1, request_id, name, scope_id, payload
expected_control_version (required in this probe)
server-authenticated binding:
  attempt_id, fencing_generation, node_activation?
```

`POST /v1/commands` receives `CommandSubmission { envelope_json, sha256 }`. `GET /v1/commands/:request_id` reads the authenticated Attempt's receipt. Runner recovery uses `/v1/recovery/attempts/:attempt_id/commands/:request_id` or `/v1/recovery/operations/:operation_id`; its service credential never permits Agent command admission.

The bundled [monolab](../../../runner/cmd/monolab/main.go) supports immutable retry/status, `open_workspace`, `inspect_repository`, `complete_node` and `commit_task_turn`. Consult its help and the [protocol README](../../../packages/protocol/README.md) for exact CLI argument syntax. Full Owner authorization/delivery commands are not implemented by these probe routes.

## 3. Contracts

- Schemas/versioned generated types own wire fields; domain services own transitions.
- Backend derives caller identity and scope. Owner flags, socket paths and claimed Attempt IDs cannot grant authority.
- Owner, Runner and Attempt credentials are separate. Never expose secrets in logs/prompts/arguments.
- Same principal/scope/request ID and digest replay the existing result; changed command/payload conflicts.
- Authenticated receipt lookup precedes new-effect version checks.
- Return committed result, admitted operation or deterministic error distinctly.
- Retry loads the immutable original payload; no mutable-file reread or new ID after uncertainty.
- Revoked Attempts cannot make new effects. Scoped recovery reads never renew old mutation authority.
- Authenticate the signed Attempt identity's exact fields/types and expiry, not only its signature. Reject malformed, padded or trailing credential encodings as `unauthorized`.
- Canonical envelope input rejects malformed Unicode instead of hashing a replacement string differently in TS and Go.
- Complete every inventory page under the same snapshot before reconciliation; a partial page never proves process absence.
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
| Inventory snapshot changed | `version_conflict`; restart all pages without releasing ownership |
| Malformed signed credential | `unauthorized`, not an internal error |
| CLI journal write fails | Do not send HTTPS |
| Receipt missing but send uncertain | Preserve uncertainty; reconcile |

## 5. Good / Base / Bad Cases

Good: completion stops its CLI; Runner reads the admitted result through its own recovery scope.
Base: transport retries return the same operation.
Bad: trusting an environment Attempt ID or retrying with a fresh current version.

## 6. Tests Required

Use common TS/Go fixtures for versions, optional/null fields and malformed messages. Assert replay/conflict, stale authority, concurrent same-UID CLI attribution, lost response, changed input file, journal failure and expired-credential recovery. Real Linux/CLI tests are required for the socket/cgroup/permission boundary.

Backend coverage: [auth.test.ts](../../../apps/server/test/auth.test.ts), [app.test.ts](../../../apps/server/test/app.test.ts) and [postgres.test.ts](../../../apps/server/test/postgres.test.ts). They exercise strict authentication, queue/disconnect behavior and real database admission/recovery. The shared schema corpus lives in [validation.json](../../../packages/protocol/fixtures/validation.json).

## 7. Wrong vs Correct

Wrong: transport timeout -> generate request ID -> repeat effect.
Correct: retain original envelope -> read receipt -> explicitly retry under still-valid authority.
