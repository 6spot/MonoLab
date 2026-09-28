# Frontend Type and Input Boundaries

Sources: [wire schemas](../../../docs/11-technology-and-deployment.md), [command errors](../../../docs/05-tool-protocol.md).

## Authority

Generate transport types from versioned JSON Schemas in the future `packages/protocol`. Keep feature-only props/view models local. Do not copy DB types, manually duplicate wire enums or introduce a second schema authority.

Treat network/stream data as unknown until validated at the API adapter boundary. Types do not validate JSON at runtime. Use the chosen schema validator and generated contracts; do not add another validator merely for a form.

## Result handling

Exhaustively handle committed result, admitted operation and error variants. Exact discriminants will be defined in protocol schemas; sketches here are not alternate wire definitions.

Preserve opaque string IDs, version fields, optional/null distinctions and server timestamps. Do not coerce unknown Task states to RUNNING or treat a missing operation as success. Protocol incompatibility requires refresh/upgrade handling.

## Local conventions

Use explicit component props and inferred types from validated values. Avoid `any`, blind assertions, non-null assertions at async boundaries and suppressed type errors. Use native form validation plus server errors until complexity justifies a form library.

## Tests

Verify malformed/unsupported payload handling, optional fields, stale-version errors and every UI result variant. Type-check generated contracts and app together once scaffolded; record the actual command then.
