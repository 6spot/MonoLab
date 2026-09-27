# Tool Protocol

## Core invariant

> Agent expresses intent through system tools. Program performs deterministic execution.

A natural-language statement is never a formal state transition.

The system protocol is fixed, small, and cannot be overridden by Role instructions.

## Boundary

Inside a Workspace, an Agent may use the Runtime's native coding capabilities:

- read/write files;
- shell;
- build;
- test;
- search;
- patch;
- other normal coding tools.

Outside the Workspace, formal system state is controlled by MonoLab Tool Protocol.

An Agent must not directly manage:

- Task or Node state;
- Execution Plan state;
- system Workspace isolation;
- Artifact registration;
- final delivery/merge;
- other formal orchestration state.

## Context / read tools

Current baseline:

~~~text
read_context(...)
read_artifact(artifact_id)
search_task_events(...)
read_execution_log(...)
~~~

Context Builder should provide a useful map by default and let the Agent progressively retrieve more information.

Context assembly is deterministic system behavior. Planner/Agent may request additional context, but they do not decide the entire default database payload for themselves.

Planner context is split by module/session boundary:

- Todo Planner Session handles Discussion and Task materialization;
- Execution Task creation ends that Planner's participation in the execution chain;
- a new Execution Task Planner Session handles Plan and Replan;
- Todo Planner Session state is never inherited by the Execution Task Planner Session.

Within the Todo module, Discussion uses Working Requirement State + recent Discussion rather than full chat history.

Within the Execution Task module, planning starts from the immutable Execution Task Specification + Project/formal execution state. Replan starts from Task + current Plan + formal execution facts + replan reason.

Do not inject full Timeline, full Execution Logs, full repository history, all old sessions, all Todo Discussion, or all Git diffs by default.

Full Role instructions are not Planner selection context. Planner sees only compact Role descriptors; Role instructions are injected when the selected Role executes a Node.

## Node context assembly

Node context is assembled deterministically from Task, Project, Node, the current Role configuration, formal upstream outputs, and optional Rework context.

Role instructions are resolved when a new execution / Attempt starts. Do not create Role snapshots or Role revisions for Plan immutability. An already-running Attempt keeps the context it started with; later executions use the latest Role instructions.

A useful conceptual boundary is:

~~~text
Fixed Agent Protocol
+ Role Instructions
+ Execution Task Specification
+ Project Context
+ Node Goal / requirements
+ relevant upstream outputs
+ Project resource map
+ optional Rework context
~~~

Do not preload complete upstream transcripts or repository contents. Agents retrieve additional formal history through read/search tools and inspect code through the Workspace.

## Workspace tools

~~~text
open_workspace(resource_id)
read_git_state(workspace_id)
read_git_diff(workspace_id)
~~~

`open_workspace()` converts a Project resource into a safe Node-usable workspace and hides clone/fetch/checkout/worktree/reuse details.

Do not rebuild generic file/shell tools that Codex, Claude Code, OpenCode, and similar runtimes already provide well.

## Output / lifecycle tools

~~~text
publish_artifact(...)
complete_node(summary)
block_node(reason)
request_rework(target_node_id?, reason)
request_replan(reason)
~~~

Planner formal tools include:

~~~text
create_execution_task(title, specification)
publish_execution_plan(...)
update_working_requirement_state(...)
~~~

## complete_node

`complete_node(summary)` is the main boundary from Agent execution into formal orchestration.

The summary is required.

On success the system should, as one reliable boundary:

1. finalize Node workspace state;
2. persist any required completion snapshot;
3. write the formal completion event;
4. transition the Node to COMPLETED;
5. update Current Task State;
6. unlock downstream Nodes whose dependencies are satisfied.

The operation should be idempotent.

If workspace finalization fails, Node must not already be marked COMPLETED.

`complete_node()` does not judge whether work is semantically correct.

Node Completed is not Owner Accepted.

Artifacts are optional. Missing Artifact must not make `complete_node()` fail.

## block_node

Use when:

> The current Plan and Node are still valid, but an external condition prevents progress.

Examples include missing Owner decision, credential, permission, external result, or unavailable service.

The same Node resumes later through a new Attempt.

Unblocking is not an Agent tool. Once the external condition is resolved, a deterministic system/Owner action moves the Node from BLOCKED back to PENDING and normal Orchestrator scheduling resumes. Do not add a separate Task-level resume lifecycle.

## request_rework

Use when:

> An existing upstream Node's work must be redone, but the collaboration structure is still valid.

The system mechanically validates that the target exists in the current Plan and is upstream.

If there is exactly one direct upstream, `target_node_id` may be omitted.

If multiple upstream candidates exist, explicit target is required.

Rework reactivates the same Node. Do not create `node_v2`.

The deterministic invalidation boundary is the target Node plus all of its descendants in the current Plan. Those Nodes return to PENDING. Historical Attempts, Logs, Artifacts, summaries, and Events remain intact.

Independent Nodes outside that descendant subgraph are not reset.

If an invalidated descendant is currently executing, its current Attempt is cancelled by Orchestrator and the Node returns to PENDING.

## request_replan

Use when:

> The current collaboration graph itself is no longer sufficient.

Typical reasons:

- a new collaboration Node is needed;
- a future Node should be removed;
- dependencies must change;
- future serial/parallel structure must change.

Replan creates a new immutable Plan revision after Owner confirmation in V1.

An unresolved Replan request freezes scheduling of new Nodes from the current Plan. Already-running independent Nodes are not automatically killed; their results may still be preserved and provided to the Execution Task Planner.

Runtime failures do not use `block_node`, `request_rework`, or `request_replan`. Runtime/Adapter reports Attempt facts and Runtime Resolver handles fallback.
