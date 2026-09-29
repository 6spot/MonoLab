# Backend and wire contract proposal

> Product terminology and command/path examples were normalized to `monos` on
> 2026-09-29. Exact historical names and observations remain in the original Git
> revisions and unchanged raw JSON attachments; this edit is not a new test run.

Status: work package A implemented; local unit/schema, lint, type and generation checks pass. Real PostgreSQL and integrated Linux checks are pending the main session's isolated deployment. After the Codex connection failure, the Owner explicitly authorized substituting installed OpenCode with a free model. The main session observed OpenCode 1.18.30 under `me`, model `opencode/mimo-v2.6-flash-free`, returning exactly `MONOS_PROVIDER_OK` in 7.15 seconds with exit 0 and no error events. That clears initial provider usability only; it does not pass the Runner/CLI acceptance criteria.

## Ownership and state-change boundary

Work package A owns root TypeScript workspace/tooling configuration, `packages/protocol`, minimal `packages/domain` and `packages/db`, `apps/server`, and `infra/compose`. Runner implementation owns `runner` and `infra/runner`. The main session owns task lifecycle, host access and final evidence. Shared files must be coordinated; no worker may overwrite another worker's changes.

The backend owns authenticated admission, PostgreSQL canonical records, current claims and operation/outbox intent. Runner owns processes, local journals, workspaces and Git effects. A Runner event is a reported fact; a domain service validates it before changing canonical state. Natural-language output, transport ACKs and process exit cannot complete a Node.

Every new command must commit its receipt, owning state/operation and outbox records in one transaction. External effects run after commit. Node completion is admitted first, then performed independently of the invoking CLI. Its receipt remains queryable even if the response is lost when that CLI is stopped. Completion evidence is recorded only after successful physical settlement. Outstanding process ownership keeps its reservation until absence/isolation is established.

## Schema and request identity

- Authoritative draft-07 JSON Schemas live under `packages/protocol/schemas/v1`. All command, control-message and normalized-event families carry explicit schema versions.
- A pinned `quicktype-core` entrypoint generates both TypeScript types and Go structs. The generated Go package lives under `packages/protocol/generated/go` with its own module; Runner uses a local `replace`. Generated types do not replace runtime schema validation.
- Commands support the minimum existing names: `open_workspace`, `inspect_repository`, `complete_node`, and reply-only `commit_task_turn`. Planner cannot call `open_workspace`; its repository operation is read-only inspection. Unsupported semantic routing is rejected, not silently dropped.
- The command body contains `envelope_json` and `sha256`. CLI parses input and deterministically canonicalizes the complete envelope before journaling; its input file's indentation/key ordering cannot change repeated-command identity. Prefer RFC 8785 implementations over an improvised serializer. The retained exact UTF-8 bytes are the bytes hashed and sent. Backend checks the digest, parses the envelope and validates its versioned schema. Retries never reread the source file, refresh the expected version, or assign a new request ID.
- Inner envelope contains request ID, command name, scope ID, command payload, schema version and expected basis where applicable. Authenticated Attempt, fencing, activation and permissions come from Runner/backend records, not caller-controlled envelope fields.
- Integers are bounded to JavaScript's exact integer range; each nullable/optional field is explicit. Unknown fields are rejected unless that specific schema explicitly allows them. Shared fixtures include null versus absence, bounds, Unicode canonicalization, unknown fields and unsupported versions.
- Request uniqueness is authenticated principal + scope + request ID. The same key with a changed digest/name fails. Authenticated receipt lookup precedes stale-version/current-authority checks for new effects.

## Minimal transport

| Path/channel | Proposed behavior |
| --- | --- |
| `POST /v1/commands` | Attempt-authenticated command admission; committed result, admitted operation or deterministic error |
| `GET /v1/commands/:request_id` | Current Attempt's own receipt/result lookup |
| `GET /v1/recovery/attempts/:attempt_id/commands/:request_id` | Runner-authenticated read of its recorded dispatch's existing outcome; never Agent mutation impersonation |
| `GET /v1/recovery/operations/:operation_id` | Read-only operation lookup constrained to that Runner/Attempt/operation |
| WSS `/v1/runner` | Runner-initiated, separately authenticated version negotiation, dispatch, authorization RPC, normalized events and operation results |

The WSS hello identifies protocol support, Runner and boot identity. Backend assigns a new monotonically increasing connection incarnation. Every subsequent control message binds that incarnation; a replaced channel cannot update control records. Dispatch has stable dispatch/Attempt IDs, owner/fencing/activation, context/basis, selected Runtime and logical resource references. The backend never opens a returned Runner-local path.

Runner authorizes a delayed dispatch with the backend before start. An authorization/Stop race retains the process reservation and reconciles; it cannot assert that no process started. Duplicate dispatch reconciles the same durable local start intent and supervisor identity.

Events deduplicate by Attempt/stream/sequence. ACK means persisted receipt of that sequence, not lifecycle completion. Reordered chunks are retained without inventing a contiguous acknowledged cursor. Accepted effects have stable operation IDs. Responses to an old/replaced channel cannot advance state.

## Authentication and persistence

- Separate Attempt and Runner credentials. No bearer credentials in command journals, public events, CLI arguments, fixture output or ordinary logs.
- A stale/terminal Attempt with an otherwise valid, unexpired credential may retrieve/replay its own admitted request but cannot create a new effect. Expired credentials are not renewed for that exception; Runner's separately scoped recovery authority reads the existing operation.
- New Agent mutations require a current live Runner control connection as well as the current Attempt claim. Runner connectivity/heartbeat/incarnation is recorded canonically; offline local computation does not authorize offline formal mutation.
- Minimal reviewed SQL records cover Runner capacity/incarnation, Task control/basis, Node activation, Attempt ownership/reservation, command receipts, admitted operations, normalized event cursors and outbox. Exact table names follow implementation review. Do not build the complete Task/Plan scheduler for this probe.
- Use real PostgreSQL for admission/locking tests. Claim capacity and the owner atomically; serialize competing commands on their common ownership/control boundary. Do not release an ambiguous physical reservation based only on a terminal state or expired lease.
- Bootstrap fixtures through a local administrative executable reading a private file or stdin. Do not add an unauthenticated setup endpoint or expose provider/control secrets to the execution account. HTTP fault hooks, if needed, are disabled unless the isolated authenticated harness explicitly enables them.
- Migrations run under one migration lock. Persist the schema version on admitted operations; failed upgrades must not reinterpret their payloads silently. No destructive automatic down migration.

## Bounded dependency proposal

Versions below were read from the package registry or official Node release index on 2026-09-28 and pinned in `package.json`, workspace package manifests and `pnpm-lock.yaml`. The install resolved 222 packages including development tools; the container runtime target uses production-only installation. Node and PostgreSQL image manifests are pinned by verified Docker Hub digest in `infra/compose`.

| Dependency | Candidate | Purpose and cost |
| --- | --- | --- |
| Node.js | 24.21.0 LTS (Krypton) | Isolated backend/build image; does not replace host Node 20.19.2. Official release index reports the version as LTS. |
| pnpm | 12.6.0 | Existing local CLI; pinned workspace package manager without monorepo orchestrator. |
| Fastify | 5.12.5, MIT | Selected HTTP framework; reuse its Pino logger and schema infrastructure. |
| `ws` | 8.22.0 | Mature WSS server framing/upgrade; Node's client WebSocket API is not a server implementation. |
| `pg` | 8.23.0 | PostgreSQL transport/connection pools; standard Node has no PostgreSQL driver. |
| `drizzle-orm` | 0.45.3 | Selected typed DB access; reviewed SQL handles explicit locks/migrations. |
| `ajv` | 8.20.0, MIT | Runtime validation from authoritative JSON Schemas; also used by Fastify. |
| `quicktype-core` | 26.0.0, Apache-2.0 | One TS/Go generation path. Development-only; nontrivial parser/utility dependency tree stays outside runtime. |
| `canonicalize` | 5.1.0, Apache-2.0 | RFC 8785 shared fixture/request serialization; no listed dependencies. Verify matching Go canonicalization against shared vectors. |
| TypeScript | 6.0.3, Apache-2.0 | Typed source/build; use the release supported by typescript-eslint's declared `<6.1.0` peer range. Do not select the registry's 7.0.2 latest outside that range. |
| Vitest | 5.0.2, MIT | Selected test runner; Node 24 supported. Real DB tests remain explicitly separate from unit tests. |
| ESLint / typescript-eslint | 10.11.0 / 8.70.1, MIT | Established source checks; development-only. Verify selected TypeScript support before pinning. |

No frontend, external queue, general workflow engine, provider SDK, additional logger, or monorepo build framework is justified by this scope. The Go worker selects unavoidable WSS/SQLite/schema libraries and pins them in its module; cross-language canonicalization is a shared review boundary.

## Implemented paths and checks

- `packages/protocol/schemas/v1/contracts.json` owns versioned structures, per-frame required/allowed members and per-command payload constraints. The one generator produces TS, Go, embedded Go schema and OpenAPI; shared JSON fixtures cover both validators and RFC 8785.
- `packages/domain/src/commands.ts` owns pure new-effect scope, kind, control-version, connectivity and source-watermark guards. Existing receipt lookup deliberately precedes these guards in the owning DB transaction.
- `packages/db/migrations/0001_boundary_probe.sql` and `0002_connection_instance.sql` establish canonical fixture records, claims, receipts, operations, outbox and events. Migration locking/checksums preserve existing admitted schema semantics. Drizzle supports typed reads; reviewed SQL expresses lock order and atomic writes.
- `apps/server/src/service.ts` implements admission/replay, operation settlement, scoped recovery, connection/incarnation ownership, capacity reservation and durable dispatch/event acknowledgements. No filesystem/Git effect runs in the backend.
- `apps/server/src/app.ts` implements authenticated HTTP and Runner-initiated WebSocket framing. Production entrypoint requires TLS key/certificate and private DB/signing-key configuration. `fixtures.ts`/`admin.ts` are local administrator-only setup/revoke/retry interfaces, with no network setup/fault endpoint.
- `infra/compose` provides pinned isolated server/database/test builds, dependency-free private CA/secret preparation and recovery-preserving cleanup instructions. PostgreSQL is not published on the host.

Checks executed locally: `pnpm lint`, `pnpm typecheck`, `pnpm protocol:check`, `pnpm build`, compiled backend import smoke, and `pnpm test` (23 unit/schema tests passed; 9 real-PostgreSQL tests intentionally skipped unless selected). `pnpm test:db` is ready for the isolated Compose database; no PG success is claimed yet. The Go worker owns real execution of shared Go fixtures and Runner tests.

The PostgreSQL suite covers concurrent receipt replay and claims, rollback/lost reply around admission, restart receipt recovery, old/expired scopes, fresh-heartbeat backend restart fencing, reordered events, delayed revoked dispatch/capacity, Planner reply semantics and real loopback WebSocket framing. That framing test intentionally uses harness HTTP; actual TLS/CA, process/root/account and CLI behavior require integrated host evidence.

The connection row binds a per-backend-process instance, not merely a recent persisted heartbeat. Restarted services can read receipts but cannot admit new effects before owning a reconnected Runner channel. Multiple backend instances eventually need connection-owner routing; this probe does not claim that future routing or the full multi-worker matrix is complete.

Failed system effects retain the same recovery operation and physical reservation; local administrative retry reuses that identity. Complete product recovery UX, typed unrecoverable capture-limit handling, full Task/Plan scheduling and GitHub delivery remain outside this minimal fixture implementation.

The integration report must distinguish local unit/schema checks, real PostgreSQL admission tests, real Linux process/CLI evidence and the unrun full multi-worker/GitHub gates. No real-host acceptance criterion is passed by this proposal.
