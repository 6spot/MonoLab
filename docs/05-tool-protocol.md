# Tool Protocol

## Core invariant

> Agent expresses intent through system tools. Program performs deterministic execution.

A natural-language statement is never a formal state transition.

Every state-mutating Tool Protocol request originating from a Runtime execution is bound to its Attempt and current fencing generation. The backend must reject mutations from a stale, terminal, or superseded Attempt even if an old Runner later reconnects.
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
complete_node(summary, artifact_ids?)
block_node(reason)
request_rework(target_node_id?, reason)
request_replan(reason)
~~~

Planner formal tools include:

~~~text
create_execution_task(title, specification)
publish_execution_plan(...)
prepare_replan(...)
apply_review_rework(target_node_ids, feedback_id, expected_version)
update_working_requirement_state(...)
commit_discussion_turn(reply, working_requirement_state, task_preview?)
~~~

## complete_node

`complete_node(summary)` is the main boundary from Agent execution into formal orchestration.

The summary is required.

On success the system should, as one reliable boundary:

1. verify the current Attempt ownership/fencing generation;
2. stop/freeze further mutation of the workspace being finalized;
3. finalize Node workspace state;
4. perform required deterministic integration into the local Task Workspace;
5. record the resulting Git/workspace completion state needed for same-Runner recovery;
6. write the formal completion event;
7. transition the Node to COMPLETED;
8. update Current Task State;
9. unlock downstream Nodes whose dependencies are satisfied.

The operation should be idempotent.

If the caller retries after an uncertain response, MonoLab detects the recorded request/operation for that Attempt and activation and returns its existing result rather than duplicating integration or events, including when that successful completion has since terminalized the Attempt.

A superseded Attempt cannot complete a Node. If workspace finalization or required Task Workspace integration fails, the Node must not already be marked COMPLETED.

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

The Execution Task Planner may also call `request_replan(reason)` for its current feedback-routing operation, but only after determining that the graph is insufficient. That call is bound to the operation/feedback and its expected control version by authenticated execution context. It atomically records the Replan request and resolves routing; it does not perform Node-specific block/stop transitions because the caller is a Planner. Merely accepting Request Changes never calls this tool.

Replan creates a new immutable Plan revision after Owner confirmation in V1.

An unresolved Replan request freezes scheduling of new Nodes from the current Plan. Already-running independent Nodes are not automatically killed; their results may still be preserved and provided to the Execution Task Planner.

Runtime failures do not use `block_node`, `request_rework`, or `request_replan`. Runtime/Adapter reports Attempt facts and Runtime Resolver handles fallback.

## Command authorization and idempotency

The Tool Protocol is the shared command boundary for Agent tools and authenticated Owner UI actions. Internal recovery runs under a scoped system identity. Identity and permissions are established server-side, never inferred from a prompt or caller-supplied Owner flag.

| Caller | Allowed mutations |
| --- | --- |
| Todo Planner | Commit its Discussion reply/requirement state/proposal; rebuild its cache; create only with a matching Owner confirmation |
| Execution Task Planner | Publish an initial Plan for its Task; prepare a Replan and publish only with its matching confirmation; resolve authorized review feedback through Rework or a formal Replan request; no final acceptance |
| Node Agent | Open Project workspaces; publish its outputs; complete/block itself; request upstream Rework or Task Replan |
| Owner | Confirm/create/start; stop/continue/retry/cancel; confirm Replan; submit feedback or blocker answers; accept delivery |
| System services | Validated scheduling, recovery, integration, projection, and delivery operations within module ownership |

Validate Task scope, effective Plan membership, activation, Attempt fencing, command-specific state, and resource membership for every applicable mutation. Read tools obey the same scope boundaries. Planner approval checks are enforced by the backend, not by Fixed System Protocol text alone.

Each mutation carries a stable request ID and payload digest. Persist its result with the formal transition; same ID and same payload returns the prior result, while reuse with different payload is rejected. Check authenticated identity before returning an existing result. A stale Attempt may retrieve its own previously committed result but cannot create new effects; this is the sole exception to rejecting calls from terminal Attempts. Long-running workspace/delivery commands return an operation reference and support status reads.

Task preview is transient UI backed by structured Discussion content, not a Draft Task. Owner confirmation creates a durable authorization receipt containing the exact title/specification digest, Todo and Project IDs, source proposal message ID, action, and request ID. A source proposal may create at most one Task: enforce uniqueness on that proposal identity as well as request idempotency, so two clients using different request IDs still receive the same created Task. Intentional repeated execution requires a new proposal identity. Task creation consumes that receipt atomically and once. Changed content or Project requires a new preview. The Owner command may perform creation directly without restarting a finished Planner Attempt. `Confirm and Start` composes creation and Start using separate idempotent commands; if Start validation fails, the created Task remains PLANNING and the UI reports why.

Replan receipts bind the proposed graph digest and its formal-state basis. Delivery receipts bind the exact result manifest described in Workspace & Git. A conversational "yes" alone is not an authorization record.

## Enforced execution boundary

V1 invokes Owner-installed CLIs as native processes on an Owner-controlled host. Runner assigns separate workspace/scratch directories, configures supported CLI permission settings, and scopes every system tool request to the Attempt. Directory/worktree separation prevents normal execution from sharing a working tree; it is not by itself an OS sandbox against arbitrary host filesystem access. CLI filesystem access follows the host execution account and any enabled native sandbox. MonoLab does not claim hostile-code containment from a working-directory setting. Keep backend database/configuration and system delivery credentials outside that account's access using separate service identities and OS permissions.

Runtime authentication remains Owner-managed on the Runner and is exposed only as needed by the selected CLI. MonoLab's provider delivery credentials stay in the system service boundary. MonoLab does not pass its provider write credentials to Agent execution; its repository read operations use appropriately scoped system credentials. Existing Owner-installed Git/CLI credentials follow host account permissions. If that account can independently push or merge, MonoLab cannot claim to prevent those out-of-band actions: the managed final-delivery authorization remains enforced in Tool Protocol, while a hard remote-write boundary additionally requires an execution account without those credentials. Do not silently alter the Owner's existing logins.

Runner must account for descendant/background processes when stopping or freezing execution. Revoking tool tokens alone does not stop filesystem writes. If writers cannot be reliably stopped or isolated, block workspace handoff and finalization with an infrastructure error.

Completion admission persists the command before freezing the execution process tree. The system worker performs finalization independently of the calling Runtime; it must not wait for a blocked tool-calling process to exit voluntarily. The original response may be lost when the Runtime is stopped, so command status/result lookup is the recovery path. A finalization failure becomes a recorded system recovery condition; the frozen Agent is not expected to repair it through the same invocation.

## Command envelope and deterministic failures

All transports use one conceptual command envelope. An Agent tool adapter may hide infrastructural fields from model-visible arguments; the authenticated session supplies them. An Owner UI command uses its authenticated Owner session instead of an Attempt credential.

```text
command
- request_id
- name
- scope_id                 # Todo or Task; validated against caller identity
- payload
- expected_control_version? # for commands based on reviewed Task state
- authorization_receipt_id? # required where Owner approval is the guard

runtime binding (server-authenticated)
- attempt_id
- fencing_generation
- node_activation?          # only for Node-owned execution
```

Return one of: a committed result, an accepted operation reference, or a deterministic error with a stable code, explanation, and current-version/operation reference when relevant. Error codes distinguish invalid input, denied scope, stale execution, version conflict, unmet precondition, and unsupported operation. They are protocol errors, not Task/Node states or semantic Outcome enums.

Idempotency keys are unique within the authenticated command principal and scope. For Owner retries across devices, preserve the original request ID. For an accepted asynchronous operation, retries return the same operation even before it completes. Reject changes to the command name, scope, or payload under an existing key. Validation failures without effects may be corrected using a new request ID.

Check an existing authenticated request receipt before checking whether its original expected version is now stale; otherwise a successful retry would fail its own version guard. For new effects, validate the expected version and consume any approval receipt in the same transaction as operation admission. Never retry a version conflict using a freshly fetched version without re-evaluating the command and obtaining any newly required confirmation.

`request_replan` is a terminal handoff for its requesting Node Attempt. Persist the request/freeze, revoke the requester's mutation authority, stop its process tree, preserve its unfinished private workspace, and set that Node BLOCKED with the Replan reason. Other running Nodes may settle normally. The Planner must not wait for the requesting Agent to call another tool before planning can begin. The accepted operation can outlive its caller.

On confirmed Plan publication, a retained requesting Node may return to PENDING if its sole blocker is that same resolved Replan request. Other external or Owner-stop blockers remain. A replacement Node can explicitly receive the old private result as historical input, but it is never automatically integrated as completed work.

Completion, block, and Replan handoff commands close the calling Attempt's mutation phase when accepted. Only one terminal handoff can win for that execution; later new mutations, including Artifact publication, are rejected. Status reads and replay of the already-accepted request remain available. This prevents result content changing after finalization admission.

## Protocol evolution and remote transport

Tool Protocol, backend-to-Runner commands, and normalized Runtime events each carry an explicit schema version. Runner registration reports supported protocol versions and fixed infrastructure features such as process isolation, resume, and workspace materialization support. These are implementation compatibility facts, not Role capabilities or an Agent-selection taxonomy.

Negotiate compatibility before dispatch. Additive fields may be ignored only where the schema explicitly permits it; unknown lifecycle commands and required semantics are rejected. An incompatible Runner stays visible with an upgrade reason and receives no incompatible work. New server versions must not reinterpret persisted old command payloads under changed semantics; recovery retains the command's original schema/version or uses an explicit migration.

Transport delivery is at-least-once. Deduplicate commands by their stable operation/request IDs and normalized events by `(attempt_id, stream_id, sequence)`. A reconnect replays from the acknowledged cursor. Transport acknowledgement means received/persisted, not Node completion; formal completion still requires the corresponding committed operation. Late logs from a terminal Attempt may be stored for diagnostics, but cannot revive the Attempt or mutate current lifecycle.

Runner requests are authenticated with an enrollment identity separate from Owner sessions and runtime credentials. Scope execution tool credentials to Attempt/owner, fencing generation, and expiry; renew only while that execution remains authorized. Ordinary daemon reconnection does not broaden permissions. Secrets are never carried in public event payloads or persisted context manifests.
