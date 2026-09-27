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

Node is the durable work unit.

Attempt is one concrete Runtime/Session execution of a Node.

A Node may have multiple Attempts:

~~~text
Node
├─ Attempt 1 → Codex → quota exhausted
└─ Attempt 2 → Claude Code → running
~~~

Runtime switching does not change Node identity and does not require Replan.

Attempt fields may include:

~~~text
attempt_id
node_id
runtime_id
session_id?
status
end_reason?
started_at
ended_at
~~~

Attempt state stays small: QUEUED, RUNNING, SUCCEEDED, FAILED, CANCELLED.

Specific causes belong in `end_reason`.

Attempt failure does not mean Node failure.

Client state never participates in Attempt lifecycle. Browser close, mobile disconnect, UI navigation, or client network loss are irrelevant because execution is owned by the backend Runner.

Attempt continuity is determined only by server-side Runtime execution continuity. If the same Runtime execution process/invocation remains alive, it is the same Attempt. If that execution ends and MonoLab must start or resume a Runtime execution again, that is a new Attempt.
