# Technology & Deployment

This is the accepted technology baseline. Modules 01–08 own domain and execution contracts; this document owns their concrete implementation mapping. Module 09 defines the first executable slice and module 10 its verification gates. Stack selection does not imply that the runtime/isolation feasibility probes have passed.

## Selected stack

| Area | Selection | Responsibility |
| --- | --- | --- |
| Web | React, Vite, TypeScript | Responsive Owner workspace and review UI |
| UI primitives | Tailwind CSS, Radix/shadcn/ui | Components and styling |
| Server data in Web | TanStack Query | Cached reads, invalidation and reconnect refresh |
| Backend | Node.js LTS, Fastify, TypeScript | Authenticated commands, domain services, orchestration and delivery coordination |
| Primary database | PostgreSQL | Canonical records, claims, receipts, events, outbox and projections |
| Database access | Drizzle with reviewed SQL migrations | Typed queries and explicit SQL where locks/transactions require it |
| Runner | Go, independently built daemon | Runtime adapters, native process supervision, workspace effects and local recovery |
| Execution host | Linux with Owner-installed/authenticated Agent CLIs | Native process execution and durable host workspace storage |
| Git | System Git CLI invoked with structured argument arrays | Clone/fetch, worktrees, revision capture, integration and authorized push |
| Remote delivery | GitHub App integration behind a provider adapter | Repository access, PR/checks and guarded merge |
| Initial deployment | Docker Compose for backend/PostgreSQL; host Go daemon managed by systemd | One Linux host initially, separate control and execution boundaries |
| Tests | Vitest, Go testing/race detector, Playwright | Domain/protocol checks, Runner supervision and Owner flow verification |

Use supported stable releases and pin concrete versions in lockfiles, `go.mod`, and deployment image references at scaffolding time. Do not equate the architecture decision with a commitment to an unverified package version.

## Runtime topology

```text
Browser: React SPA
    │ HTTPS commands / reads + SSE updates
    ▼
Fastify backend (TypeScript modular monolith)
    ├─ Project / Role / Todo / Task services
    ├─ Planner context and Tool Protocol
    ├─ Orchestrator and Runtime policy/claims
    ├─ Workspace operation coordination
    ├─ Delivery coordinator + GitHub adapter
    ├─ outbox/background workers
    └─ PostgreSQL
    ▲
    │ Runner-initiated authenticated WSS connection
    │ versioned commands, replies, heartbeats and events
    ▼
Go Runner (Linux host service)
    ├─ Runtime discovery / CLI adapters
    ├─ native process supervision and local effect journal
    ├─ Workspace Manager / system Git operations
    └─ native Attempt processes
          ├─ Owner-installed Agent CLI and its existing authentication
          ├─ assigned host workspace/scratch directories
          └─ scoped Tool Protocol calls → backend HTTPS
```

Planner is semantic Agent work executed through the same Runner/CLI infrastructure as Node work. Backend Planner code builds context and validates formal results; it does not silently replace Planner execution with an unrelated direct model API loop.

The backend and Runner are separate executable/deployment units from the first implementation. Backend services are modules, not microservices. Background workers initially run with the backend and may later run as another process from the same application code, using the same PostgreSQL guards.

## Concrete communication choices

- Web uses HTTPS JSON APIs. SSE carries persisted/provisional UI updates with resumable cursors; clients refresh authoritative state after gaps. A live connection is never lifecycle authority.
- Runner initiates WSS to the backend, avoiding a required public inbound Runner port. RPC-style envelopes over that connection carry correlation IDs, stable operation IDs, schema versions and current ownership. Backend Workspace reads are routed through this service boundary rather than opening host paths.
- Attempt tools call the backend HTTPS Tool Protocol with scoped credentials. A CLI-specific tool adapter may bridge its native tool transport, but must preserve the same authorization and idempotency behavior.
- PostgreSQL outbox rows are committed with control transitions. Workers poll/claim bounded batches with transactional guards; notifications may wake workers but are not durable queue truth. No Redis, Kafka or Temporal is required in the baseline.
- Keep large logs/content off the small command-response path: batch events, apply backpressure, and use authenticated HTTP transfer when needed. Runner-local spooling and acknowledged cursors remain mandatory.

Canonical cross-language payload definitions live as versioned JSON Schemas in `packages/protocol`. Generate TypeScript/Go transport types from those definitions and check generation drift in CI. OpenAPI describes the HTTP surface using those contracts. Neither Go structs nor handwritten TypeScript interfaces are an independent wire-format authority. Schema validation does not replace domain transition validation.

## Native execution and local persistence

The Go daemon directly invokes an installed host CLI with a resolved executable path, structured arguments, working directory, and controlled environment. It runs execution under the configured host account with that CLI's existing Owner-managed authentication. MonoLab does not require an execution container, execution image, reinstall, or new container-specific login.

Each Attempt has supervised native process identity bound to dispatch/Attempt IDs, a process group or service scope, log streams and a durable start record. The Linux implementation must demonstrate process-tree termination and restart reconciliation, including escaped/background descendants; a single child PID or a shell `kill` alone is insufficient. Use the local journal and process birth/supervisor identity to reconcile uncertain starts without spawning duplicates. The concrete supervisor mechanism is selected by the feasibility probe.

Runner creates separate workspace/scratch directories. `open_workspace` lazily clones/materializes the repository in its assigned directory; serial work may reuse the Task Workspace, and parallel work uses private Node worktrees. The Runtime's native tools then read/write/build/test in those host paths. A worktree separates code state; it is not a container or a security sandbox.

Use supported CLI-native permission/sandbox settings and host account permissions. Keep backend state and system delivery credentials protected under separate service identities. Native execution uses the permissions of its configured account, so MonoLab does not claim arbitrary-code containment or protection from credentials independently available to that account. A stricter sandbox can be an explicit future execution-environment option without changing Task/Node/Attempt semantics; it is not a prerequisite for using an already-installed CLI.

Runner's durable journal uses local SQLite for operation metadata and filesystem spool files for logs. It is infrastructure bookkeeping, not a second database of Task/Node truth. Git objects, workspaces and journal/spool data live on durable host storage. PostgreSQL remains the canonical product/control database. Backup and disk-loss guarantees remain those in modules 04 and 06.

The Owner installs and authenticates coding tools on the execution host. Discovery verifies the executable and startability under the actual execution account, including its permissions and login context. MonoLab never installs those Runtimes or performs login on the Owner's behalf.

## Git delivery across the process boundary

The backend owns provider authorization, PR creation/checks, acceptance and merge. Runner owns local Git objects. Backend sends an authorized push operation identifying the exact workspace revision and delivery branch; a separately permissioned system Git worker executes it outside the Agent process and reports a reconciled result. Provider credentials supplied for that operation are short-lived and repository-scoped where supported, never written into Agent-readable repository config, logs or environment; the system worker uses a service identity whose credential storage Agent processes cannot read.

The Runner system service is trusted infrastructure; formal Agent requests still require scoped authorization. A lost push/merge response is reconciled against remote state. The backend never requires the repository directory to be mounted into its own container.

## Repository layout

```text
apps/
  web/                  # React/Vite client
  server/               # Fastify routes, module services and worker entrypoints
packages/
  protocol/             # versioned wire schemas and generated transport types
  domain/               # TypeScript domain rules; no CLI/filesystem effects
  db/                   # PostgreSQL schema, repositories and SQL migrations
runner/
  cmd/monolab-runner/    # Go executable
  internal/             # transport, adapters, supervision, workspace, journal
  go.mod
infra/
  compose/              # backend/database deployment
  runner/               # systemd and host configuration templates
```

Use a pnpm workspace for TypeScript packages and a Go module for Runner. `packages/db` is backend-only; Web consumes API contracts, never database models or credentials. Runner consumes generated protocol types and implements local effects, not a second copy of the Task scheduler. No monorepo build orchestrator is required initially.

## Initial deployment and expansion

One Linux host runs PostgreSQL and the backend via Compose plus the Go host daemon. The backend serves the built SPA for a same-origin Web/API deployment; a TLS ingress terminates HTTPS/WSS and supports SSE. Persist database and Runner data separately. Docker Compose is an application/database packaging choice only; it does not host the Agent CLI. The Go Runner does not require Docker API/socket access. Never expose PostgreSQL to the public network.

Adding machines installs the same Go daemon and enrolls each Runner with the backend. The backend keeps one canonical database and applies Runtime compatibility, capacity and Workspace locality checks. The first multi-Runner milestone distributes separate Tasks; workspace transfer and same-Task distributed execution remain later capabilities with their own verification gates.

The first concrete host CLI/execution account, Owner sign-in mechanism and deployment domain/TLS setup are still environment-specific choices. They do not reopen the selected languages, frameworks, database or transport. Resolve them during the feasibility/setup phase before an externally accessible deployment; no public deployment may omit authentication.
