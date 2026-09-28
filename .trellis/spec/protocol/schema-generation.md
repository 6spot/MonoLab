# Wire Schema Ownership and Evolution

Sources: [technology](../../../docs/11-technology-and-deployment.md), [evolution](../../../docs/05-tool-protocol.md).

## Source of truth

Versioned JSON Schemas in future `packages/protocol` generate TypeScript and Go transport types. OpenAPI uses the same contracts. Neither handwritten TS interfaces nor Go structs independently define the wire shape.

Select schema tooling during scaffolding after checking required JSON Schema support, TS/Go fidelity and dependency footprint. No generator package or command exists yet. Keep a single pinned generation entrypoint and CI drift check once chosen.

## Compatibility rules

- Commands, normalized Runtime events and backend/Runner RPC carry explicit schema versions.
- Negotiate before dispatch; unsupported required semantics fail clearly.
- Allow unknown/additive fields only where the schema says so.
- Keep old admitted operation payloads readable under their original version or an explicit migration.
- Do not conflate domain IDs, Node activation, Attempt fencing, connection incarnation, event sequence and message cutoff.
- Define integer ranges/serialization explicitly so Go and JavaScript do not disagree at numeric boundaries.
- Define absent versus null and timestamp formats in schema rather than consumer guesses.

## Event and content paths

Delivery is at least once. Deduplicate Runtime events by `(attempt_id, stream_id, sequence)`; reconnect from acknowledged cursors. A persisted transport acknowledgement is not lifecycle completion.

Large content/logs use bounded batches and authenticated transfer. Artifact content is pinned immutably before publication. Do not embed unbounded transcripts or raw credentials in command envelopes.

## Tests and wrong patterns

Generation tests cover a shared fixture corpus in both languages, unsupported versions, duplicate/reordered events and persisted-operation recovery across upgrades. Integration tests run backend and Runner with distinct filesystem roots.

Wrong: hand-edit generated Go types to accept a new field.
Correct: change the canonical schema, regenerate both languages and test compatibility plus domain validation.
