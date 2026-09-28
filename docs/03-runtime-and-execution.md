# Runtime & Execution

## Runner Daemon

A Runner Daemon is the persistent execution process on a machine.

Every Runner is the same kind of process. Do not create product-level Runner types such as Cloud Runner, Tokyo Runner, US Runner, or Personal Mac Runner.

Multiple Runners are simply multiple instances of the same daemon running on different machines/locations. Differences such as name, region/location, machine metadata, installed CLIs, current availability, and capacity are instance facts, not separate abstractions.

It is responsible for deterministic runtime infrastructure: discover installed Agent CLIs, maintain Runtime Registry, heartbeat, start/stop execution processes, create/resume runtime sessions, collect execution events/logs, and normalize objective runtime errors.

Clients do not own execution. Web/Mobile may disconnect without affecting running work.

V1 uses one Runner. Runtime execution, Task Workspace, Node worktrees, and local execution state all live on that Runner.

Keep Runner identity explicit in the architecture so future multi-Runner support does not require rewriting Node / Attempt / Runtime boundaries, but do not implement cross-Runner Workspace migration, recovery, or placement in V1.

## Runtime

Runtime identifies an Agent CLI integration, for example Codex, Claude Code, or OpenCode. `runtime_id` is a stable logical integration identifier, independent of a particular machine. A concrete installation is the Runtime Registry record keyed by `(runner_id, runtime_id)`, with its own executable, version, availability, and discovered model/settings facts. V1 supports one discovered installation per such pair.

Runtime is not Role.

Execution Policy refers to the logical `runtime_id`; dispatch resolves a concrete Registry record and records its observed version in Attempt diagnostics. The Registry should store objective facts such as executable, version, availability, runner, and last-seen information. Avoid speculative health/intelligence/cost scores.

## Runtime Adapter

Each CLI is wrapped by a Runtime Adapter.

The core system must not understand provider-specific concepts such as Codex thread IDs or Claude session internals.

Session identifiers are opaque and Runner/installation-scoped. Persist the Runner and Runtime identity with a session handle; an equal handle string on another machine is not the same session. Moving execution to another Runner starts fresh unless an explicit Adapter export/import contract is implemented.

Adapter responsibilities include detect, start/resume, send, interrupt, normalize runtime events, and normalize objective errors.

Typical normalized reasons include QUOTA_EXHAUSTED, AUTH_REQUIRED, RATE_LIMITED, PROCESS_EXITED, RUNTIME_ERROR, and UNKNOWN.

Do not automatically declare an Agent "hung" merely because no output has appeared for a long period. Record factual activity data such as `last_activity_at` and let the Owner stop/switch manually.

## Execution Policy

Planner and each Role may have their own Execution Policy.

Role itself remains runtime-independent.

~~~text
ExecutionPolicy
- default_target
- fallback_targets[]
~~~

Each target is complete:

~~~text
ExecutionTarget
- runtime_id
- runner_id?          # null = Auto placement; set = hard pin to one Runner
- model_id?
- thinking_level?
~~~

Every fallback is its own Execution Target, not merely a runtime ID.

Runner selection is optional:

- `runner_id = null` means Auto placement. The system selects a compatible online Runner that provides the requested Runtime.
- a concrete `runner_id` is a hard placement constraint: that target may run only on the specified Runner.
- if the pinned Runner is unavailable, the target is unavailable. The system must not silently move that same target to another Runner.
- a later fallback target may explicitly name another Runner or return to Auto placement.

Model and thinking level may be absent, meaning "use the Runtime/CLI default".

MonoLab defines a fixed set of common execution configuration fields. Runtime Adapters report which of those common fields they support and the currently discoverable values.

V1 common fields are intentionally small:

- Runtime;
- Runner;
- Model;
- Thinking level.

The UI shows only MonoLab-defined fields that the selected Adapter supports. An Adapter must not inject arbitrary provider-specific configuration controls into the general UI.

This mirrors the useful Multica behavior where model/thinking choices come from the selected tool, while keeping MonoLab's product surface controlled and consistent.

The UI should also allow an Owner to enter a model identifier manually when needed, so unknown/new/provider-specific models do not require a MonoLab release.

A manually entered model is an explicit override. MonoLab may validate format/basic compatibility where possible, but it should not require the model to already exist in a cached discovery list.

If a future option becomes broadly useful, add it deliberately to MonoLab's common schema rather than dynamically exposing every CLI/provider flag.

Do not introduce a separate Runtime Profile layer unless future reuse proves it necessary.

MonoLab never installs Codex, Claude Code, OpenCode, or other coding tools for the Owner. The Runner only discovers and invokes tools that already exist on that machine.

MonoLab also does not own or manage authentication for those coding tools. Login state and credentials remain under the tool/runtime on the Runner machine. MonoLab may report objective availability/startability facts, but it does not store or provision those runtime credentials.

Resolution priority:

~~~text
Owner explicit one-off selection
→ Role / Planner Execution Policy
→ Global Execution Policy
~~~

Explicit one-off selection should not silently fail over unless the Owner allows fallback.

Auto/Policy execution may move through ordered fallbacks when the current Runtime is objectively unable to continue.

Do not score runtimes dynamically by model intelligence, estimated speed, cost, or predicted quota.

Planner work uses the same Execution Policy resolver and ordered fallback behavior as Node execution. If a Planner Runtime actually starts and fails with an objective reason such as quota exhaustion, that Attempt ends accordingly and the next configured fallback may be tried.

A target found unavailable during initial policy resolution is skipped without creating an Attempt. If a target becomes unavailable after a QUEUED Attempt already exists, terminalize that queued record with the factual pre-start reason before resolving a successor; do not silently rewrite its selected target.

Planner availability must not become a dependency of ordinary scheduling after a Plan has been published. Orchestrator continues to unlock and schedule Nodes from an existing Plan without consulting Planner. Planner is required again only for new initial planning, Replan, or Owner review-feedback routing.

If all Planner targets are unavailable during initial planning, the Task remains RUNNING with no Plan and Owner-facing attention. If all Planner targets are unavailable during Replan, the Task remains REPLAN_REQUIRED. Do not add PLANNER_FAILED or PLANNER_RETRYING Task states.

Runtime scheduling may prioritize control work (Todo Planner, initial Plan, Replan) over queued ordinary Node Attempts when capacity becomes available, but must not preempt already-running Runtime executions merely to do so.

Runtime capacity waiting is represented at Attempt level, not Task level. A Task may already be RUNNING while its current Planner or Node Attempt remains QUEUED waiting for an execution slot / compatible Runner capacity.

Do not reintroduce a Task-level QUEUED state for this condition. Attempt QUEUED is an execution scheduling fact; Task RUNNING means the Owner has already started the Task.

Capacity waiting is normal and should not by itself create Owner attention or BLOCKED state. If at least one Attempt is queued but none is currently running, UI may project a lightweight `Queued` / `Waiting for capacity` badge inside the Running surface. If some Attempts are running while others are queued, show normal Running state with an optional queued count/details.

## Runtime capacity and concurrency

Runner capacity stays intentionally simple.

~~~text
Runner
- max_concurrent_attempts
~~~

Current utilization is derived from RUNNING Attempts and unresolved process-termination reservations on that Runner. Do not persist separate authoritative `active_attempts` or `available_slots` counters when they can be rebuilt from Attempt facts.

V1 treats one RUNNING Attempt, or its unresolved process-termination reservation, as one execution slot. Do not introduce CPU/memory/model-weight scoring or predicted work cost.

Planner and Node Attempts share the same Runner capacity. Do not create separate Planner pools, reserved Planner machines, or reserved control-plane slots.

Control work may receive the next free slot before ordinary Node work:

- Todo Planner;
- initial Execution Task Planner;
- Replan Planner;

then ordinary Node Attempts.

Within the same class, use oldest eligible work first. This priority affects only which QUEUED Attempt receives the next free slot; it must not preempt already-running Attempts.

### Capacity waiting versus fallback

A compatible Runtime being busy is not runtime failure.

If the requested Runtime/Runner is healthy and executable but all compatible slots are occupied, keep the Attempt QUEUED and wait. Do not fall back merely because capacity is full.

Fallback is for an objectively unavailable/failed target such as missing Runtime, unavailable pinned Runner, auth/quota/runtime/process failure, or other normalized inability to continue.

~~~text
capacity full
→ wait in Attempt.QUEUED

target unavailable / execution failed
→ evaluate ordered fallback
~~~

### Runner placement in V1

V1 has a single Runner. `runner_id` remains part of ExecutionTarget/Attempt facts for architectural continuity and diagnostics, but Auto resolves to that one configured Runner.

Do not implement cross-Runner Workspace materialization, Task migration, Runner balancing, or failover in V1.

If the Runner has no free execution slot, the Attempt remains QUEUED. If the Runner is unavailable, work waits for that Runner to return unless the Runtime failure itself can be handled on the same Runner through another installed Runtime.

### Execution ownership and fencing

Dispatch must atomically claim execution ownership. For each Attempt owner (Node, Todo Planner scope, or Execution Task Planner scope), at most one Attempt may be active at a time.

Use a transactional compare-and-set / unique active-owner constraint rather than an in-memory mutex. The claim assigns the concrete Runner and an opaque monotonically increasing fencing generation/token.

Conceptually:

~~~text
QUEUED Attempt
↓ atomic claim
runner_id = runner-b
fencing_generation = 12
status = RUNNING
~~~

A different Runner cannot claim the same owner while generation 12 remains active.

Heartbeat timeout alone must not release this ownership. A lost heartbeat does not prove the Runtime process has stopped, so automatic lock expiry must not create a second live execution.

Before a successor Attempt is allowed to run, the previous Attempt must be formally terminalized or reliably fenced. Starting the successor advances the owner's fencing generation.

Every state-mutating Tool Protocol call from Planner/Agent execution must carry the Attempt identity and its fencing generation. The backend accepts the call only if that Attempt is still the current active execution for the owner. Calls from stale/terminal Attempts are rejected.

This prevents a recovered old Runner from publishing a Plan, completing a Node, publishing an Artifact, or requesting lifecycle changes after a newer Attempt has taken ownership.

The execution claim granularity is the execution owner, not the whole Execution Task. Future independent Nodes may run on different Runners only after Workspace supports the required materialization and integration guarantees. An owner-level claim alone does not make a Node portable; the placement restrictions below still apply.

### Runner loss in V1

V1 does not fail over execution to another Runner.

Runner heartbeat loss is still only a connectivity fact and must not immediately terminalize active Attempts. Stop dispatching new work and wait for the same Runner to reconnect/reconcile.

When the Runner returns:

- if the same Runtime process is still alive and can be reattached, continue the same Attempt;
- if the process is confirmed dead, terminalize that Attempt and apply normal same-Runner Runtime fallback/retry rules;
- if the Runner remains unavailable, the affected work waits rather than migrating to another machine.

Heartbeat/stale thresholds remain infrastructure configuration, not Task/Node states.

## Owner start and initial planning

Creating an Execution Task does not immediately create its Plan or start any Runtime work.

A newly created Task enters PLANNING with `current_plan_id = null`. PLANNING is the Owner-controlled pre-start task library state.

MonoLab must not automatically admit or start a PLANNING Task.

When the Owner explicitly starts the Task:

1. Task transitions PLANNING → RUNNING;
2. MonoLab reads the latest current Project Context, Project Resources, Project-selected Role descriptors, Planner Guidance, and Planner Execution Policy;
3. MonoLab starts the Execution Task Planner through the shared Attempt / Runtime machinery;
4. Planner publishes the initial Plan;
5. Orchestrator derives runnable Nodes and begins normal Node scheduling.

The Task remains RUNNING while its initial Planner is generating the Plan. Do not add a second active `PLANNING` meaning for this runtime phase; PLANNING is reserved for the not-yet-started task state.

Deferring initial Plan creation until Owner Start allows a Task to use Roles and Project configuration added or changed while it was waiting in PLANNING.

Initial planning is a system control operation rather than an Execution Plan Node. Planner and Node Agents reuse the same generic Attempt / Runtime execution machinery.

### Initial planning completion and failure

While `status = RUNNING` and `current_plan_id = null`, the Task is in initial planning.

Initial planning is complete only when `publish_execution_plan()` succeeds and `current_plan_id` is set. A Planner Attempt ending successfully at the Runtime/process level is not sufficient by itself.

Planner Runtime fallback is automatic according to Planner Execution Policy. A target discovered unavailable before Attempt creation is skipped; an already-queued Attempt that becomes unavailable is terminalized with a pre-start reason before choosing a successor. If a Runtime actually starts and then fails, record that Attempt and continue through configured fallbacks when allowed.

If all Planner targets fail or are unavailable, keep the Task RUNNING with `current_plan_id = null` and surface Owner-facing attention. Do not add planner-specific Task states.

Retry does not change Task state. It re-resolves the latest Planner Execution Policy, Runtime availability, Project Context, Project Resources, and Project-selected Roles, then starts a new Planner Attempt.

If the Owner stops the Task before any Plan has been published (`current_plan_id = null`), cancel the active Planner Attempt if present and return the Task to PLANNING. No execution Plan or Node work exists yet, so this is a true return to the pre-start task library state.

Cancel Task is different: cancel any active Planner Attempt and transition the Task to CANCELLED.

Plan validation errors are not Runtime failures. Return deterministic validation errors to the same Planner Session/Attempt so the Planner can correct and republish. Do not trigger Runtime fallback merely because a proposed Plan is structurally invalid.

If a Planner Attempt ends without successfully publishing a Plan, the Task remains RUNNING with no current Plan and surfaces attention/retry rather than advancing execution.

## Orchestrator scheduling

Orchestrator owns deterministic scheduling. Planner defines Plan structure; Agents perform Node work; neither decides the day-to-day runnable set.

A Node is runnable when:

~~~text
node.status == PENDING
AND every depends_on Node is COMPLETED
AND the Task is not in a scheduling-frozen condition such as REPLAN_REQUIRED
~~~

Runnable state is derived and must not be persisted as another Node state or as a `runnable_nodes[]` field.

When formal state changes, Orchestrator recalculates runnable Nodes and starts all runnable Nodes allowed by available execution capacity. Independent Nodes may run in parallel.

Task status is derived from the effective Plan:

- if any Node is RUNNING, or runnable work exists, Task is RUNNING;
- if no Node is running/runnable and at least one required Node is BLOCKED, Task is BLOCKED;
- if an unresolved Replan request or review-feedback routing freeze exists, Task is REPLAN_REQUIRED and no new Nodes are scheduled; this takes precedence over ordinary RUNNING/BLOCKED derivation;
- if all required Nodes in the current effective Plan are COMPLETED and local workspace operations have settled, execution work is finished and Task enters REVIEW while remote preparation proceeds.

When all required Nodes are complete and workspace operations have settled, Planner is not asked whether the Task is done. The system moves the Task to REVIEW with the integrated local result and starts delivery preparation where applicable. Remote preparation failure leaves the Task in REVIEW with an actionable delivery error.

### Rework invalidation

`request_rework(target_node_id, reason)` keeps the current Plan structure but invalidates the target Node and every descendant of that Node in the current Plan.

The target and descendants return to PENDING. Their historical Attempts, Logs, Artifacts, summaries, and Events remain immutable history and are not deleted.

Independent Nodes outside that descendant subgraph are unaffected.

If an invalidated descendant currently has a running Attempt, Orchestrator stops that Attempt, records it as CANCELLED with an objective rework-invalidation reason, and returns the Node to PENDING.

After invalidation, normal dependency scheduling resumes from the target Node. Do not ask AI to decide which descendants are semantically affected; graph descendants are the deterministic invalidation boundary.

### Replan scheduling freeze

`request_replan(reason)` means the collaboration graph itself is insufficient.

Once accepted as an unresolved Replan request:

- do not start any new Nodes from the current Plan;
- do not automatically kill already-running independent Nodes merely because Replan was requested;
- allow already-running work to reach a formal outcome where practical;
- preserve completed work, Artifacts, Events, Logs, and Workspace/Git state.

After Owner confirmation and publication of a new immutable Plan revision, `current_plan_id` changes and Orchestrator recalculates runnable work from that new Plan.

### Blocked recovery

A blocked condition is resumed at Node scope, not Task scope.

When the blocking condition has been resolved, the system/Owner changes the affected Node from BLOCKED back to PENDING. Orchestrator then recalculates runnable work normally. If dependencies are satisfied, the Node starts through a new Attempt.

Do not add a separate Resume Task / Restart Task lifecycle.

Task BLOCKED is only a projection meaning that the current effective Plan has no running/runnable work and at least one required Node is BLOCKED. When a blocked Node returns to runnable work, Task status naturally derives back to RUNNING.

The unblock action is a deterministic system/Owner operation, not an Agent tool call. A stopped Agent cannot unblock itself.

Keep blocker semantics lightweight. `block_node(reason)` carries a human-readable reason; do not introduce a large blocker-type taxonomy merely to model every possible external condition.

### Replan recovery

An Agent-requested REPLAN_REQUIRED is cleared by publishing a new confirmed Plan revision. A review-feedback routing freeze may also be cleared by authorized Rework as defined in Planner & Planning. Do not add a separate Resume Task action.

The recovery path is:

~~~text
request_replan(reason)
→ Task REPLAN_REQUIRED
→ running work and local operations settle
→ Execution Task Planner prepares a replacement graph
→ Owner confirms the concrete proposal
→ system publishes the confirmed Plan revision
→ current_plan_id changes
→ Orchestrator recalculates runnable Nodes
~~~

If the Owner rejects the proposed Replan, retain the scheduling freeze and allow revised planning; the system must not silently clear the request and continue the old Plan as though it were still valid. The Owner may cancel the Task or provide further direction that results in a new planning decision.


## Session boundaries

Runtime Session is an opaque continuation handle owned by the Runtime Adapter. It is infrastructure, not a top-level domain object and not a source of truth.

Session ownership follows the smallest long-lived scope that owns the conversation/execution:

~~~text
Todo
→ Todo Planner Session

Execution Task
→ Execution Task Planner Session

Node
→ execution Agent Session
~~~

Sessions never cross Todo / Execution Task / Node boundaries.

A Todo Planner Session may be resumed across normal Owner messages in that Todo. If it cannot be resumed, MonoLab rebuilds the Planner context from Todo formal data such as Original Capture, Working Requirement State, recent Discussion, and Project Context.

Creating an Execution Task ends the Todo Planner's participation in that execution chain. Planning/Replan uses a separate Execution Task Planner Session and never resumes the Todo Planner Session.

Each Node has its own execution-session continuity. Different Nodes do not share a Runtime Session, even when they use the same Runtime.

For the same Node, a later Attempt may resume the previous Runtime Session when all of the following remain compatible: same Runtime, same execution lineage, resumable session, and no intervening work that makes the old hidden context stale.

If execution switches Runtime, the new Runtime starts a fresh Session. If work then continues under that different Runtime, switching back later should start a fresh Session rather than reviving a stale earlier session.

Rework of the same Node may resume its previous Session when the Runtime is unchanged and the session remains valid. The new Attempt still receives current formal context, current Role instructions, and the Rework reason.

Session loss must never make a Node unrecoverable. MonoLab must be able to start a fresh Session from Task / Project / Node / Role / Artifact / Workspace state.


## Node and Attempt

Node is the durable work unit inside an Execution Plan.

Attempt is one concrete Runtime execution in MonoLab. It is shared infrastructure for both Planner work and Node Agent work.

An Attempt has exactly one execution owner. The owner identifies the scope whose Runtime work is being performed:

~~~text
AttemptOwner
- NODE
- TODO_PLANNER
- EXECUTION_TASK_PLANNER
~~~

Conceptually:

~~~text
Attempt
- id
- owner_type
- owner_id
- runtime_id
- runner_id
- model_id?
- thinking_level?
- session_id?
- status
- end_reason?
- started_at
- ended_at
~~~

`owner_id` refers to the Node, Todo, or Execution Task appropriate to `owner_type`. Do not allow arbitrary combinations of nullable owner IDs.

Node-specific orchestration semantics still belong to Node. Planner Attempts do not become Plan Nodes and do not receive Node state.

A Node may have multiple Attempts:

~~~text
Node
├─ Attempt 1 → Codex → quota exhausted
└─ Attempt 2 → Claude Code → running
~~~

Runtime switching does not change Node identity and does not require Replan.

Attempt state stays small: QUEUED, RUNNING, SUCCEEDED, FAILED, CANCELLED.

Specific causes belong in `end_reason`.

Attempt failure does not mean Node failure.

Client state never participates in Attempt lifecycle. Browser close, mobile disconnect, UI navigation, or client network loss are irrelevant because execution is owned by the backend Runner.

Attempt continuity is determined only by server-side Runtime execution continuity. If the same Runtime execution process/invocation remains alive, it is the same Attempt. If that execution ends and MonoLab must start or resume a Runtime execution again, that is a new Attempt.

## Owner execution controls after Plan publication

Once `current_plan_id != null`, Task-level PLANNING is no longer reusable because formal execution has already begun.

### Cancel Task

Cancel Task is the Task-level terminal action.

On cancellation:

- cancel active Planner/Node Attempts;
- cancel queued Attempts for that Task;
- stop new Node scheduling;
- transition unfinished Nodes to CANCELLED as appropriate;
- transition the Task to CANCELLED;
- preserve completed Attempts, Logs, Artifacts, Events, and Workspace/Git history.

Cancellation must not immediately destroy Task Workspace or Node worktree data as part of the state transition. Physical cleanup is a separate retention/infrastructure concern.

### Stop Node

Stop is Node-scoped after a Plan exists. Stopping a running Node cancels its active Attempt with an objective Owner-stopped end reason and moves the Node to BLOCKED so Orchestrator does not immediately restart it.

Other independent Nodes continue normally. Task becomes BLOCKED only if no other running/runnable work remains and the stopped Node (or another required Node) prevents further progress.

Owner Continue resolves this manual blocker by moving the same Node BLOCKED → PENDING. Normal dependency scheduling then starts a new Attempt. Do not add PAUSED / STOPPED / SUSPENDED Node states.

V1 does not need a separate whole-Task pause lifecycle. If whole-Task pause is later required, model it explicitly rather than overloading PLANNING or BLOCKED.

### Switch execution target

Switch Runtime / Runner / Model / Thinking is Node-scoped and keeps the same Node and Plan.

First validate the proposed target against Runtime compatibility and Workspace locality. Reject unsupported Runner movement before stopping the current Attempt. For an eligible target, end the current Attempt (for example CANCELLED with `OWNER_SWITCHED_RUNTIME`) and create a queued Attempt using the explicit target. Dispatch waits for old writers to stop and capacity to become available. Node remains RUNNING throughout the handoff.

Any change to Runtime, Runner, Model, or Thinking creates a new Attempt so each Attempt has one stable concrete execution target.

Switching Runtime creates a fresh Runtime Session. Do not transfer an opaque provider Session across runtimes. Preserve the same Node Workspace state so the new Runtime can continue from the actual code/files already produced.

Automatic fallback and manual switching share the same execution path after target selection: new Attempt, current formal context, existing Node Workspace, Runtime Adapter start/resume rules.

## Exhaustion, incomplete execution, and bounded recovery

If a Node Attempt exits without a successful lifecycle command, process success alone never completes the Node. An admitted completion operation takes precedence: settle that operation before interpreting process exit or considering fallback. Record the actual Attempt outcome and surface the missing formal outcome. An objective Runtime failure may advance through ordered fallback targets once; an otherwise successful exit without a lifecycle command blocks the Node for Owner Retry.

If no allowed target remains, Orchestrator sets the Node BLOCKED with the factual failure reference. This is a system operation, not an Agent `block_node` call. Retry resolves current policy and returns the same Node to PENDING. Healthy capacity waiting remains QUEUED and does not consume retry budget.

Automatic recovery must be bounded. V1 permits one pass through an ordered fallback list per activation/retry and at most one automatic retry after an integration conflict; repeated conflicts block the Node for Owner action. Automatic Agent-requested Rework is limited to three requests per Task between explicit Owner Rework-limit resets, after which the requester is blocked with the proposed request preserved for review. These are deterministic safety limits, not runtime scoring or silence timeouts.

Claiming a Runner slot and claiming the Attempt owner must happen in one serialized database transaction, including the capacity check. Independent owner claims must not oversubscribe a Runner. Dispatch/start commands carry stable IDs so Runner reconnect or redelivery does not spawn duplicate processes. Node RUNNING includes a queued Attempt already admitted for that Node.

Logical cancellation revokes tool authority immediately, but does not establish that a process stopped. Runner must terminate or isolate the entire process tree before reusing its writable workspace or releasing its execution slot. Until acknowledged, the cancellation/cleanup operation remains unresolved and its slot remains reserved; utilization counts unresolved process ownership as well as RUNNING Attempts. No new execution may write the same workspace merely because the old Attempt is terminal in the database.

## Activation and invalidation ordering

A Node has a monotonically increasing activation generation. Rework advances it for the target and every descendant, invalidates their current outputs, revokes their queued/running Attempts, and records the reason in one database transaction. Fallback and ordinary retries stay in the same activation; Attempt fencing remains a separate execution-ownership generation.

Do not dispatch replacement work until affected process trees are stopped and pending workspace operations are reconciled. Completion and invalidation serialize admission against the same Task orchestration version. If completion already settled, invalidate its evidence; if invalidation wins, reject a new completion. An already-admitted local operation must still reconcile any in-flight side effects under the cancellation/invalidation ordering contract in State & Formal Data. Rework also revokes pending delivery acceptance.

At most one formal workspace completion operation per Node activation may succeed. A frozen completion already in recovery is reconciled before deciding to rerun Agent work.

A recoverable completion operation keeps its Node RUNNING with a recovery indicator, even after its Runtime has stopped. On unrecoverable finalization failure, block the Node with the operation reference. Retry first reconciles any partial integration and then either finishes the same operation or starts a new Attempt; it never reruns against an unresolved partial workspace. Successful system-directed process termination for completion is not a Runtime failure that triggers fallback.

## Session compatibility is checked before resume

A Runtime session is an optimization over canonical context. Same Runtime and owner alone do not establish compatibility. Context Builder records an Attempt context fingerprint covering Project association/context, Role instructions or Planner guidance, fixed protocol version, effective Plan/activation where applicable, relevant formal inputs, and workspace lineage. This is execution metadata, not a Role revision or Plan snapshot.

Resume only if the Adapter can inject the current authoritative context without retaining conflicting old instructions or stale workspace assumptions. If a fingerprint change cannot be reconciled by a documented Adapter capability, start a fresh session. Project reassignment, Runtime switching after intervening work, and incompatible workspace lineage always start fresh sessions. A fresh session must not lose committed Discussion replies, review feedback, blocker answers, or current completion evidence.

Planner Attempts that commit Discussion, publish the initial Plan, prepare a Replan proposal, or apply review Rework have achieved their phase-specific formal outcome. Persist that outcome before releasing their owner claim. A subsequent process exit cannot schedule fallback for an already-committed phase. If exit occurs without the phase's outcome, leave the enclosing turn/Task operation retryable with attention; never infer an outcome from text.

Runner directly starts the Owner-installed host CLI under its configured execution account, using existing CLI authentication. Runtime processes start in assigned scratch space before a repository is opened. `open_workspace` lazily materializes and returns the assigned host directory or Git worktree; it does not migrate or restart the Runtime process. Native permission/sandbox settings, where supported, must permit those assigned paths. Scratch files are not formal outputs unless published or included in finalized workspace results. Container execution and execution images are not V1 requirements.

## Control service and Runner boundary

The backend control service owns canonical Task/Node/Attempt claims, command receipts, dispatch intent, and delivery authorization in the primary database. Runner owns operating-system processes, local workspace materializations, and a durable journal of local effects. It reports facts through authenticated service interfaces; it never needs direct database access or permission to advance Task/Node lifecycle itself. Co-location in V1 must not introduce direct process handles or filesystem paths into the control service's domain APIs.

Dispatch contains stable IDs, the concrete Runner and its current authenticated connection incarnation, Attempt owner/fencing, resolved target, and versioned context references. A Runner verifies that a dispatch is still authorized before starting it. Delayed Start whose authority has already been revoked must be rejected even if the same command was once valid. If cancellation races after start authorization but before process acknowledgement, treat the start as potentially in flight, retain the process reservation, and reconcile/terminate it; do not claim the process never started. The local supervisor serializes Start/Stop for a dispatch identity and retains a cancellation tombstone so a later replay cannot restart it. Duplicate dispatch reconciles the existing supervised process or returns the recorded outcome, rather than spawning again.

Runner identity survives ordinary daemon restart. Its connection incarnation changes on reconnect/re-registration to fence old daemon control channels; this is distinct from Node activation and Attempt fencing. Reconnect must reconcile already-running supervised processes before accepting new starts. A PID alone is not process identity: use dispatch/Attempt identity plus a supervisor handle or process birth identity to avoid PID reuse. The implementation must close the crash window between process creation and acknowledgement through discoverable supervision and durable start intent. If it cannot establish whether a process exists, hold the claim and expose recovery rather than starting a duplicate.

When the control connection is lost, an already-running Runtime may continue local computation, but no new dispatch or formal lifecycle mutation is authorized offline. The Runner may spool log data and perform safe process termination; accepted system operations reconcile by operation identity on reconnect. Do not queue unaccepted Agent mutations and later apply them as if the old authority were still current. Agent tool calls report unavailable/retryable control access until their current claim can be checked.

## Placement includes workspace locality

A compatible placement must satisfy Runtime/settings support, explicit Runner pin, required execution isolation, and access to the existing workspace lineage, as well as capacity. Capacity-full is ordinary queueing only after these compatibility constraints pass. A healthy CLI on another machine is not a usable fallback if the work exists only on the original Runner.

V1 resolves to its sole Runner. The first future multi-Runner milestone places different Tasks on different Runners while keeping all Node execution and repository work for a given Task on one workspace host. Reserve this host atomically before the first Node dispatch, even though repository materialization remains lazy. Store that reservation as Workspace infrastructure metadata, not in the immutable Task Specification or a Task resource binding. All repository workspaces subsequently opened by the Task use that host. Task/Todo Planner work without repository access may execute elsewhere using canonical context and fresh sessions.

A pinned target incompatible with the existing host is unavailable for that work. Ordered fallback may choose a compatible Runtime on the same host; it must not silently clone a repository elsewhere and lose private edits or unpushed integrated commits. With no compatible target, surface a locality/availability reason. Owner target switching obeys the same rule and must fail before stopping a healthy current execution when transfer is unsupported.

Reserve separate future milestones for (1) multiple Runners serving separate Tasks, (2) explicit quiescent workspace transfer, and (3) same-Task execution across Runners. They do not require new Task/Node states, but each requires its own Workspace transport and failure-recovery implementation before enabling the scheduler behavior. Cross-Runner failover is never inferred solely from heartbeat timeout.
