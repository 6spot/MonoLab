# Architecture Modules

These documents are the current source of truth for MonoLab architecture.

Read [../ARCHITECTURE.md](../ARCHITECTURE.md) first for the one-page map.

## Modules

1. [Product & Domain](01-product-and-domain.md)
2. [Planner & Planning](02-planner-and-planning.md)
3. [Runtime & Execution](03-runtime-and-execution.md)
4. [Workspace & Git](04-workspace-and-git.md)
5. [Tool Protocol](05-tool-protocol.md)
6. [State & Formal Data](06-state-and-formal-data.md)
7. [Owner Review & UI](07-owner-review-and-ui.md)
8. [Principles & Non-goals](08-principles-and-non-goals.md)

## Implementation sequence

- [First Executable Slice](09-first-executable-slice.md) — Stage A scope, module handoffs, acceptance gate, and decisions needed before scaffolding. Domain rules remain in modules 01–08.

## Architecture review gates

- [Architecture Readiness](10-architecture-readiness.md) — extension boundaries, failure scenarios, and pre-implementation feasibility gates. This is an index of checks, not a second owner of domain rules.

## Selected technology

- [Technology & Deployment](11-technology-and-deployment.md) — accepted stack, concrete process/transport boundaries, repository layout and deployment.

## Change rule

When a new decision replaces an older one, update the owning module directly and remove obsolete concepts. Do not preserve dead architecture merely for historical compatibility. Git history is the history.
