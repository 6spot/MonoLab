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
- a new Execution Task Planner Session handles Task Conversation, guidance, requirement revisions, Plan and Replan;
- Todo Planner Session state is never inherited by the Execution Task Planner Session.

Within the Todo module, Discussion uses Working Requirement State + recent Discussion rather than full chat history.

Within the Execution Task module, planning starts from the effective Specification revision + bounded Task Conversation/active guidance + Project/formal execution state. Replan starts from Task + current Plan + formal execution facts + replan reason.

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

Planner never receives a writable workspace; it uses `inspect_repository(resource_id)` for read-only snapshots (module 02).

## Output / lifecycle tools

~~~text
publish_artifact(...)
complete_node(summary, artifact_ids?, handled_guidance_ids?)
block_node(reason)
request_rework(target_node_id?, reason)
request_replan(reason)
~~~

Planner formal tools include:

~~~text
publish_execution_plan(...)
prepare_replan(...)
apply_review_rework(target_node_ids, feedback_id, expected_version)
raise_planning_issue(reason)
inspect_repository(resource_id)
update_working_requirement_state(...)
commit_discussion_turn(reply, working_requirement_state, task_preview?)
commit_task_turn(reply, source_watermark, routing)
prepare_specification_revision(specification, impact, source_message_ids, expected_version)
apply_specification_revision(proposal_id, authorization_receipt_id, expected_version)
~~~

Task creation is the Owner command `create_execution_task`, which consumes an exact-content confirmation receipt for a proposal committed in Todo Discussion; Planner has no creation tool. Task Conversation cannot supply a creation proposal. `commit_task_turn` rejects previews or routing effects that propose/create another Task; its requirement proposals apply only to the current Task.

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

The Execution Task Planner may also call `request_replan(reason)` for its current feedback or requirement-change operation, but only after determining that the graph is insufficient. That call is bound to the operation/source input and its expected control version by authenticated execution context. It atomically records the Replan request and resolves routing; it does not perform Node-specific block/stop transitions because the caller is a Planner. Merely accepting Request Changes never calls this tool.

Replan creates a new immutable Plan revision after Owner confirmation in V1. The Owner may instead dismiss the request when the current graph remains sufficient (module 02).

An unresolved Replan request freezes scheduling of new Nodes from the current Plan. Already-running independent Nodes are not automatically killed; their results may still be preserved and provided to the Execution Task Planner.

Runtime failures do not use `block_node`, `request_rework`, or `request_replan`. Runtime/Adapter reports Attempt facts and Runtime Resolver handles fallback.

## raise_planning_issue

Use when:

> The Execution Task Planner cannot proceed under the effective Specification and current Plan without Owner direction.

It is the Planner's counterpart to `block_node`: it records the reason as Owner attention and ends the Planner's mutation phase without changing Task state. Module 02 owns its semantics and the Owner's resolutions.

## Command authorization and idempotency

The Tool Protocol is the shared command boundary for Agent tools and authenticated Owner UI actions. Internal recovery runs under a scoped system identity. Identity and permissions are established server-side, never inferred from a prompt or caller-supplied Owner flag.

| Caller | Allowed mutations |
| --- | --- |
| Todo Planner | Commit its Discussion reply/requirement state/proposal; rebuild its cache; inspect Project repositories read-only |
| Execution Task Planner | Publish an initial Plan for its Task; prepare a Replan and publish only with its matching confirmation; commit Task replies/guidance; prepare requirement changes and apply only with exact Owner authorization; resolve authorized review feedback through Rework, requirement revision or a formal Replan request; raise a planning issue; inspect Project repositories read-only; no final acceptance |
| Node Agent | Open Project workspaces; publish its outputs; complete/block itself; request upstream Rework or Task Replan |
| Owner | Confirm/create/start; submit Task messages; authorize or withdraw requirement proposals; stop/continue/retry/cancel; confirm or dismiss Replan; submit or withdraw feedback; answer blockers and planning issues; apply a preserved Rework request (resetting the Rework limit); override pre-push findings; accept delivery |
| System services | Validated scheduling, recovery, integration, projection, and delivery operations within module ownership |

Validate Task scope, effective Plan membership, activation, Attempt fencing, command-specific state, and resource membership for every applicable mutation. Read tools obey the same scope boundaries. Planner approval checks are enforced by the backend, not by Fixed System Protocol text alone.

Each mutation carries a stable request ID and payload digest. Persist its result with the formal transition; same ID and same payload returns the prior result, while reuse with different payload is rejected. Check authenticated identity before returning an existing result. A stale Attempt may retrieve its own previously committed result but cannot create new effects; this is the sole exception to rejecting calls from terminal Attempts. Long-running workspace/delivery commands return an operation reference and support status reads.

Task preview is transient UI backed by structured Discussion content, not a Draft Task. Owner confirmation creates a durable authorization receipt containing the exact title/specification digest, Todo and Project IDs, source proposal message ID, action, and request ID. A source proposal may create at most one Task: enforce uniqueness on that proposal identity as well as request idempotency, so two clients using different request IDs still receive the same created Task. Intentional repeated execution requires a new proposal identity. Task creation consumes that receipt atomically and once. Changed content or Project requires a new preview. Creation is always this Owner command; it never waits for or restarts a Planner Attempt. `Confirm and Start` composes creation and Start using separate idempotent commands; if Start validation fails, the created Task remains PLANNING and the UI reports why.

Replan receipts bind the proposed graph digest and its formal-state basis, including the effective or jointly proposed Specification revision. Delivery receipts bind the exact result manifest described in Workspace & Git. Pre-push override receipts bind the exact result tree, candidate delivery head/parents, scan version and eligible finding IDs. They cannot override missing provider permissions. A conversational "yes" alone is not an authorization record.

## Enforced execution boundary

V1 invokes Owner-installed CLIs as native processes on an Owner-controlled host. Runner assigns separate workspace/scratch directories, configures supported CLI permission settings, and scopes every system tool request to the Attempt. Directory/worktree separation prevents normal execution from sharing a working tree; it is not by itself an OS sandbox against arbitrary host filesystem access. CLI filesystem access follows the host execution account and any enabled native sandbox. MonoLab does not claim hostile-code containment from a working-directory setting. Keep backend database/configuration and system delivery credentials outside that account's access using separate service identities and OS permissions. Module 11 defines the concrete host identities and hardening conditions; while any condition is violated, MonoLab does not claim this boundary.

Planner Attempts run with the CLI's native write and shell tools disabled, or in its read-only sandbox, where supported. The feasibility probe records each Adapter's residual access; a directory-level read-only grant is not containment.

Runtime authentication remains Owner-managed on the Runner and is exposed only as needed by the selected CLI. MonoLab's provider delivery credentials stay in the system service boundary. MonoLab does not pass its provider write credentials to Agent execution; its repository read operations use appropriately scoped system credentials. Existing Owner-installed Git/CLI credentials follow host account permissions. If that account can independently push or merge, MonoLab cannot claim to prevent those out-of-band actions: the managed final-delivery authorization remains enforced in Tool Protocol, while a hard remote-write boundary additionally requires an execution account without those credentials. Do not silently alter the Owner's existing logins.

Runner must account for descendant/background processes when stopping or freezing execution. Revoking tool tokens alone does not stop filesystem writes. If writers cannot be reliably stopped or isolated, block workspace handoff and finalization with an infrastructure error.

Completion admission persists the command before freezing the execution process tree. The system worker performs finalization independently of the calling Runtime; it must not wait for a blocked tool-calling process to exit voluntarily. The original response may be lost when the Runtime is stopped, so command status/result lookup is the recovery path. A finalization failure becomes a recorded system recovery condition; the frozen Agent is not expected to repair it through the same invocation.

## Agent tool bridge

Agent CLIs reach the Tool Protocol through a per-Attempt bridge that the Runner registers at launch, by default an MCP stdio server (module 11). The bridge:

- exposes only the tools the Attempt's owner type may call (see the caller table above);
- obtains and renews its scoped Attempt credential from the local Runner over a private channel, never through model-visible arguments, process arguments, or logs;
- maps each tool call to the command envelope, assigning one request ID per call and reusing it for its own transport retries;
- returns committed results, operation references, and deterministic errors unchanged, and reports control-plane unavailability as retryable.

The bridge holds no lifecycle authority; the backend validates every call as it would any other Tool Protocol command.

## Command envelope and deterministic failures

All transports use one conceptual command envelope. The Agent tool bridge hides infrastructural fields from model-visible arguments; the authenticated session supplies them. An Owner UI command uses its authenticated Owner session instead of an Attempt credential.

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

Owner dismissal also cancels queued and revokes running Planner Attempts bound to the request; process reconciliation precedes release of their owner claim/capacity. Dismissing a review-originated request creates a fresh routing operation for the still-effective feedback; only a separate Owner withdrawal removes that feedback.

On confirmed Plan publication or Owner dismissal, a retained requesting Node may return to PENDING if its sole blocker is that same resolved Replan request and its earlier process handoff has settled. Other external or Owner-stop blockers remain. A replacement Node can explicitly receive the old private result as historical input, but it is never automatically integrated as completed work.

Completion, block, and Replan handoff commands close the calling Attempt's mutation phase when accepted. Only one terminal handoff can win for that execution; later new mutations, including Artifact publication, are rejected. Status reads and replay of the already-accepted request remain available. This prevents result content changing after finalization admission.

## Protocol evolution and remote transport

Tool Protocol, backend-to-Runner commands, and normalized Runtime events each carry an explicit schema version. Runner registration reports supported protocol versions and fixed infrastructure features such as process isolation, resume, and workspace materialization support. These are implementation compatibility facts, not Role capabilities or an Agent-selection taxonomy.

Negotiate compatibility before dispatch. Additive fields may be ignored only where the schema explicitly permits it; unknown lifecycle commands and required semantics are rejected. An incompatible Runner stays visible with an upgrade reason and receives no incompatible work. New server versions must not reinterpret persisted old command payloads under changed semantics; recovery retains the command's original schema/version or uses an explicit migration.

Transport delivery is at-least-once. Deduplicate commands by their stable operation/request IDs and normalized events by `(attempt_id, stream_id, sequence)`. A reconnect replays from the acknowledged cursor. Transport acknowledgement means received/persisted, not Node completion; formal completion still requires the corresponding committed operation. Late logs from a terminal Attempt may be stored for diagnostics, but cannot revive the Attempt or mutate current lifecycle.

Runner requests are authenticated with an enrollment identity separate from Owner sessions and runtime credentials. Scope execution tool credentials to Attempt/owner, fencing generation, and expiry; renew only while that execution remains authorized. Ordinary daemon reconnection does not broaden permissions. Secrets are never carried in public event payloads or persisted context manifests.

## Task conversation and requirement commands

`submit_task_message(content, request_id)` is an authenticated Owner command. It atomically appends the ordered message, creates durable pending input and its delivery-admission guard, and enqueues Task Planner work through the outbox. It requires no runtime to be available. Messages arriving during a Planner Attempt do not mutate that Attempt's launch context.

`commit_task_turn(reply, source_watermark, routing)` atomically records the final reply, processed input batch and routing effects under the Planner claim and expected basis. Routing may resolve a question, persist scoped guidance with recipient delivery intents, attach a prepared requirement proposal, or record a planning issue. It cannot directly widen requirements or grant Owner authority. Marking a message processed is distinct from resolving its resulting change/feedback operation. Proposals prepared separately become visible with their committed reply; they have no execution effect before admission. Preparation is not a terminal phase outcome: `commit_task_turn` attaches the proposal and closes that conversation Attempt. Unattached drafts cannot be confirmed and are recoverable or discarded with the failed turn. An Attempt has one phase outcome; use existing Plan/review tools for their corresponding phases, not a second independent controller for the same feedback.

`prepare_specification_revision` persists a complete immutable proposal, its base Specification/Plan/control version, source input watermark, and impact assessment. `apply_specification_revision` consumes a matching authorization receipt and admits a recoverable system operation. It returns an operation reference; the calling Planner does not need to remain alive while writers and remote operations settle. The publication transaction and guards are defined in module 06.

Owner authorization binds Task, base revision, complete proposed specification digest, displayed impact digest, source proposal, and action. A directly submitted complete Specification can carry this authorization; arbitrary prose such as “yes” is not a receipt. Planner-generated text requires the Owner's exact-proposal confirmation. Changed graph publication additionally requires the existing Replan confirmation, binding both proposed requirements and graph when jointly published. Ordinary conversation and within-scope guidance require no extra confirmation.

Read tools expose Task messages, revision history, active guidance, current operations, and per-recipient delivery receipts within Task scope. All new commands retain standard idempotency, authorization, fencing, expected-version checks and status lookup. Conflicting change admission, terminal Tasks, stale message basis, and unresolved delivery outcomes return deterministic precondition/version errors rather than silently changing the Task.

Terminal Tasks permit `submit_task_message` and reply-only `commit_task_turn` under a scoped conversation claim. They reject guidance dispatch, requirement/Plan publication, and execution mutations. This exception permits discussion without reopening the lifecycle.

### Explicit operation resolution commands

Owner commands `retry_discussion_turn(todo_id, source_message_id, request_id)` and `withdraw_discussion_turn(todo_id, source_message_id, request_id)` address the current unresolved Todo Discussion turn. Retry is allowed for failed/interrupted work and enqueues a new Attempt for that same input without duplicating active work. Withdrawal records a durable source-message disposition, revokes associated queued/running Planner work, and advances the processed watermark with a durable next-turn intent; it neither deletes history nor fabricates a reply or requirement-state update. The Todo module owns this disposition. Validate the source turn and serialize withdrawal with `commit_discussion_turn`: only one resolution wins. A late commit after withdrawal is rejected; withdrawal after a committed reply returns an unmet-precondition error. Standard authenticated receipts make retries idempotent. Neither command requires a live Planner; successor execution still waits for prior process/claim reconciliation.

Owner commands `retry_task_input(operation_id, expected_version)` and `withdraw_task_input(operation_id, expected_version)` target pending input, guidance, or an unpublished requirement change. Withdrawal is a durable decision, not deletion of messages. It revokes the associated proposal receipts, cancels/fences associated Planner work, and admits reconciliation where external effects have begun. Its result identifies any remaining independent feedback, Replan or blocker. Published changes cannot be withdrawn; propose a new revision instead.

Task Planner may route an in-scope correction through `commit_task_turn` with explicit affected Node IDs and source Owner message IDs. Backend authorization checks that source intent, current requirement/Plan and activation basis, and invokes the existing Rework invalidation primitive. This permits correction outside REVIEW without granting a Node Agent broader authority. Routing may not bypass Rework limits: where that guard is reached, retain the requested correction for the existing Owner Apply Rework action.

A proposal confirmation is an Owner action referencing an existing proposal; it is not inserted as an unclassified new chat message that invalidates its own proposal watermark. A text answer that edits the proposal is new input and needs a newly prepared exact confirmation. Withdrawal and Retry likewise reference operation identities and do not depend on an available Planner Runtime.
