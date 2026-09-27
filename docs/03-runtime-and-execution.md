# Runtime & Execution

## Runner Daemon

A Runner Daemon is the persistent execution process on a machine.

Every Runner is the same kind of process. Do not create product-level Runner types such as Cloud Runner, Tokyo Runner, US Runner, or Personal Mac Runner.

Multiple Runners are simply multiple instances of the same daemon running on different machines/locations. Differences such as name, region/location, machine metadata, installed CLIs, current availability, and capacity are instance facts, not separate abstractions.

It is responsible for deterministic runtime infrastructure: discover installed Agent CLIs, maintain Runtime Registry, heartbeat, start/stop execution processes, create/resume runtime sessions, collect execution events/logs, and normalize objective runtime errors.

Clients do not own execution. Web/Mobile may disconnect without affecting running work.

V1 may operate with a single Runner, but placement must not be hard-coded to a single-machine architecture. When placement is Auto, the system should prefer to keep an Execution Task on the Runner where its Task Workspace has already been created. This task-level stickiness avoids unnecessary Workspace migration. Explicit Runner pinning overrides Auto placement.

## Runtime

Runtime is a concrete Agent CLI available on a Runner, for example Codex, Claude Code, or OpenCode.

Runtime is not Role.

The Registry should store objective facts such as executable, version, availability, runner, and last-seen information. Avoid speculative health/intelligence/cost scores.

## Runtime Adapter

Each CLI is wrapped by a Runtime Adapter.

The core system must not understand provider-specific concepts such as Codex thread IDs or Claude session internals.

Session identifiers are opaque.

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

An unavailable target discovered before execution starts does not create an Attempt; the resolver simply evaluates the next target.

Planner availability must not become a dependency of ordinary scheduling after a Plan has been published. Orchestrator continues to unlock and schedule Nodes from an existing Plan without consulting Planner. Planner is required again only for new initial planning or Replan.

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

Current utilization is derived from Attempts actually RUNNING on that Runner. Do not persist separate authoritative `active_attempts` or `available_slots` counters when they can be rebuilt from Attempt facts.

V1 treats one RUNNING Attempt as one execution slot. Do not introduce CPU/memory/model-weight scoring or predicted work cost.

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

### Auto Runner placement

For `runner_id = null` (Auto), Runner placement is resolved when the Attempt can actually be dispatched rather than permanently binding a queued Attempt too early.

Candidate selection is deterministic:

1. Runner is online;
2. requested Runtime is available there;
3. Workspace Manager confirms required Task/Node workspace state can be safely provided there;
4. Runner has an available execution slot.

Prefer the Runner that already owns the Task Workspace when it remains a valid candidate. If another compatible Runner can safely provide the required workspace state and becomes available first, Auto placement may use it.

If the workspace cannot safely move/materialize elsewhere, other Runners are not valid candidates and the Attempt waits for the compatible Runner rather than silently changing execution semantics.

For Auto placement, a QUEUED Attempt may keep `runner_id = null` until dispatch. At dispatch, set the concrete Runner and keep that Runner fixed for the lifetime of that Attempt.

For an explicitly pinned target, the queued Attempt is bound to that Runner and waits only for that Runner. Switching Runner always ends the current Attempt and creates another.


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

Planner Runtime fallback is automatic according to Planner Execution Policy. A target discovered unavailable before Runtime execution starts is skipped without creating an Attempt. If a Runtime actually starts and then fails, record that Attempt and continue through configured fallbacks when allowed.

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
- if an unresolved Replan request exists, Task is REPLAN_REQUIRED and no new Nodes are scheduled;
- if all required Nodes in the current effective Plan are COMPLETED, execution work is finished and the system prepares delivery/review.

When all required Nodes are complete, Planner is not asked whether the Task is done. The system deterministically finalizes the Task Workspace, prepares delivery where applicable, and moves the Task to REVIEW.

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

REPLAN_REQUIRED is cleared by publishing a new confirmed Plan revision. Do not add a separate Resume Task action.

The recovery path is:

~~~text
request_replan(reason)
→ Task REPLAN_REQUIRED
→ Owner confirms Replan
→ Execution Task Planner publishes new Plan revision
→ current_plan_id changes
→ Orchestrator recalculates runnable Nodes
~~~

If the Owner does not want to proceed with a requested Replan, the system must not silently clear the request and continue the old Plan as though it were still valid. The Owner may cancel the Task or provide further direction that results in a new planning decision.


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

Cancel Task is the Task-level terminal action. Stop all active Attempts, prevent new Node scheduling, transition unfinished Nodes to CANCELLED as appropriate, and transition the Task to CANCELLED. Preserve completed Attempts, Logs, Artifacts, Events, and Workspace/Git history.

### Stop Node

Stop is Node-scoped after a Plan exists. Stopping a running Node cancels its active Attempt with an objective Owner-stopped end reason and moves the Node to BLOCKED so Orchestrator does not immediately restart it.

Other independent Nodes continue normally. Task becomes BLOCKED only if no other running/runnable work remains and the stopped Node (or another required Node) prevents further progress.

Owner Continue resolves this manual blocker by moving the same Node BLOCKED → PENDING. Normal dependency scheduling then starts a new Attempt. Do not add PAUSED / STOPPED / SUSPENDED Node states.

V1 does not need a separate whole-Task pause lifecycle. If whole-Task pause is later required, model it explicitly rather than overloading PLANNING or BLOCKED.

### Switch execution target

Switch Runtime / Runner / Model / Thinking is Node-scoped and keeps the same Node and Plan.

End the current Attempt (for example CANCELLED with `OWNER_SWITCHED_RUNTIME`) and immediately create a new Attempt using the explicit target. Node remains RUNNING throughout the handoff.

Any change to Runtime, Runner, Model, or Thinking creates a new Attempt so each Attempt has one stable concrete execution target.

Switching Runtime creates a fresh Runtime Session. Do not transfer an opaque provider Session across runtimes. Preserve the same Node Workspace state so the new Runtime can continue from the actual code/files already produced.

Automatic fallback and manual switching share the same execution path after target selection: new Attempt, current formal context, existing Node Workspace, Runtime Adapter start/resume rules.
