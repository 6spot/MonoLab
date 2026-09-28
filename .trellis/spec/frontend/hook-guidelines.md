# Queries, Commands and Streams

Sources: [stack](../../../docs/11-technology-and-deployment.md), [Tool Protocol](../../../docs/05-tool-protocol.md), [UI](../../../docs/07-owner-review-and-ui.md).

## Server reads

TanStack Query owns server-read caching. Keys include scope and identity: a Task's messages and another Task's messages must never share a cache entry. Illustrative key shapes, not existing hooks:

```ts
const taskKey = (taskId: string) => ["tasks", taskId] as const;
const messagesKey = (taskId: string) =>
  ["tasks", taskId, "messages"] as const;
```

Co-locate feature queries and commands; use `use...` only for actual hooks. Avoid generic hook frameworks and a second fetch cache.

## Mutation contract

Create one request ID per intended command and retain the exact payload for transport retry. An uncertain result is queried/replayed under that ID; editing the payload or correcting a definitive validation failure is a new command. Never silently replace expected versions after conflict.

Do not issue formal commands from mount effects. UI double-click prevention improves UX but cannot replace backend idempotency. On success, refresh affected authoritative projections. Show accepted-operation progress separately from completed effects.

## SSE and lifecycle

SSE uses resumable cursors with authoritative refresh after gaps. Clean up connections/subscriptions when scope or component lifecycle changes; reconnect must not duplicate messages/events. Never stop cloud execution on unmount or browser disconnect.

Provisional stream content is separate from committed Planner replies. Deduplicate the eventual reply by source identity rather than appending provisional text as canonical history.

## Tests

Exercise scope changes, repeated mount/unmount, reconnect after cursor gap, lost mutation response and double submission. Assert retained drafts and one canonical result. Query cancellation must not become a Task cancellation.
