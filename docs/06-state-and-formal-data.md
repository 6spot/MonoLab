# State & Formal Data

## Separation of concerns

~~~text
Execution Task    = what should be done
Execution Plan    = how work collaborates
Node              = durable collaboration/work unit
Attempt           = one concrete runtime execution for a Planner or Node owner
Execution Log     = raw execution process
Artifact          = formal semantic output
Task Event        = formal lifecycle history
Current Task State = small current projection
Timeline          = UI projection
~~~

Keep these responsibilities separate.

## Persistence map

V1 may use one relational database. The names below are conceptual table/record boundaries; exact ORM naming is an implementation detail.

### Canonical product/domain records

```text
projects
project_resources
roles
project_roles

todos
todo_discussion_messages
todo_working_requirement_state

execution_tasks
execution_plans
nodes
artifacts
task_events
```

`Original Capture` belongs to Todo itself unless implementation needs a separate immutable record. Do not create a separate table merely because the UI renders it as a distinct block.

`ExecutionTask.specification` is immutable after creation. Execution Plan revisions are immutable. Nodes have stable Task-owned identities; each Plan revision owns immutable graph membership and definitions referencing those identities. Mutable Node lifecycle and activation facts are separate from immutable Plan structure.

Discussion messages are append-only conversation history. Working Requirement State is mutable/rebuildable semantic state and may be stored as one current record per Todo.

### Runtime / infrastructure records

```text
runners
runtime_registry
attempts
runtime_sessions?       # only if adapter/session recovery needs persistence
execution_logs
workspace_records?      # local Workspace Manager metadata, not product state
git_delivery_operations
```

Do not force every infrastructure concept into a first-class table. For example, Runtime Registry may be persisted or reconstructed from Runner discovery depending on implementation needs, and Workspace paths/worktree bookkeeping may live in Workspace Manager storage.

Attempt is the durable attribution boundary for Runtime execution. Execution Log belongs to Attempt. Runtime Session is opaque adapter infrastructure and should be persisted only when needed for recovery/resume.

### Rebuildable projections / derived data

```text
current_task_state
Todo unread / recent-activity projections
Board counts / filters
Timeline
Node progress groups
Runner utilization
runnable Nodes
```

`current_task_state` may be materialized for efficient reads, but it is rebuildable from canonical execution data and formal events.

Timeline is never a canonical table. Runnable Nodes are never persisted as lifecycle state. Runner utilization is derived from Attempts and unresolved process-termination operations.

### Ownership rule

A record has one owning module even when other modules read it:

- Project owns Project / Resource association;
- Role Library owns Role profiles;
- Todo owns capture, Discussion, and Working Requirement State;
- Execution Task owns immutable Task / Plan / Node / Artifact / Event records;
- Orchestrator owns deterministic lifecycle mutations and Current Task State projection updates;
- Runtime owns Runner / Runtime / Attempt / Session / Execution Log infrastructure;
- Workspace Manager owns local workspace/worktree/Git bookkeeping;
- Delivery owns Git delivery operation state.

Cross-module code should call the owning module's API/service boundary instead of directly mutating another module's records.


## Task state

Use a small state set:

~~~text
PLANNING
RUNNING
BLOCKED
REPLAN_REQUIRED
REVIEW
COMPLETED
CANCELLED
~~~

Do not encode every reason as a new Task state.

Task state is derived from formal execution facts rather than manually advanced by Agents:

- PLANNING after formal Task creation and before the Owner starts execution; no Plan or Runtime work is created automatically in this state;
- RUNNING immediately after Owner Start and throughout initial Plan generation and normal execution while work is active/runnable;
  - `RUNNING + current_plan_id = null` means initial planning is still incomplete;
  - `RUNNING + current_plan_id != null` means a Plan has been published and normal Plan execution may proceed;
- BLOCKED only when no running/runnable work remains and at least one required Node is BLOCKED;
- REPLAN_REQUIRED only while a formal unresolved Replan request identifies an insufficient collaboration graph and freezes new scheduling;
- REVIEW when every Node in the current effective Plan is COMPLETED and local workspace operations have settled. The integrated result is visible while remote delivery preparation proceeds or fails. Pending review-feedback routing also leaves the Task in REVIEW, with acceptance disabled until the operation resolves.
- CANCELLED is terminal for scheduling but preserves historical execution/formal outputs; physical Workspace/log cleanup is a separate retention concern.

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

A BLOCKED Node returns to PENDING when its external condition is explicitly resolved. This is the only formal Node transition needed for unblock/resume; Task status is then re-derived by Orchestrator.

Owner Stop after Plan publication is represented using this same mechanism: cancel the active Attempt and set the Node to BLOCKED with an Owner-stopped reason. Continue returns the same Node to PENDING and creates a later Attempt through normal scheduling.

Manual Runtime / Runner / Model / Thinking switching does not change Node state or Plan structure. It ends one Attempt and starts another while the Node remains RUNNING.
## Attempt

Attempt is generic Runtime execution infrastructure, not a Node-only object.

Each Attempt has exactly one owner:

- a Node for execution Agent work;
- a Todo Planner scope for Todo Discussion/materialization;
- an Execution Task Planner scope for initial Plan/Replan.

Planner Attempts reuse Runtime selection, Runner placement, model/thinking selection, Session handling, fallback, logs, status, and end reasons without introducing a separate PlannerInvocation object.

Planner Attempts do not receive Node state and do not become members of an Execution Plan.

## Attempt state

~~~text
QUEUED
RUNNING
SUCCEEDED
FAILED
CANCELLED
~~~

Specific causes live in `end_reason`.

`Attempt.QUEUED` is the normal runtime-capacity waiting state after work has been selected for execution but before a Runtime slot actually starts it. It does not imply Task PLANNING, Task BLOCKED, or an error.

A RUNNING Task may therefore have queued Planner/Node Attempts. Task state and Attempt scheduling state are intentionally different layers.

Attempt execution ownership is exclusive per owner. The scheduler atomically promotes a QUEUED Attempt to RUNNING only when no other active Attempt owns that same Node/Planner scope.

A RUNNING Attempt must record a monotonic fencing generation/token. This is infrastructure metadata used to reject stale mutations; it is not a user-facing lifecycle state.
For Node-owned Attempts, Attempt failure does not imply Node failure. For Planner-owned Attempts, failure does not create a new Task state; the surrounding Task/Todo remains in its existing formal state while fallback/retry/attention is handled.

Runner heartbeat loss alone does not transition an Attempt out of RUNNING. Attempt terminal state requires an objective execution outcome or a reliable fencing/reconciliation decision.

For V1, Node COMPLETED guarantees that the result has been finalized/integrated into the Task Workspace on the single Runner. V1 does not promise survival of permanent Runner-disk loss; external/cross-Runner Workspace durability is deferred.
## Runtime capacity projection

Runner execution capacity is configuration plus derived Attempt facts, not another domain state machine.

~~~text
Runner
- max_concurrent_attempts
~~~

Running utilization is derived from RUNNING Attempts assigned to that Runner plus unresolved process-termination reservations. A terminal database status alone does not release a possibly live process slot.

`Attempt.QUEUED` may mean healthy compatible capacity is currently full. This is normal waiting, not BLOCKED and not a reason to change Task state.

V1 has one Runner, so Auto resolves to that Runner. `runner_id` remains an explicit execution fact for future extensibility; cross-Runner placement is not implemented in V1.

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

## Current result attribution

Node lifecycle records carry an activation generation. Attempts, completion summaries, Artifacts, and formal completion events record that generation; infrastructure fencing remains separate. Rework advances activation and invalidates old current-result references atomically. Attempts from fallback share the same activation and preserve attribution.

An Artifact is historical immediately upon publication. It becomes current completion evidence only when its source activation successfully completes and is still valid in the effective Plan. Default downstream context includes outputs selected by successful completion, not every Artifact a failed Attempt happened to publish. The successful Attempt's Artifacts are included by default. An optional `artifact_ids` argument to `complete_node(summary, artifact_ids?)` may explicitly select earlier Attempt outputs from the same activation; IDs from a different activation are rejected. An empty selection is valid. Immutable content and `supersedes` preserve provenance without making obsolete results current.

Persist Owner authorization receipts, Task-scoped review feedback/blocker answers, and operation recovery records under their owning modules. They are not new user-facing lifecycles. Task event sequence plus durable control facts must reconstruct Start/Stop, unresolved Replan and pending review-feedback operations, effective Plan, invalidation, acceptance, and cancellation; do not infer them from log prose or timestamps alone.

## Transition precedence and recovery

| Trigger | Guard | Formal result |
| --- | --- | --- |
| Create Task | Matching Owner receipt, active Project | PLANNING, no Plan |
| Start | PLANNING, eligible Project/Role configuration | RUNNING; durable initial Planner work |
| Stop before Plan | No published Plan | Revoke Planner; PLANNING; restart waits for process reconciliation |
| Publish initial Plan | Current authorized Planner, no Plan, valid graph | Atomically select Plan and admit Nodes |
| Node completion | Current activation/Attempt; integration committed | COMPLETED Node and current output references |
| Exhausted execution | No allowed fallback or missing formal outcome | BLOCKED Node with recovery action |
| Rework | Authorized target set | Invalidate target/descendants and pending acceptance; resume after writers stop |
| Request Replan | Active Task and valid request identifying an insufficient graph | REPLAN_REQUIRED; freeze dispatch and settle running work |
| Publish Replan | Quiescent work, confirmed graph, unchanged basis | Atomically replace effective Plan and clear freeze |
| Request Changes | REVIEW, no partially merged result or unresolved merge | Remain REVIEW; revoke acceptance and create feedback-routing operation that blocks new acceptance/merge |
| Review routing to Rework | REVIEW, current unresolved feedback operation, unchanged basis | Resolve operation and apply Rework atomically; derive RUNNING from runnable work, never REPLAN_REQUIRED |
| Review routing to Replan | REVIEW, current unresolved feedback operation, unchanged basis, graph insufficient | Resolve operation and record formal Replan request atomically; REPLAN_REQUIRED |
| Review routing waits/fails | Unresolved feedback operation | Remain REVIEW; operation status/attention and Retry, acceptance still blocked |
| All work complete | No freeze or unsettled local operation | REVIEW; prepare remote delivery |
| Accept | REVIEW, no unresolved feedback operation, exact result receipt | Start/continue delivery; COMPLETED only after success |
| Cancel | Nonterminal Task | Revoke execution/acceptance; CANCELLED; reconcile outstanding effects |

CANCELLED and COMPLETED cannot be overwritten by late callbacks. An unresolved Replan request takes precedence over ordinary RUNNING/BLOCKED/REVIEW derivation. A pending feedback-routing operation does not change Task status; it guards acceptance and merge while Task remains REVIEW. Repeated callbacks are idempotent. A delivery failure cannot move REVIEW back to RUNNING. Remote success discovered after cancellation is recorded truthfully without undoing cancellation or pretending the merge was prevented.

All V1 Plan Nodes are required. QUEUED Attempts belong to admitted RUNNING Nodes, so capacity waiting cannot make a Task spuriously BLOCKED. Infrastructure recovery with no runnable process remains visible through attention/operation references until it settles; it does not invent new Task states.

## Required implementation acceptance scenarios

These scenarios define the minimum verification surface for the first execution implementation; they are not claims that an implementation already exists or has passed.

| Scenario | Required observation |
| --- | --- |
| Duplicate Task confirmation / Start | One Task and one initial planning chain; changed payload rejected |
| Two clients confirm one proposal with different request IDs | Proposal uniqueness returns one Task |
| Discussion commit succeeds but the Runtime response is lost | One final reply/requirement state; no fallback duplicate |
| Requesting Node hands off to Replan | Its process stops and its blocker is recorded; Planner does not wait forever for another call |
| Proposal/confirmation bookkeeping appends an event | Unchanged control basis stays valid; real work changes still invalidate the proposal |
| Two dispatchers claim the last slot | One process starts; the other Attempt stays queued |
| Later Node asks for a repository used directly | Direct writer is never relocated or concurrently integrated into |
| Git integration succeeds, database acknowledgement is lost | Restart records the existing integration exactly once before unlocking downstream work |
| Rework races with completion | One serialized outcome; obsolete activation cannot publish current evidence |
| Old process survives logical cancellation | Its commands are fenced and its writable workspace cannot be handed to a successor |
| Replan proposal becomes stale before confirmation | Publication rejected; current Plan remains intact |
| Request Changes resolves to Rework | REVIEW while routing, then RUNNING; no REPLAN_REQUIRED transition or Replan event |
| Request Changes resolves to Replan | REVIEW until the formal graph-insufficiency request commits, then REPLAN_REQUIRED |
| Planner fails or waits during feedback routing | REVIEW with operation attention; acceptance and merge remain blocked |
| Accept races with Request Changes or successful CI refresh | Serialized admission honors pending feedback; CI refresh cannot re-enable acceptance |
| Review-routing outcome is replayed or competes with another outcome | One committed routing decision; no duplicate invalidation or late Replan transition |
| Runtime exits successfully without completing the Node | Node is blocked for Retry, never inferred complete from prose/exit code |
| PR creation response is lost | Reconcile the existing PR; no duplicate PR |
| PR head changes after acceptance | Old acceptance cannot merge new code |
| Second repository merge fails | First merge remains recorded; REVIEW shows partial delivery and retries only remaining work |
| Browser disconnects and reconnects | Execution continues; current attention and deduplicated notifications reload |

## Independent versions and atomic ownership

| Identifier | Scope | Advances when | Does not mean |
| --- | --- | --- | --- |
| Task control version | One Task's canonical control record | Scheduling, effective Plan, activation, blocker, review or acceptance control changes | UI refresh count or log offset |
| Node activation | One durable Node | Existing work is invalidated for Rework | Runtime retry count |
| Attempt fencing generation | One execution owner | A new Attempt claims execution | New semantic work |
| Task event sequence | One Task's formal history | A formal event is appended | An approval's exclusive compare-and-set token |
| Todo message sequence / processed watermark | One Todo | Message append / successful turn commit | Task execution progress |

The Task control record is canonical Orchestrator-owned state outside the immutable Specification. It holds the current Plan pointer, control version, start/terminal decisions, and references to active Replan scheduling freezes, pending review-feedback operations, and acceptance. `current_task_state` projects this record with Node/Attempt/delivery facts. Rebuilding that projection never invents a new control version. This is operational state, not a large semantic summary.

Prepared Replan proposals use the Task control version, not the raw event sequence, as their compare-and-set basis. Recording a proposal or its confirmation must not make that proposal stale through its own bookkeeping. Unrelated log chunks, notification reads, and remote check refreshes do not change control version; effective result changes do. Acceptance additionally binds the result digest and delivery item versions.

Plan membership, immutable Node definitions, mutable Node lifecycle, and append-only activation completion records are distinct storage responsibilities even if implementation groups some tables. Historical Plan views resolve results at the selected historical activation/event sequence; they must not show today's Node status as if it were the old Plan's historical outcome.

Use database uniqueness/transaction guards for: `(task_id, plan_revision)`, `(task_id, event_sequence)`, `(node_id, activation)` successful completion, scoped command request IDs, one committed Planner reply per source Owner message, one Task per source proposal, and one active execution claim per owner. Workspace resource identity is unique per `(task_id, resource_id)`; delivery item identity is unique per modified Task repository. A failed transaction cannot consume confirmation while losing its associated command admission.

Background jobs carry durable source IDs and may be delivered more than once. Commit lifecycle facts and dispatch intent together (transactional outbox), or make the job fully reconstructable from canonical unfinished records. A process crash between database commit and wake-up must not strand work. Recovery uses the same module command boundaries and guards as live execution; it does not repair history by manually updating projection rows.

## References, durability, and extension-safe schema

Formal Artifact content must be captured as immutable content or an immutable managed-content reference before publication succeeds. A bare Runner-local file path is not a durable formal Artifact. Generic external URLs may remain references but are labeled external and mutable; they are not represented as archived content. Managed references carry a content digest, size, and media type; storage backend and retrieval location are infrastructure details. V1 may use database-backed content without introducing object storage.

Logs have distinct local-spool and server-acknowledged cursors. Runner reconnect resends unacknowledged records without duplicating them. Disk pressure pauses new dispatch and surfaces attention; it does not silently claim full retention while dropping records. Artifact/history availability after local workspace cleanup follows the managed-content reference, not a stale path. Loss of unuploaded logs or local Git objects on permanent Runner-disk loss remains within the documented V1 limitation.

Keep multiplicity in the schema from Stage A: Project-resource and Project-Role associations, Plan membership/dependencies, per-owner Attempts, per-Runner Runtime Registry records, per-Task-repository Workspaces, and delivery item collections. Stage limits belong in validation/configuration, never in single global workspace/runtime variables, singleton database constraints, or a Task-level `pr_url` used as the sole delivery record. IDs are opaque globally unique identifiers; filesystem paths, PIDs, runtime session handles, and display names are not domain IDs.

Database constraints and operation receipts serialize control decisions; they cannot atomically roll back remote or local side effects. Completion admission, cancellation, and invalidation share an explicit ordering boundary. If cancellation/invalidation wins before a completion operation starts integration, abort integration and preserve the private result. If integration is already in progress, settle it before exposing a new workspace base; the cancelled/invalidated activation never gains current completion evidence and no downstream work unlocks from it. Record any retained integrated code truthfully as corrective-work input. Task cancellation remains immediate for authority and scheduling, while cleanup/reconciliation may continue.

Multiple backend workers may use the same primary database without acquiring independent lifecycle authority. Claims, dispatch and workspace/delivery operation ownership require transactional guards; in-memory locks may optimize but never establish correctness. Operation takeover also requires reconciliation at the side-effect host/provider, not just expiry of a database lease.
