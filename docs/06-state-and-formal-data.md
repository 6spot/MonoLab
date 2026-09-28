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
owner_auth                       # sign-in records; mechanism chosen at setup
planner_settings                 # Owner Planner Guidance, Planner Execution Policy
global_execution_policy

projects
project_resources                # including resource delivery settings
roles
project_roles

todos
todo_discussion_messages
todo_working_requirement_state

execution_tasks
specification_revisions          # immutable requirement text, parent, source and authorization
task_messages                    # ordered durable Task Conversation
task_guidance                    # scoped instructions and supersession history
task_controls                    # Orchestrator control record per Task
execution_plans
plan_nodes                       # per-revision membership and immutable Node definitions
nodes                            # stable Task-owned identity and mutable lifecycle
node_activations                 # append-only activation and completion records
artifacts
managed_content                  # immutable Artifact content referenced by digest
task_events
owner_decisions                  # feedback, blocker/issue answers, dismissals, withdrawals
```

`Original Capture` belongs to Todo itself unless implementation needs a separate immutable record. Do not create a separate table merely because the UI renders it as a distinct block.

Task identity is stable; `specification_revisions` are immutable. The effective revision is selected by `task_controls.current_specification_revision_id`, never by a mutable duplicate specification field. Execution Plan revisions are immutable. Nodes have stable Task-owned identities; each Plan revision owns immutable graph membership and definitions referencing those identities. Mutable Node lifecycle and activation facts are separate from immutable Plan structure.

Discussion messages are append-only conversation history. The Todo module also records explicit Owner withdrawal dispositions against source messages, without deleting or modifying their original content. A turn resolves once by committed reply or withdrawal; commit that resolution, processed-watermark advancement, command receipt and next-turn outbox intent atomically. Late Planner output cannot override withdrawal, and a new Attempt waits for old process ownership to settle. Working Requirement State is mutable/rebuildable semantic state and may be stored as one current record per Todo; withdrawal alone does not rewrite it.

### Command and control records

```text
command_receipts                 # scoped request ID, payload digest, recorded result
authorization_receipts           # exact-content Owner confirmations
task_input_operations            # input batch/watermark, routing, unresolved attention
requirement_change_operations    # authorized proposal, impact, settlement and publication
review_feedback_operations       # routing basis, status, single resolution
replan_requests                  # freeze, prepared proposal payload, resolution
outbox                           # durable dispatch and background intents
notifications                    # durable in-app notifications and read state
```

These records make commands idempotent and recovery reconstructable. They are not new Task/Node lifecycles; the Task control record references the open ones.

### Runtime / infrastructure records

```text
runners                          # identity, enrollment, connection incarnation, capacity, host facts
runtime_registry
attempts
runtime_sessions?                # only if adapter/session recovery needs persistence
execution_logs
attempt_input_receipts           # exact input/recipient/generation, delivery and uncertainty
workspace_records                # logical workspace: host, incarnation, generation, base/target, finalized revision
workspace_operations             # recoverable completion/integration stages
delivery_items                   # per modified Task repository: branch, review request, published head and candidate manifest
delivery_operations              # preparation, push and merge progress
provider_integrations            # GitHub App installation metadata; keys stay in service secret storage
```

Do not force every infrastructure concept into a first-class table. For example, Runtime Registry may be persisted or reconstructed from Runner discovery depending on implementation needs. Workspace paths and worktree bookkeeping live in the Runner's local journal; the control database keeps only the location-independent workspace records that control APIs address.

The Runner journal (module 11) holds dispatch/start intents, supervision handles, local operation stages, log-spool cursors, and immutable CLI request envelopes with original principal/scope, request ID, payload/content references, digest and schema/version guards. Local request persistence and send uncertainty are distinct from backend receipts; only the backend establishes command admission. Runner recovery may read receipts for its recorded dispatches but cannot replay a terminal Attempt’s unaccepted command. Retain unresolved request data through reconciliation without persisting bearer credentials. It is reconciliation bookkeeping, never a second copy of Task/Node truth.

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

- Project owns Project / Resource association and resource delivery settings;
- Role Library owns Role profiles;
- Todo owns capture, Discussion, and Working Requirement State;
- Planner owns Planner Guidance and Planner Execution Policy;
- Execution Task owns stable Task identity, immutable Specification revisions, Task messages/guidance, Plan / Node definition / Artifact / managed content / Event / Owner decision records;
- Orchestrator owns deterministic lifecycle mutations, Task control records, Node lifecycle and activations, Replan requests, input/change/review-feedback operations, and Current Task State projection updates;
- the command boundary owns command and authorization receipts; outbox rows belong to the module whose transition wrote them;
- Runtime owns Runner / Runtime / Global Execution Policy / Attempt / Session / Execution Log infrastructure;
- Workspace Manager owns workspace records, workspace operations, and local workspace/worktree/Git bookkeeping;
- Delivery owns delivery items, delivery operation state, and provider integration metadata;
- notifications are derived from formal events and own only their read/resolved state;
- Owner access owns sign-in records.

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
- PLANNING_ISSUE_RAISED
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

- readiness for review causes local preparation and, when configured, automatic branch publication / provider review-request creation;
- Task remains REVIEW while the Owner reviews and while delivery prerequisites are being evaluated;
- Owner Accept starts/continues the final delivery operation;
- GitHub items finalize on confirmed merge; plain-Git items finalize only after exact-version Owner acceptance and verified branch publication are recorded under current guards. A preparation push alone is not final delivery;
- TASK_COMPLETED requires every delivery item to be finalized;
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

Persist Owner authorization receipts, Task-scoped review feedback/blocker answers, and operation recovery records under their owning modules. They are not new user-facing lifecycles. Task event sequence plus durable control facts must reconstruct Start/Stop, unresolved Replan and pending review-feedback operations, open planning issues, effective Specification/Plan, conversation input dispositions, requirement publication, invalidation, acceptance, and cancellation; do not infer them from log prose or timestamps alone.

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
| Dismiss Replan | REPLAN_REQUIRED, unresolved request, no publication admitted | Resolve request/discard proposal; revoke request-bound Planner execution and reconcile; clear freeze and re-derive status; preserve originating feedback through a new routing operation in REVIEW |
| Request Changes | REVIEW, no finalized delivery item or unresolved merge | Remain REVIEW; revoke acceptance and create feedback-routing operation that blocks new acceptance/merge |
| Review routing to Rework | REVIEW, current unresolved feedback operation, unchanged basis | Resolve operation and apply Rework atomically; derive RUNNING from runnable work, never REPLAN_REQUIRED |
| Review routing to Replan | REVIEW, current unresolved feedback operation, unchanged basis, graph insufficient | Resolve operation and record formal Replan request atomically; REPLAN_REQUIRED |
| Review routing waits/fails | Unresolved feedback operation | Remain REVIEW; operation status/attention and Retry, acceptance still blocked |
| Raise planning issue | Current authorized Execution Task Planner during Task conversation/change routing, initial planning, Replan preparation, or review routing | Record issue and attention; close the Planner's mutation phase; Task state unchanged |
| Withdraw feedback | Unresolved feedback operation | Resolve operation as withdrawn; revoke its Planner Attempt; remain REVIEW; acceptance admissible with a new receipt |
| All work complete | No freeze or unsettled local operation | REVIEW; automatic preparation waits for pre-acceptance input/change guards |
| Accept | REVIEW, no unresolved input/change/feedback guard, exact Specification/Plan/result receipt | Atomically admit a frozen delivery batch and input cutoff; COMPLETED only after success; later chat does not block it |
| Cancel | Nonterminal Task | Revoke execution/acceptance; CANCELLED; reconcile outstanding effects; close open review requests for undelivered items |

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
| Feedback changes requirements or is ambiguous | Pending requirement proposal or planning issue in REVIEW; acceptance stays blocked until the linked input/change/feedback operations resolve |
| Owner withdraws feedback while Planner is routing | One resolution wins; a late Planner outcome is rejected; acceptance needs a new receipt |
| Owner dismisses a Replan request | No Plan revision; old queued/running Planner work revoked; discarded proposal and late outcomes rejected; requester resumes after handoff/capacity guards |
| Owner dismisses a review-originated Replan | Return to REVIEW with original feedback still effective and a new routing operation; acceptance remains blocked |
| Dismissal races with Planner publication or issue reporting | One guarded outcome wins; no stale mutation or overlapping Planner process |
| Internal history adds then removes sensitive content | Exported clean result has equal tree but no private intermediate commit ancestry |
| Candidate history contains a forbidden intermediate file later deleted | Publication-range scan catches it even when net diff is clean |
| Rework repairs an unpushed candidate | New candidate uses last published/base parent; rejected candidate is never published; published history is not rewritten |
| Push response is lost before candidate replacement | Reconcile remote head first; never treat an uncertain candidate as unpublished |
| Subsequent delivery exports corrected result | Previous published head remains ancestor; source/delivery trees match; fresh checks/acceptance bind new head |
| Accept races with Request Changes or successful CI refresh | Serialized admission honors pending feedback; CI refresh cannot re-enable acceptance |
| Review-routing outcome is replayed or competes with another outcome | One committed routing decision; no duplicate invalidation or late Replan transition |
| Runtime exits successfully without completing the Node | Node is blocked for Retry, never inferred complete from prose/exit code |
| PR creation response is lost | Reconcile the existing PR; no duplicate PR |
| PR head changes after acceptance | Old acceptance cannot merge new code |
| Second repository merge fails | First merge remains recorded; REVIEW shows partial delivery and retries only remaining work |
| Plain-Git preparation push succeeds before acceptance | REVIEW remains correctable; no finalized delivery item or partial-delivery restriction |
| Owner acceptance races with new input | Input first blocks acceptance; acceptance first attributes the message outside the batch and delivery proceeds |
| Plain-Git finalization receives later chat or explicit Request Changes | Later chat does not block the accepted batch; explicit correction and finalization serialize; a preparation push alone is not final delivery |
| Browser disconnects and reconnects | Execution continues; current attention and deduplicated notifications reload |

Delivery operation records persist the candidate manifest (source workspace revision, result tree, delivery head, parent set), last reconciled published head, scan version/findings and any scoped overrides. Workspace revisions and delivery commits have distinct identities. Candidate replacement retains immutable operation history and cannot change an already-published parent chain. These are Delivery infrastructure records, not another Task state machine.

## Independent versions and atomic ownership

| Identifier | Scope | Advances when | Does not mean |
| --- | --- | --- | --- |
| Task control version | One Task's canonical control record | Scheduling, effective Plan, activation, blocker, review or acceptance control changes | UI refresh count or log offset |
| Node activation | One durable Node | Existing work is invalidated for Rework | Runtime retry count |
| Attempt fencing generation | One execution owner | A new Attempt claims execution | New semantic work |
| Task event sequence | One Task's formal history | A formal event is appended | An approval's exclusive compare-and-set token |
| Todo message sequence / processed watermark | One Todo | Message append / committed reply or explicit Owner withdrawal | Task execution progress |

The Task control record is canonical Orchestrator-owned state outside the immutable Specification. It holds the current Specification and Plan pointers, input sequence/processed watermark, control version, start/terminal decisions, and references to active Replan scheduling freezes, pending input/change/review-feedback operations, and acceptance. `current_task_state` projects this record with Node/Attempt/delivery facts. Rebuilding that projection never invents a new control version. This is operational state, not a large semantic summary.

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

## Requirement revision publication and input consistency

Task creation atomically writes its initial Specification revision and control pointer. Subsequent revisions record their parent, exact content digest, source message IDs and Owner receipt. Plan revisions and activation/Attempt launch records retain the Specification basis used to produce them. Retaining a Plan across requirement revisions records explicit applicability; never rewrite its historical creation basis.

Input operations own source sequence, processed watermark, routing outcome and unresolved follow-up references. A processed message may still have a pending change or delivery. Guidance owns scope and supersession; Runtime owns transport receipts. Existing review-feedback operations are referenced by conversation routing rather than duplicated. Every Owner-blocking operation has Retry and an explicit answer/withdrawal or cancellation path; withdrawal fences its associated Planner work and reconciles ownership.

Admission of an authorized requirement change serializes with completion, acceptance, Plan publication and delivery dispatch using Task control plus relevant activation/result versions. It persists the proposal, impact, receipt, scheduling guards and recovery intent before any external effect. Physical settlement occurs outside the database transaction under the admitted operation identity. Task status does not become REPLAN_REQUIRED unless graph insufficiency has actually been established.

After settlement, one transaction validates the admitted basis and newer input dispositions, switches the effective Specification pointer (and confirmed Plan pointer when necessary), records evidence applicability/invalidation, updates affected activations, resolves linked input/feedback operations, increments control version, emits formal events and writes scheduling outbox work. An old completion may settle as historical evidence but cannot become current evidence for a superseded activation. If the basis changed, preserve completed settlement work and re-evaluate the proposal/impact; do not blindly retry publication. Changed requirement text or graph needs fresh exact-content authorization.

A requirement-only change reuses the current Plan. Completed affected Nodes and descendants are reactivated; unfinished affected Attempts are fenced and continued after writer reconciliation. Explicitly unaffected activations may remain current through a recorded carry-forward decision binding old and new Specification versions and the evidence identity. No historical result is relabeled as if it was produced under the new revision. If no current result remains valid, ordinary Node state derivation leads to RUNNING; if all required evidence remains applicable, REVIEW can remain. A pre-start Task remains PLANNING, and an Owner-stopped Task does not resume automatically.

| Operation | Guard | Effect |
| --- | --- | --- |
| Submit Task message | Authenticated Owner, matching Task | Persist input and queue Planner; before acceptance guard admission until classified; after acceptance record nonblocking conversation attribution; no Task state transition |
| Commit question reply | Current Planner/input basis | Reply and resolve that input guard; no evidence invalidation |
| Route guidance | Current scope/basis | Persist guidance and recipient intents; any correction keeps acceptance guarded until addressed |
| Prepare requirement proposal | Current Specification/Plan and input basis | Pending exact proposal; no effective revision change |
| Admit authorized change | Matching receipt, no competing publication, active accepted delivery or unresolved delivery outcome | Persist settlement operation, freeze affected dispatch |
| Publish change with sufficient graph | Settlement and basis validated | Atomically switch Specification, carry forward/invalidate evidence; derive normal state |
| Change needs graph revision | Actual graph insufficiency | REPLAN_REQUIRED; publish Specification and confirmed Plan atomically after settlement |
| Withdraw unpublished change | No committed publication; reconcile admitted effects | Keep prior Specification; resolve linked input only as explicitly authorized; fresh acceptance required if revoked |

Required race/recovery cases: two clients confirming one proposal; new message during Planner reply/change settlement; completion racing guidance or revision; backend crash between writer stop and revision publication; lost provider supplement acknowledgement; stale Attempt completion after publication; Owner Stop during change; initial planning on an obsolete revision; Replan dismissal with an unpublished requirement proposal; terminal Task messages; acceptance/merge racing new Owner input. Assert one effective revision, no lost input, no stale evidence acceptance, no duplicate dispatch and no premature writer handoff. These are implementation gates, not claims of completed tests.

### Operation guard ownership and settlement exits

Acceptance and scheduling guards reference the operation that owns them; they are not a single mutable Task boolean. Resolving one operation cannot clear another's input, correction, Replan, Owner-stop or external blocker. Persist cross-references when input routes to feedback, requirement change, or guidance obligations. Terminalize the originating obligation only when its successor has durably taken responsibility or the Owner explicitly withdraws it; successor guards remain effective.

An admitted change owns its settlement journal and freeze. Publication, withdrawal and cancellation serialize on that operation. Withdrawal waits for admitted workspace/provider effects to reconcile, then releases only its own freeze, keeps the previous Specification, and makes interrupted unfinished work eligible under that previous basis after old writers stop. Completed evidence invalidated by real effects is not resurrected; retain correction attention or reactivate the necessary work. Owner Stop and independent blockers still prevent dispatch. A lost Runner or uncertain remote outcome keeps settlement pending and visible; Retry reconciles, it does not abandon ownership.

If a requirement change and Replan are linked, withdrawing the change does not dismiss an independently raised graph insufficiency. For a request created solely for the withdrawn proposal, the Owner resolution must explicitly include dismissal of that linked request; otherwise the UI continues to show it. Dismissal alone leaves the requirement input unresolved. Repeated resolutions return their receipts; races cannot publish and withdraw the same operation.

The admitted operation advances its own expected control version transactionally as it records settlement progress. Its own version increments do not invalidate itself. External changes to relevant activation/result facts or new input require re-evaluation; unrelated heartbeat/log updates do not. A progress-only reply can commit against its captured observation without taking publication authority. This separates stale-action rejection from starvation of ordinary conversation.

Guidance obligations persist separately from delivery receipts and identify source input, recipient Node/activation, eventual handling evidence or withdrawal/supersession. A Node completion settles handled obligations with completion evidence atomically. Rework/revision invalidation also invalidates reliance on that handling evidence where affected; future Attempts receive still-applicable guidance. The acceptance query checks unresolved obligations even if all Nodes currently display COMPLETED.

### Accepted delivery input cutoff

Successful Owner acceptance commits the receipt consumption, delivery-operation identity, frozen Specification/Plan/result manifest, input cutoff and outbox intent together. This operation is infrastructure within the existing Delivery subsystem, not a new Task lifecycle. Message admission locks the same Task control boundary: a prior unresolved message blocks acceptance; a later message records the accepted operation it follows and has no guard for that batch. The server, not the client or Planner, assigns this disposition.

Delivery workers validate their operation authority, exact result/item versions and provider prerequisites rather than requiring equality with a global control/message version that later chat advances. New messages, reply failure, restart and partial delivery do not revoke an accepted batch. No-change/non-Git acceptance may complete in the same transaction; racing later input then belongs to terminal conversation. Existing pre-acceptance guidance/change obligations must be resolved before acceptance and cannot be silently classified as later input.

Explicit Request Changes can revoke an entirely undelivered batch under module 04's guards. Commit revocation and cancellation of pending dispatch atomically; settle existing effects, then reconsider the later messages as ordinary pending obligations on the unfinished Task without duplicating replies or losing their earlier attribution. If result drift invalidates acceptance before any item finalizes, recovery likewise closes the old batch and restores unresolved later requests to the pre-acceptance gate before allowing replacement acceptance. After any item finalizes, this reclassification/replacement path is forbidden: reconcile and recover the original accepted remainder where possible, otherwise explicitly cancel it; never accept a changed remainder or fold later requirements into this Task. A transient provider failure retains the same accepted operation and does not perform reclassification. Cancel Task remains terminal; later chat never reopens delivered work.

Required assertions: both orders of message/acceptance admission; new chat before the first push, while CI waits and between repository items; backend restart preserving the cutoff; unavailable Planner not preventing delivery; later chat during plain-Git verification; explicit Request Changes racing finalization; and result drift requiring a fresh acceptance. Completion records the accepted version without claiming later requests were fulfilled.

Task cancellation revokes unpublished proposal eligibility and execution obligations, retaining their cancelled dispositions and history. System reconciliation finishes already-admitted effects before releasing their physical ownership; neither pending input nor change recovery may reopen the Task. Unanswered Owner messages can still receive terminal-Task replies under the conversation-only scope. Successful historical delivery discovered during reconciliation retains the cancellation/delivery reporting rules of module 04.
