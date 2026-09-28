# Backend Quality Gate

Sources: [Stage A](../../../docs/09-first-executable-slice.md), [readiness](../../../docs/10-architecture-readiness.md), [invariants](../../../docs/08-principles-and-non-goals.md).

## Verification status

No product manifest, migration suite or test runner exists. Vitest and PostgreSQL integration testing are selected, not executed. Scaffolding must establish actual lint/type/test/schema-generation commands.

## Rules

- Test deterministic rules independently of HTTP/Git/Runtime.
- Use fakes for races, then real Linux/CLI/provider probes for external assumptions.
- Validate external payloads and handle result variants exhaustively.
- Never refresh a stale basis automatically to make an action succeed.
- Preserve full collection cardinalities in the single-Node slice.
- Apply the [dependency policy](../index.md); no speculative frameworks.

## High-value tests

| Boundary | Assertion |
| --- | --- |
| Task creation | Different request IDs for one proposal yield one Task |
| Claims/capacity | Workers cannot double-start or oversubscribe |
| Completion/invalidation | Only current evidence unlocks descendants |
| Replan | Changed definitions get new Node IDs; old writers settle |
| Conversation | Atomic reply/watermark, Retry/Withdraw |
| Acceptance | Input first blocks; acceptance first freezes a nonblocking cutoff |
| Delivery | Expected-head guards, uncertain response, partial Retry |
| Limits | Local hard failure BLOCKED; publication finding REVIEW |
| Restart | Outbox/receipt recovery without session memory |

Test observable behavior and races, not private-helper mirroring. Documentation-only work needs link/consistency/format checks rather than an invented runtime suite.

## Review exit

Report executed checks and untested real-host assumptions. No code currently proves Stage A. Add real command paths and representative tests as scaffolding lands.
