# State & Formal Data

## Separation of concerns

~~~text
Execution Task    = what should be done
Execution Plan    = how work collaborates
Node              = durable collaboration/work unit
Attempt           = one concrete runtime execution
Execution Log     = raw execution process
Artifact          = formal semantic output
Task Event        = formal lifecycle history
Current Task State = small current projection
Timeline          = UI projection
~~~

Keep these responsibilities separate.

## Task state

Use a small state set:

~~~text
QUEUED
RUNNING
BLOCKED
REPLAN_REQUIRED
REVIEW
COMPLETED
CANCELLED
~~~

Do not encode every reason as a new Task state.

Task state is derived from formal execution facts rather than manually advanced by Agents:

- RUNNING while work is running or runnable;
- BLOCKED only when no running/runnable work remains and at least one required Node is BLOCKED;
- REPLAN_REQUIRED while an unresolved Replan request freezes new scheduling;
- REVIEW when every required Node in the current effective Plan is COMPLETED and deterministic review/delivery preparation has completed sufficiently to present the result.

## Node state

Keep Node state small:

~~~text
PENDING
RUNNING
BLOCKED
COMPLETED
CANCELLED
~~~

Avoid a generic Node FAILED state when an Attempt failure can simply lead to another Attempt.

Rework may reactivate a COMPLETED Node back into active execution.

When a Node is reworked, that Node and all descendants in the current Plan are invalidated back to PENDING. Independent Nodes are unaffected. Historical execution data remains immutable.

## Attempt state

~~~text
QUEUED
RUNNING
SUCCEEDED
FAILED
CANCELLED
~~~

Specific causes live in `end_reason`.

Attempt failure does not imply Node failure.

## State authority

~~~text
Agent
→ Tool intent

Runtime Adapter
→ Attempt facts

Owner
→ Decision

Orchestrator
→ formal state transition
~~~

Do not let Agent prose directly mutate state.

## Artifact

Artifact is an immutable formal semantic output.

~~~text
Artifact
- id
- execution_task_id
- source_node_id
- source_attempt_id
- title
- content
- references[]
- supersedes?
- created_at
~~~

Do not hard-code business Artifact types such as ImplementationResult, TestResult, or ReviewResult.

`references[]` stays generic.

If a newer Artifact replaces an older formal output, use `supersedes` rather than mutating the old Artifact.

## Task Event

Task Event records only formal lifecycle changes and formal output publication.

Suggested minimal fields:

~~~text
TaskEvent
- id
- execution_task_id
- sequence
- type
- source_node_id?
- source_attempt_id?
- artifact_id?
- summary?
- reason?
- metadata?
- created_at
~~~

Keep event types small, for example:

- PLAN_PUBLISHED
- NODE_STARTED
- NODE_COMPLETED
- NODE_BLOCKED
- REWORK_REQUESTED
- REPLAN_REQUESTED
- ARTIFACT_PUBLISHED
- OWNER_DECISION
- TASK_REVIEW_READY
- TASK_COMPLETED
- TASK_CANCELLED

Task Event does not duplicate Artifact content.

## Execution Log

Execution Log is the complete append-only raw process history for an Attempt.

It may contain:

- runtime output;
- tool calls;
- shell commands;
- stdout/stderr;
- file operation details;
- build/test process output;
- errors;
- runtime events.

Concrete operation logs do not belong in Execution Task, Current Task State, Task Event, or Timeline.

Full logs are retained, but default Agent context should use only a small recent tail or a reference. Agents may read/search more on demand.

## Git delivery operation

Git delivery is a separate deterministic operation owned by the system.

It may have provider-specific internal states such as preparing, pushing, waiting for checks, mergeable, merging, succeeded, or failed, but those must not expand the Execution Task state machine.

For Git tasks:

- readiness for review causes automatic delivery preparation / PR creation;
- Task remains REVIEW while the Owner reviews and while delivery prerequisites are being evaluated;
- Owner Accept starts/continues the final delivery operation;
- successful merge/delivery causes TASK_COMPLETED;
- delivery failure leaves the Task in REVIEW.

Git delivery state is not Current Task State and should not be duplicated there beyond an attention/reference pointer when Owner action is required.

## Current Task State

Current Task State is a small, rebuildable materialized projection.

It is not Source of Truth and is not a semantic summary.

Baseline:

~~~text
CurrentTaskState
- execution_task_id
- status
- current_plan_id
- active_node_ids[]
- active_attempts[]
- attention?
- last_event_sequence
- updated_at
~~~

`attention` is a pointer to the current Owner-facing item, such as kind/source_node_id/event_id. Do not duplicate long reason text.

Do not store copies of Specification, Artifacts, Git state, Workspace state, Runtime state, sessions, latest test result, or other data that already has a canonical owner.

Do not persist cheaply derivable values such as runnable Nodes.

Current Task State must be rebuildable from formal objects and is incrementally updated when formal actions occur.

## Timeline

Timeline is not a stored object.

It is a human-facing projection over Task Events, Artifacts, and other formal objects.

It answers:

> What formally happened and what was produced?

Execution Log answers:

> What exactly did the Agent do?
