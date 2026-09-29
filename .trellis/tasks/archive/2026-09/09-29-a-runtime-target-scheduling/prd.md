# Runtime target selection and shared slots

## Goal

Let product control code select a configured, currently available Runtime target for a Planner or Node, persist one canonical queued Attempt, and dispatch it through the Runner's shared capacity. This is the first production integration leaf; it does not create Task or Todo conversation flows.

## Background

Runtime and host feasibility passed for the tested OpenCode/Linux boundary. Owner configuration already stores global, Planner and Role execution policies and current Runner installation observations. `DispatchQueue` persists a caller-selected Attempt and promotes it to a fenced Start, but its caller must currently supply Runner, Runtime and model, and promotion uses oldest-first ordering without control-work priority. The Runner and backend transport already support durable Start replay.

## Requirements

- Select the Stage A default target using the accepted priority: explicit one-off selection, then applicable Planner or Role policy, then global policy. A selected target records its exact Runner, Runtime and model without changing an already-running Attempt. An explicit target may not silently switch to another target. The current OpenCode adapter does not support thinking level; a requested thinking setting is reported as unsupported instead of being ignored.
- Resolve a logical Runtime against current installation and Runner connection facts. A hard Runner pin stays hard; Auto uses the single eligible Stage A Runner. An unavailable target yields a factual, actionable selection result and creates no phantom running process. A queued target whose Runtime becomes objectively unavailable is terminalized with its pre-start reason before any replacement selection. A temporarily disconnected sole Runner retains queued work for reconnection.
- Persist selected Planner and Node work through the existing transactional `QUEUED` Attempt path, retaining its immutable input, revision basis, idempotency and workspace locality guards. The caller retains responsibility for semantic context and Owner authorization.
- Planner and Node Attempts share Runner capacity, defaulting to two slots in the Stage A deployment configuration. Control work receives the next free slot before ordinary Node work; within each class, oldest eligible work wins. Occupied capacity leaves an Attempt `QUEUED` and does not imply Runtime failure, fallback or Task `BLOCKED`.
- Claim, fence, capacity reservation and Start outbox intent remain atomic. No later Attempt for the same owner may run while the former process or effects remain unresolved. Reconnect and competing backend workers cannot double-start or overfill capacity.

## Acceptance criteria

- [x] Policy selection covers explicit, Planner, Role and global precedence; current installation, pinned Runner, Auto, unsupported model/thinking and unavailable cases are observable and deterministic. New live model calls remain limited to the Owner-approved LongCat free model until a separate selection is approved and verified.
- [x] Selected queued Attempts preserve the exact policy/target and context basis across backend restart and duplicate admission; changed replay content conflicts.
- [x] With two slots occupied by any mix of Planner and Node work, further work remains queued. On release, eligible control work precedes Node work, then FIFO within its class; unrelated queued work is not starved by a blocked owner.
- [x] Two backend workers racing promotion create at most one Start per Attempt, never exceed configured capacity and never overlap unresolved ownership or move a Task workspace to another Runner.
- [x] Pre-start Runtime loss terminates the selected queued Attempt with a factual reason. A disconnected sole Runner and capacity saturation preserve queued work without target replacement or Task failure.
- [x] A production-facing integration API is usable by later Task/Todo control flows without direct writes to Attempt, Runner or outbox tables.

## Out of scope

Task/Discussion semantic planning and Owner Start, second real CLI and ordered fallback, full execution log projection, Owner Stop UI, live steering, multi-Runner placement/transfer and production host acceptance belong to later leaves or stages. No new Task lifecycle state or Runner scheduler authority is introduced.
