# MonoLab Engineering Specs

## Status and authority

MonoLab contains architecture documents and Trellis tooling; product packages, migrations and tests have not been scaffolded. These specs translate accepted decisions into implementation guidance. Examples are contract sketches, not existing functions or passing tests. Add real source/test references as each slice lands.

Read [ARCHITECTURE.md](../../ARCHITECTURE.md), the relevant [module](../../docs/README.md), and [invariants](../../docs/08-principles-and-non-goals.md) first. Domain rules belong there; this tree specifies implementation and verification. Update both when an accepted decision changes.

## Layers

| Entry | Selected destinations, not yet scaffolded |
| --- | --- |
| [Backend](backend/index.md) | `apps/server`, `packages/domain`, `packages/db` |
| [Frontend](frontend/index.md) | `apps/web` |
| [Protocol](protocol/index.md) | `packages/protocol`; HTTP/WSS/CLI boundaries |
| [Runner](runner/index.md) | Go `runner` and Linux host configuration |
| [Thinking guides](guides/index.md) | Cross-layer changes and reuse |

Keep this layer layout until real package structure warrants changing Trellis configuration. Do not register nonexistent packages. Task context manifests list relevant indexes and contract files.

## Dependency baseline

Follow [technology and dependency policy](../../docs/11-technology-and-deployment.md): React/Vite/TypeScript, Tailwind + shadcn/ui + Base UI, TanStack Query; Fastify, PostgreSQL/Drizzle; Go Runner and bundled CLI. Add only needed components. Do not preinstall Radix, another component suite, global-state/form/animation frameworks, external queues or a monorepo orchestrator.

Prefer standard APIs and existing dependencies. A new dependency needs a concrete use, alternatives, maintenance/version/license review and runtime/transitive cost in the change description. Do not replace mature security, protocol or accessibility behavior with ad hoc code simply to reduce package count. Pin concrete versions during scaffolding.

## Before development

1. Read the layer checklist and owning architecture module.
2. Identify the command boundary and required failure cases.
3. Preserve Task/Plan/Node/Attempt and admission/completion distinctions.
4. Follow [Stage A](../../docs/09-first-executable-slice.md): real Linux/CLI feasibility precedes broad product implementation.
5. Establish package checks during scaffolding. No product lint/type/test command exists yet; never report a planned command as passing.

Documentation is English. Current checks include `git diff --check`, local links, index coverage and unfilled-template scans.
