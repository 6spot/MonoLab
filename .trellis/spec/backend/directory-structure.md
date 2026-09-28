# Backend Structure and Ownership

Sources: [architecture](../../../ARCHITECTURE.md), [record ownership](../../../docs/06-state-and-formal-data.md), [layout](../../../docs/11-technology-and-deployment.md).

## Selected destinations

These are planned paths, not existing directories.

| Destination | Owns | Excludes |
| --- | --- | --- |
| `apps/server` | Fastify routes, module services, context building, workers | CLI process handles and direct Runner-path reads |
| `packages/domain` | Deterministic rules and transitions | Network/filesystem/provider effects |
| `packages/db` | Schema, repositories, reviewed SQL migrations | Browser exports and scheduling decisions |
| `packages/protocol` | Versioned wire schemas and generated types | Domain transition authority |
| `runner` | Native process/workspace/Git effects | Direct DB access and semantic planning |

Keep Project, Role, Todo, Task, Planner, Orchestrator, Runtime coordination, Workspace coordination and Delivery ownership explicit. Do not create a service per table. Choose concrete filenames during scaffolding and add references here.

## Command path

Contract sketch:

```text
authenticated route -> validated payload/caller scope -> owning module
  -> transaction: receipt + guarded state/operation + event + outbox
  -> committed result or accepted operation reference

worker -> scoped Runner/provider effect -> reconciled module result
```

Cross-module mutations use the owning service API, with a shared transaction context where atomicity requires it. Inject effects so deterministic rules can be tested without real CLIs/providers.

## Forbidden shortcuts

- UI or Runner mutates domain tables.
- A generic workflow framework replaces Node/Attempt contracts.
- Mutable process-local maps own claims, capacity or durable queues.
- A provider SDK enters pure domain code.
- Backend opens an absolute Runner path.
