# Runtime & Execution

## Runner Daemon

A Runner Daemon is the persistent execution process on a machine.

It is responsible for deterministic runtime infrastructure: discover installed Agent CLIs, maintain Runtime Registry, heartbeat, start/stop execution processes, create/resume runtime sessions, collect execution events/logs, and normalize objective runtime errors.

Clients do not own execution. Web/Mobile may disconnect without affecting running work.

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
- model_id?
- thinking_level?
- runtime_options?
~~~

Every fallback is its own Execution Target, not merely a runtime ID.

Model and thinking level may be absent, meaning "use the Runtime/CLI default".

Runtime Adapter/Registry should expose supported models, thinking levels, and runtime-specific options when discoverable. UI should render capabilities dynamically rather than hard-coding all provider parameters into the core.

Do not introduce a separate Runtime Profile layer unless future reuse proves it necessary.

Resolution priority:

~~~text
Owner explicit one-off selection
→ Role / Planner Execution Policy
→ Global Execution Policy
~~~

Explicit one-off selection should not silently fail over unless the Owner allows fallback.

Auto/Policy execution may move through ordered fallbacks when the current Runtime is objectively unable to continue.

Do not score runtimes dynamically by model intelligence, estimated speed, cost, or predicted quota.

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
