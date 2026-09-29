# Multica reference: conversation during execution

Status: research rationale for the adopted conversational Task direction. Current contracts live in modules 01–08; implementation sequence lives in module 09. The recommendations below explain the decision and do not override those owning modules.

## Source and findings

Inspected upstream source at commit `fa5d470ae40a082d952b50e843287906566785a6`. This is source inspection, not an end-to-end runtime validation.

- An Issue is an editable work container. Its update API accepts title and description. Description updates use last-write-wins and record activity; its revision is not equivalent to an Owner-approved immutable requirement revision. See [issue updates](https://github.com/multica-ai/multica/blob/fa5d470ae40a082d952b50e843287906566785a6/server/internal/handler/issue.go#L3499) and [description update policy](https://github.com/multica-ai/multica/blob/fa5d470ae40a082d952b50e843287906566785a6/server/internal/handler/issue.go#L3675).
- A comment can target a specific running Agent turn. If the selected turn has ended, has not started, or cannot accept input, normal queued/coalesced/deferred handling remains available; the handler does not silently redirect it into another running turn. See [comment routing](https://github.com/multica-ai/multica/blob/fa5d470ae40a082d952b50e843287906566785a6/server/internal/handler/task_supplement.go#L133).
- Supplements are durable records. The daemon serially claims input, calls the adapter, and acknowledges delivery or failure. WebSocket hints wake the loop, with polling as a fallback. See [daemon delivery](https://github.com/multica-ai/multica/blob/fa5d470ae40a082d952b50e843287906566785a6/server/internal/daemon/task_supplement.go#L121) and [receipt persistence](https://github.com/multica-ai/multica/blob/fa5d470ae40a082d952b50e843287906566785a6/server/pkg/db/queries/supplement.sql).
- Runtime transports differ: the Codex adapter calls `turn/steer` with an expected turn ID; the Claude adapter inserts context using hooks at supported boundaries. These are capabilities observed in Multica's adapters, not a universal CLI guarantee. See [Codex adapter](https://github.com/multica-ai/multica/blob/fa5d470ae40a082d952b50e843287906566785a6/server/pkg/agent/codex.go#L1946) and [Claude adapter](https://github.com/multica-ai/multica/blob/fa5d470ae40a082d952b50e843287906566785a6/server/pkg/agent/claude_supplement.go#L20).
- The UI test demonstrates “Add to current run”, “Stop and start over”, and delivery receipts. It manually advances the receipt, so it does not prove provider-side delivery. See [steering scenario](https://github.com/multica-ai/multica/blob/fa5d470ae40a082d952b50e843287906566785a6/e2e/comment-steering.spec.ts).

Multica's Issue and queued Agent run do not map one-to-one to monos's Execution Task. Borrow the ongoing conversation and reliable input delivery patterns; retain monos's explicit planning, completion evidence, and Owner acceptance boundaries.

## Assessment

The current architecture correctly separates semantic decisions from deterministic execution. However, freezing the entire Task specification forever makes ongoing clarification and scope changes unnecessarily awkward. Todo discussion alone cannot solve this because execution deliberately does not ingest later Todo context.

Recommended change: keep a stable Task identity and allow its requirement to evolve through immutable Specification revisions. Add a Task-owned conversation. Todo remains the long-lived topic; Task remains one delivery objective; Attempt remains one runtime invocation.

## Proposed behavior

1. Persist each Owner message with ordering and an idempotency key. Conversation is an input record, not a formal state transition.
2. Planner interprets status questions, guidance, and requirement changes. These are routing decisions, not mandatory user-selected message categories.
3. Questions require a reply. Guidance within the current scope can reach affected execution without changing the Specification. Record recipient and delivery outcome separately from semantic handling and completion evidence.
4. Scope, constraint, or acceptance changes produce an explicit Specification revision. Owner authorization must bind its exact content; an unambiguous Owner-authored edit may supply authorization directly, while an expanded or ambiguous Planner interpretation needs confirmation. Do not require confirmation for every chat message.
5. The program applies the authorized revision and its impact through the Tool Protocol. It records the source messages, prior revision, affected Nodes, and disposition of existing evidence. Publication must check the expected current revision and prevent incompatible completion, acceptance, or delivery from racing it.
6. A requirement revision does not imply a Plan revision. Continue or Rework when the existing graph is sufficient; request Replan only when the collaboration graph is insufficient. Input routing stays an internal operation/attention, not a new Task state or speculative REPLAN_REQUIRED.
7. Launch inputs bind the Specification revision and consumed message watermark. Later supplements have explicit per-Attempt receipts. Never pretend an old Attempt started with new inputs. Carrying evidence forward requires a recorded applicability decision; unaffected evidence need not be discarded blindly.
8. Conflicting active work must stop or reach a controlled boundary before revised work takes ownership. Fence stale formal commands and reconcile physical writers. Do not send a changed requirement to one Agent and assume all Nodes have adopted it.
9. Pending unresolved requirement changes block acceptance of a potentially stale result. Acceptance binds the effective Specification, Plan, and result revision; an old review confirmation cannot authorize a new result. Delivery operations with unknown outcomes must be reconciled before switching their basis.
10. Input delivery failure remains visible and recoverable. Unsupported live steering falls back to queued follow-up or controlled stop-and-resume with preserved workspace/history. Delivery success does not prove implementation. Retry and crash recovery must account for uncertain delivery rather than promise exactly-once provider consumption.
11. Completed Tasks remain accepted historical deliveries. Under the adopted monos boundary, Task Conversation serves only the current Task and terminal conversation is read-only. Further implementation or independent objectives are initiated by the Owner through Todo Discussion as independent Tasks, without inherited Task context or creation previews in Task Conversation; clarification and changes within unfinished delivery remain in the same Task.

## Suggested first-stage boundary

Include Task conversation, immutable Specification revisions, revision-bound execution/acceptance, durable input routing, and a controlled follow-up/stop-and-resume path in the first interactive slice. One Runner and one Node reduce coordination, not the need to record input versions and delivery outcomes.

Live steering may be added per adapter after its semantics are verified. It is an optimization of when input reaches execution, not a prerequisite for editable ongoing Tasks. Do not require all CLIs to support it in Stage A. Preserve multiple-recipient data cardinality for later Nodes/Runners without implementing distributed execution now.

The owning modules now define tool commands, publication/authorization boundaries, evidence handling, and input/completion/delivery races. Implementation must still validate those contracts through the Stage A acceptance gates.
