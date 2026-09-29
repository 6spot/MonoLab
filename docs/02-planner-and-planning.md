# Planner & Planning

## Planner

Planner is a system control role.

It is not part of the reusable Role library.

monos may reuse the same Planner configuration and Execution Policy across modules, but Todo planning and Execution Task planning are separate session/context domains.

~~~text
Todo Planner
DISCUSSION
→ MATERIALIZE TASK
→ create Execution Task
→ stop participating in that execution chain

Execution Task Planner
TASK CONVERSATION ↔ PLAN EXECUTION / REQUIREMENT REVISION / REPLAN / REVIEW ROUTING
~~~

Creating an Execution Task is a hard module boundary. The Todo Planner Session is not resumed or inherited inside the Execution Task.

Planner itself runs on a configured Runtime through its own Execution Policy.

Planner Runtime execution uses the same generic Attempt infrastructure as Node Agents. It does not require a separate PlannerInvocation model and does not turn Planner into an Execution Plan Node.

Planner Execution Policy may define ordered fallback targets. Planner failure therefore affects only work that currently requires Planner:

- Todo Discussion/materialization waits or falls back;
- a RUNNING Task that has just been started may wait or fall back during initial planning;
- a REPLAN_REQUIRED Task waits or falls back during Replan;
- a REVIEW Task with pending feedback routing remains REVIEW and waits, falls back, or surfaces operation attention;
- Task Conversation/change routing waits or falls back with durable input attention;
- an already-published Plan continues normal Orchestrator scheduling without Planner, subject to explicit operation guards.

## Planner instruction layers

Planner behavior is assembled from two different instruction layers:

~~~text
Fixed System Protocol
+ Owner Planner Guidance
~~~

Fixed System Protocol defines monos's non-overridable product and orchestration rules, including formal state/tool boundaries, required Owner confirmations, immutable Specification/Plan revision semantics, and final acceptance/delivery authority.

Owner Planner Guidance is user-editable and controls collaboration style, preferences, tone, planning habits, and other soft behavior. It must not override the Fixed System Protocol.

Do not expose the raw Fixed System Protocol as an editable prompt. UI may show a read-only summary of managed system behavior.

## Planner session boundaries

Do not use one ever-growing universal Planner conversation.

Each Todo may maintain its own Todo Planner Session for continuous Discussion and Task materialization. Normal Owner messages within that Todo should resume that Todo's Planner Session when possible.

Once the Owner confirms and the Execution Task is created, all execution-side Planner activity belongs to a new Execution Task Planner Session. It must not inherit or resume the Todo Planner Session.

The Todo may continue its own Discussion independently and may later create other Execution Tasks, each with its own independent execution-side Planner Session.

Session continuity therefore follows the module boundary:

~~~text
Todo A
└─ Todo Planner Session
   ├─ Discussion
   ├─ Working Requirement State
   └─ Task Preview / creation

Execution Task 101
└─ Execution Task Planner Session
   ├─ Task Conversation / guidance / requirement revisions
   ├─ Plan / Replan
   └─ Review feedback / planning issues
~~~

The only semantic handoff from Todo into Execution Task is the initial confirmed Specification revision (plus the Task’s Project association). Todo Discussion, Working Requirement State, and Todo Planner Session are not execution-planning context.

## Phase-specific Planner context

Context Builder assembles different context for Todo-side and Execution Task-side Planner work.

### DISCUSSION

Default context should include:

- Fixed System Protocol;
- Owner Planner Guidance;
- current Project Context when assigned;
- immutable Original Capture;
- current Working Requirement State;
- recent Discussion within a deterministic token/message budget;
- current Owner message.

Do not inject the complete Discussion history by default. Older Discussion remains available through read/search tools when needed.

Do not add a separate AI context-optimizer in V1 merely to summarize recent Discussion. Working Requirement State plus a deterministic recent-message window is sufficient.

### MATERIALIZE TASK

When execution intent is clear, context remains centered on the current requirement:

- Fixed System Protocol;
- Owner Planner Guidance;
- Project Context;
- Original Capture;
- Working Requirement State;
- recent Discussion;
- current Owner message.

This phase produces only the proposed title/specification for the mandatory Execution Task Preview. It should not pull Runtime, Workspace, Git Log, or full Role instructions into the context merely because execution is about to begin.

### PLAN EXECUTION

Owner confirmation creates the Task and its immutable initial Specification revision, but does not immediately materialize an Execution Plan.

A newly created Task enters PLANNING with no current Plan. In this state the Task is a formal, ready-to-run item in the Owner's execution library, but monos does not yet invoke the Execution Task Planner.

Initial planning begins only when the Owner explicitly starts the Task. Starting moves the Task to RUNNING immediately, then monos starts a separate Execution Task Planner Session. This is not a continuation of the Todo Planner Session.

Deferring initial planning until Owner Start is intentional: the Planner should use the current Project Context, current Project Resources, and the current set of Project-selected Roles at the moment execution really begins. Changes made while the Task remains in PLANNING therefore naturally affect the initial Plan with the latest Owner-authorized Specification revision.

Default context should include:

- Fixed System Protocol;
- Owner Planner Guidance;
- effective immutable Specification revision as the primary semantic input;
- current Project Context;
- Project resource summary;
- selected reusable Role descriptors (role_id, name, description);
- only the formal/current facts needed to build the Plan.

Do not inject Todo Discussion, Todo Working Requirement State, or Todo Planner Session history into execution planning. The initial confirmed Specification revision is the semantic handoff across the module boundary; later changes belong to Task Conversation.

Planner does not need full Role instructions in order to choose a Role. Full Role instructions are injected later when that Role actually executes a Node.

### REPLAN

Replan remains inside the Execution Task's own Planner Session/context domain.

Default Replan context should include:

- Fixed System Protocol;
- Owner Planner Guidance;
- effective immutable Specification revision;
- current effective Plan;
- current Node states and relevant completion summaries;
- relevant Artifacts / formal outputs;
- request_replan(reason);
- current Project Context;
- selected reusable Role descriptors.

Do not return to Todo Discussion as part of execution planning. If the effective Specification is insufficient, resolve it through Task Conversation and an authorized requirement revision or raise a planning issue; never silently reach back into Todo context.

## Planner repository inspection

Planner may inspect Project repositories read-only when code facts would materially improve Discussion, planning, Replan, or review routing. It calls `inspect_repository(resource_id)` on demand; repository contents are never serialized into Planner context by default.

The call returns a disposable read-only snapshot at a finalized revision:

- Todo Planner: the resource's current default ref;
- Execution Task Planner: the Task's latest finalized Task Workspace revision for that resource when one exists, otherwise the resource's default ref.

Inspecting the Task's own result runs on its workspace host (module 03). A snapshot is not a Task Workspace. It has no delivery lineage, does not count as the Task opening that resource, and nothing written inside it is a formal output. All Planner Attempts, with or without inspection, keep repository access read-only while permitting invocation of the bundled `monos` CLI for authorized Tool Protocol commands. Use a verified native command allowlist or a read-only sandbox that permits the command and its required control connection; do not disable every command-execution path. Module 05 records the residual boundary.

Inspection does not give Planner repository selection authority. Planner still does not preselect repositories for a Task; Node Agents decide which resources they open with `open_workspace(resource_id)`.

## Context precedence

System invariants cannot be overridden.

Within semantic/project guidance, newer explicit Owner intent for the current Todo/Task may create a task-specific exception to older Project defaults. Such an exception applies only to the current requirement and must not silently mutate Project Context.

When materialized, the effective exception belongs in the effective immutable Specification revision.

## Discussion behavior

Planner should advance Owner intent rather than interrogate for formal completeness.

Ask a question only when the missing answer would materially change the core goal, scope, or an important irreversible direction.

Do not block on ordinary implementation details that an execution Agent can resolve from the Project.

Planner maintains Working Requirement State during Discussion.

On the first Planner turn for a Todo, context may include the immutable Original Capture, Project Context when assigned, and the Owner's first Discussion message. Original Capture is context only; it must not be represented as if Planner had already participated at Todo creation time.

Planner may suggest that the requirement is ready to execute.

When the Owner expresses clear execution intent, Planner must first prepare a lightweight Execution Task preview containing the proposed title and Markdown specification.

The preview card is transient UI state, reconstructed from structured proposal content on a committed Discussion message. It is not a persisted Draft Task domain object and not yet an Execution Task.

The Owner must be able to reread the proposed task and either confirm it, revise the Discussion, or cancel.

Only an explicit Owner confirmation of the preview creates the Task: the Owner command `create_execution_task` consumes the exact-content confirmation receipt. Planner has no Task-creation tool.

This confirmation rule applies equally to natural-language execution intent ("start it", "do this", "create the execution task") and to an explicit UI action. Natural-language intent can only lead Planner to prepare a preview; it never substitutes for the confirmation.

## Role

Role is a globally reusable logical behavioral profile, not a runtime.

Role describes execution behavior: how the Agent should work, communicate, inspect the codebase, structure its completion summary, and present human-readable output. Project-specific technical constraints such as dependency policy, technology choices, repository conventions, or delivery rules belong in Project Context rather than Role.

System-required protocol/output requirements are injected by monos's fixed Agent Protocol and do not need to be duplicated in every Role.

There is no Team or Team Blueprint abstraction.

~~~text
RoleProfile
- id
- name
- description
- instructions
- execution_policy?
~~~

A Project directly selects the reusable Roles that Planner may use:

~~~text
Project
- role_ids[]
~~~

Do not add role_type, capabilities taxonomy, Developer/Tester/Reviewer system types, Role Resolver, or a Team layer.

Planner receives only the Roles selected by the current Project, using a small descriptor:

~~~text
role_id
name
description
~~~

and directly selects a concrete `role_id`.

Dynamic multi-Agent orchestration still requires Planner. Planner may select one or more Project Roles only when the work actually benefits from multiple Nodes.

## Node execution context

When a Node starts, the execution Agent receives a compact, execution-focused context rather than the full Todo/Planner history.

Default Node context should include:

- Fixed Agent Protocol / monos Tool Protocol boundaries;
- full instructions for the selected Role;
- effective immutable Specification revision and active Node-scoped guidance with input provenance;
- current Project Context;
- current Node goal and objective requirements;
- relevant upstream completion summaries;
- explicitly consumed Artifacts / formal outputs when applicable;
- a lightweight Project resource map;
- optional Rework context when the same Node is reactivated.

Do not inject by default:

- full Todo Discussion;
- Working Requirement State;
- Owner Planner Guidance;
- instructions for other Roles;
- full Timeline;
- full Execution Logs;
- full repository history;
- complete transcripts from upstream Attempts.

Execution Task Specification is the semantic source of truth for execution. Earlier exploratory Discussion should not leak into Node execution unless an explicit read is required.

Project Context and Role instructions serve different purposes:

- Project Context describes the project reality and long-lived constraints;
- Role instructions describe how the selected execution Agent should behave.

For upstream dependencies, completion summaries and Artifact references/content are preferred over raw Attempt transcripts. The Agent can read/search additional logs or history on demand.

The optional Node `consumes` field is a lightweight hint for initial context, not a mandatory data-flow contract. It may cause referenced Artifacts to be injected initially, while ordinary dependency context can remain a completion summary plus Artifact map.

Workspace contents are not serialized into the prompt. The Agent uses `open_workspace(resource_id)` and the Runtime's native file/search/shell/build/test capabilities to inspect the repository directly.

When a Node is reactivated by Rework, keep the same Node and Role. A new Attempt may additionally receive the rework reason, relevant Owner/review feedback, and the previous completion summary. Do not introduce a separate Rework/Fix Agent type.

## Execution Plan

Execution Task describes WHAT.

Execution Plan describes only HOW WORK COLLABORATES.

Use the smallest sufficient graph:

~~~text
ExecutionPlan
- id
- execution_task_id
- revision
- nodes[]
~~~

Node:

~~~text
Node
- id
- goal
- role_id
- depends_on[]
- hard_requirements?   # optional objective prerequisites
- consumes?            # optional recommended initial formal context
- expected_outputs?    # optional soft guidance
~~~

Do not place Runtime, model, thinking level, Session, workspace path, Git branch/path, or business-specific role types in Plan.

Node stores only `role_id`; do not snapshot or version Role instructions into the Plan. Role configuration is mutable operational guidance outside the immutable Plan structure.

When a new Node execution / Attempt starts, Context Builder resolves the current Role instructions and injects them into that execution context. Editing a Role does not affect an already-running Attempt because its context has already been assembled. Later executions use the latest Role configuration.

Parallelism is expressed by `depends_on[]`. No `parallel_group`, `flow_id`, or `edge_id` is required.

Planner should not create extra Nodes merely because more Roles are available. A single Node is preferred when one Agent can sufficiently complete the work.

The real DAG is an internal scheduling/debugging structure. It is not normal Owner-facing UI.

## Replan

Plans are immutable.

A Replan creates a new complete Plan revision and atomically switches `current_plan_id`. Old plans remain as history. Stable Task-owned Node identities may be referenced by multiple revisions; each revision owns immutable membership and Node definitions, not a copied mutable Node lifecycle.

Replan is required when collaboration structure changes, for example adding a Node, removing a not-yet-started Node, changing dependencies, turning future work from serial to parallel, or replacing future Role assignments.

Completed Nodes, Artifacts, Events, Execution Logs, and Workspace/Git state remain.

Runtime switching is not Replan. Rework of an existing Node is not Replan.

Replan should preserve valid existing work and change only what is necessary for the future, even though the stored result is a complete new immutable Plan revision.

V1 requires Owner confirmation before a requested Replan is published.

### Replan publication contract

V1 uses a quiescent publication boundary. An unresolved Replan request freezes new Node dispatch, cancels queued Node Attempts and returns their Nodes to PENDING, and lets already-running Nodes finish or be explicitly stopped. Initial Replan generation starts only after those Attempts and their workspace completion operations have settled. A running Node that cannot finish requires Owner Stop, except where an explicitly authorized requirement-change operation already mandates stopping incompatible work; silence alone is not grounds for stopping it.

Planner proposes a complete replacement graph against an explicit current Plan revision and Task control version, with the formal event sequence recorded for provenance. Owner confirms the proposed graph through a human-readable change summary. Publication uses compare-and-set against that basis; changed control facts or edited proposal invalidates confirmation and requires a refreshed proposal. Confirmation to begin planning is not approval of an unseen graph. The prepared graph is retained as an infrastructure operation payload until confirmation or cancellation; it is not a new mutable Plan lifecycle. An authenticated Owner confirmation may publish through the same validated command without restarting the Planner that produced the proposal.

Retain a Node ID only when its goal, Role ID, dependencies, hard requirements, consumes, and expected outputs are unchanged. Its current activation and result may carry forward only when still applicable to the effective Specification and unresolved guidance; identical Node definitions alone do not prove evidence validity. Changed work receives a new Node ID. A changed dependency therefore also requires new identities for affected downstream work. Removed Nodes remain historical and cannot execute or integrate into the new effective Plan.

Validate before publication: a nonempty acyclic graph, unique Node IDs, all dependencies within the graph, valid Project-selected Roles, and no dangling output references. V1 treats every graph member as required; there is no optional-Node scheduling mode. `hard_requirements` are human-readable objective constraints for the Agent, not an additional hidden scheduler predicate. Old Artifacts may be cited explicitly as historical context, but never implicitly treated as current evidence.

The Owner may instead dismiss an unresolved Replan request, explicitly deciding that the current graph remains sufficient. Dismissal atomically resolves that request, discards any prepared proposal, clears its scheduling freeze, and records the Owner decision with optional direction; it publishes no Plan revision. Dismissal and publication serialize on the Task control version, so a discarded proposal can no longer publish.

The same transaction cancels queued Planner Attempts and revokes the mutation authority of any running Planner Attempt bound to that request, then enqueues process-tree termination/reconciliation. Reject every later new outcome from that request, including proposal preparation and planning issues. Keep the Planner owner claim/capacity reservation until the old execution is confirmed stopped or reliably fenced; a successor Planner cannot overlap it. Dismissal acknowledgement does not imply physical termination is already complete.

A requesting Node whose sole blocker is that request returns to PENDING after its own earlier handoff has reconciled; other blockers remain. The direction is included in its next Attempt. Normal scheduling still waits for available capacity.

If the dismissed request originated from review feedback, keep that feedback effective: the Task returns to REVIEW with acceptance blocked. Atomically create a new feedback-routing operation referencing the same feedback and the dismissal decision; the earlier routing resolution remains immutable history. After the old Planner has settled, the new Planner applies Rework within the current graph or raises a planning issue if it cannot honor the direction. It cannot immediately recreate the dismissed Replan request for the same unchanged feedback/basis; a different graph decision requires new explicit Owner direction. The Owner may separately Withdraw feedback, which ends the pending feedback operation and permits fresh acceptance. Dismissing a graph change never implicitly withdraws a requested correction.

Dismissal is always an explicit Owner decision; the system never clears a Replan request on its own.

### Review feedback planning

Request Changes records Owner feedback, revokes pending delivery acceptance, and creates a durable internal feedback-routing operation. The Task remains REVIEW while the Execution Task Planner determines how to address that feedback. Pending feedback blocks new acceptance and merge dispatch through operation guards; it does not itself invalidate completed Nodes, change the Plan, or create a Replan request.

The Planner makes the routing decision through formal tools, not prose:

- If the feedback stays within the effective Specification and the existing graph is sufficient, `apply_review_rework` atomically resolves the routing operation and invalidates the selected existing Nodes and descendants. Normal scheduling derives RUNNING from the resulting runnable work; REVIEW never passes through REPLAN_REQUIRED. The Owner's Request Changes authorizes this Rework within the effective Specification.
- Only if the graph itself is insufficient, `request_replan` atomically resolves routing into a formal Replan request and transitions REVIEW → REPLAN_REQUIRED. The new graph still requires the normal proposal confirmation and publication contract. Rework never clears REPLAN_REQUIRED.
- If feedback changes scope, prepare a Specification revision through Task Conversation and keep the feedback unresolved until the authorized change is applied. If intent is ambiguous, `raise_planning_issue(reason)` asks for direction.

Planner queueing, failure, or exit without a committed routing decision or planning issue leaves the Task in REVIEW with operation status/attention and Retry. No fallback path invents a structural planning decision. Feedback outside the effective Specification follows the requirement-change flow below; an independent objective or further work after terminal delivery must be initiated separately by the Owner through Todo Discussion.

The Owner may withdraw unresolved feedback at any time, including after a planning issue. Withdrawal is an explicit way to resolve the routing operation: it revokes any Planner Attempt working on the operation and records the Owner decision. The Task stays in REVIEW, and acceptance is admissible again under a new exact-result receipt. Unresolved feedback blocks acceptance until Rework or an authorized requirement change is applied, a formal Replan request is recorded, or the Owner withdraws it. Any remaining input/change/Replan guard continues to block acceptance independently.

The routing operation records its feedback ID and reviewed Plan/result basis. Every resolution (`apply_review_rework`, an applied requirement change, `request_replan`, or Owner withdrawal) validates that basis and the current Task control version; Planner outcomes also validate Planner Attempt ownership. Only one resolution may succeed. A repeated command returns its recorded result; a stale or competing decision cannot apply another outcome. Planner has a task-scoped Rework command for review routing. The Node Agent's upstream-only `request_rework` rule remains unchanged. Feedback, blocker answers, and planning-issue answers are persisted as Task-scoped Owner decisions and included in the next relevant Attempt; they must not rely on Todo Discussion or opaque Runtime session memory.

## Planning issues

Node Agents report external blockers with `block_node(reason)`. Execution Task Planner has the equivalent `raise_planning_issue(reason)` for a problem it cannot resolve within the effective Specification and current Plan: the Specification is insufficient or contradictory for initial planning, a Replan needs Owner direction, or review feedback cannot be routed.

The call is that Planner phase's formal outcome. It atomically records a Task event with the human-readable reason, points attention at it, and ends the Planner Attempt's mutation phase; fallback does not follow. The enclosing state does not change, including PLANNING before Start, RUNNING during execution or initial planning, REPLAN_REQUIRED, and REVIEW with unresolved routing. It is neither a Task state nor an Outcome classification.

The Owner resolves the issue with an answer plus Retry, which records a Task-scoped Owner decision included in the next Planner Attempt, or with the exit that fits the phase: Stop before a Plan exists, Replan dismissal, feedback withdrawal, or Cancel Task. An incorrect Specification is corrected through an authorized new revision in the same unfinished Task. Answers that change requirements use that flow rather than silently becoming execution guidance.

Todo Planner does not need this tool; it asks the Owner in its committed Discussion reply.

## Discussion turns and durable semantic output

Owner messages are persisted before scheduling Planner work, with a client request ID and a monotonic Todo message sequence. V1 processes one Discussion turn at a time per Todo. Messages received during an active turn remain queued in message order; they do not silently change the input of that turn. The UI distinguishes queued input from input already being answered. Owner Stop can interrupt the current turn, but does not delete the submitted messages.

Each turn has a stable source message ID, input message watermark, and Project-context reference. These are Todo message-processing fields, not a separate PlannerInvocation domain. Fallback Attempts handle the same source turn. A committed reply or explicit Owner withdrawal advances the processed Owner-message watermark exactly once; withdrawal is a recorded disposition, not a completed reply. Its context includes committed earlier replies and Owner input only through its source message, even if later messages are already stored. Later turns then consume their own queued input in order. Reply messages retain the source message ID so append order cannot confuse which message they answer.

Planner commits a Discussion turn through `commit_discussion_turn(reply, working_requirement_state, task_preview?)`. The command atomically stores the final assistant message, its updated requirement state and source watermark. If a Task preview is present, its exact title/specification/Project payload is attached to that immutable message as structured content so a reconnect can render it again. The preview card remains transient presentation, with no Draft Task ID or lifecycle. Task creation still requires a separate exact-content Owner receipt.

The committed `reply` argument is the only canonical reply. While the turn runs, the UI may stream the Runtime's incremental output, including partial tool input when the Adapter exposes it; otherwise it shows a working indicator. Provisional text is never promoted to the reply. Incomplete output and provider transcripts remain Attempt logs; they are not final Discussion messages and do not overwrite Working Requirement State. If the session finishes its turn without committing, the Adapter may send the single protocol reminder defined in module 03. If the Runtime still exits without committing, show an interrupted/retry turn and retain subsequent queued messages; do not automatically skip the failed input and answer later messages out of order. After a successful commit, a lost response or later Runtime exit must not trigger a duplicate reply via fallback.

A failed or interrupted Discussion turn offers Retry or Withdraw request. Retry processes the same source message through a new Attempt after prior execution ownership has settled. Withdrawal applies to the current unresolved turn: preserve the original message and logs, record the Owner decision, revoke its queued/running Planner work, and advance the processed watermark with that disposition. It creates no reply or preview and does not rewrite Working Requirement State. Enqueue the next pending message durably; its Attempt waits for the old Planner process/claim to settle. Other Todos remain independent, subject only to shared Runner capacity. Withdrawal needs no available Planner and cannot undo an already-committed reply. Later context and cache rebuilding label withdrawn input as historical, not an outstanding instruction; do not resume a session that cannot honor that disposition.

`update_working_requirement_state` remains available for explicit cache rebuilding, with compare-and-set against the resolved Discussion watermark. Normal turns use the atomic commit command. Rebuilding from the same canonical history never rewrites original messages or Owner decisions.

If the Todo moves Projects during an active turn, preserve its eventual reply with the Project attribution it used, but do not install its old-Project requirement state as the current cache. A subsequent Planner turn rebuilds understanding for the new Project. Old previews require a refreshed proposal before creation under a different Project. No automatic model invocation is required merely because the Project changed.

## Task Planner throughout delivery

A Task owns one logical Planner context for initial planning, ongoing conversation, guidance, requirement changes, Replan, and review routing. This is not a resident Agent process or an additional Plan Node. Owner messages and formal attention events enqueue work for that scope. At most one Task Planner Attempt owns mutation authority at a time; messages arriving during an Attempt remain durable pending input for a later turn. Coalescing preserves message order, source IDs, and a processed watermark; no message is silently skipped.

Task conversation is available before Start and while stopped or awaiting a decision. It does not implicitly Start, Continue, dismiss Replan, unblock a Node, or accept delivery. An explicit Owner command still authorizes those actions. Terminal Tasks permit read-only replies, not new execution effects. Task Planner never prepares previews for another Task or hands its conversation to Todo Planner. Further execution outside the current Task requires the Owner to return to Todo Discussion and initiate an independent Task.

Default context contains the effective Specification revision, current Plan/control version, relevant Node/output facts, open operations/issues, active guidance, a bounded recent Task Conversation window, and the current input batch. Older conversation remains searchable. Do not load an ever-growing transcript, all logs, or Todo Discussion. Native session continuity is optional and never authoritative.

Planner commits its reply and routing decision through `commit_task_turn`. It may answer a question, record scoped guidance, prepare an exact requirement proposal, or raise an issue. These are internal routing outcomes, not a required UI taxonomy. A reply cannot claim a change is effective while its operation is merely proposed or pending. Review buttons and conversational requests use the same underlying feedback/change mechanisms, not competing controllers.

### Requirement change flow

1. Persist Owner input before invoking Planner. Before Owner acceptance, unclassified input guards acceptance and automatic remote preparation; it does not stop running Nodes merely because it might contain a change. A status-only reply resolves that guard without invalidating result evidence. Acceptance and message admission serialize: after acceptance succeeds, later messages are attributed outside the frozen delivery batch, permit conversation-only replies, and do not block its writes, finalization or Retry. In-place change admission requires the accepted operation to have been explicitly revoked under module 04's guards. Completion can settle under the old revision but cannot bypass pre-acceptance input guards.
2. Planner distinguishes clarification within scope from changed scope, constraints, or acceptance expectations. It prepares a complete proposed Specification plus a compact change summary and impact assessment: affected Nodes/descendants, evidence to invalidate or explicitly carry forward, guidance to retain/supersede, and whether the existing graph suffices. A question or implementation hint alone needs no requirement revision.
3. Owner authorization binds exact content and its base revision. An Owner-authored complete Specification edit can authorize that exact content directly. A Planner interpretation of conversational change requires an inline confirmation of the resulting proposal; subsequent edits require a fresh receipt. Ordinary replies and within-scope guidance need no confirmation. A declined or withdrawn proposal does not silently withdraw separate effective review feedback. Confirmation also binds the displayed impact digest; materially enlarged affected work or different evidence carry-forward requires a refreshed confirmation.
4. On authorized change admission, revoke pending acceptance and freeze new work in the affected subgraph. Revoke incompatible Attempts, stop/reconcile their physical writers, and settle already-admitted workspace/delivery operations before changing the effective basis. Preserve code and history. Unknown impact conservatively freezes all Node dispatch until resolved; infrastructure failures remain operation attention, not REPLAN_REQUIRED.
5. If current Node definitions and graph suffice, atomically publish the Specification revision, apply explicit evidence carry-forward/invalidation, resolve linked inputs/feedback, and schedule eligible work. Unfinished affected work continues through a fresh Attempt with current inputs; affected completed work is reactivated along with descendants. Unaffected work is preserved with recorded applicability. No artificial Plan revision or REPLAN_REQUIRED is required. If a Node’s formal goal, hard requirements, Role, or dependencies must change, use the existing Plan revision contract rather than silently editing an immutable Node definition.
6. If the graph is insufficient, create a formal Replan request linked to the change proposal. Publish the confirmed Specification and replacement Plan together after the existing Replan settlement barrier. Until then the old Specification remains effective and the new one is visibly pending. An independent Replan can still change the graph without changing requirements.

Changes before initial Plan publication update the Specification and invalidate stale planning proposals, without inventing Replan. Active initial planning is revoked/reconciled and retried on the new basis if the Task is started. Replan dismissal or rejection does not publish a pending Specification; linked Owner input remains pending for revised handling or explicit withdrawal. Stop is respected during and after publication. Withdrawal before publication cancels/reconciles the operation; it does not resurrect revoked acceptance or old Attempts. Reversing a published revision requires another authorized revision.

Only one change/Replan publication may be admitted per Task at a time. Further messages remain ordered input. Expected control version, current Specification/Plan, input watermark, and affected activation/result versions guard new effects; stale impact assessments must be refreshed, not replayed with a newer version number. New input during preparation prevents stale publication until interpreted or explicitly deferred by the Owner. An open proposal or settlement operation does not hold the Planner claim; a later conversation Attempt can interpret the new input, refresh the operation basis, or prepare a successor proposal. It cannot admit a second competing publication.

During REVIEW, a requirement change can preserve REVIEW if all current evidence is explicitly still applicable, or derive RUNNING through affected Node reactivation; only actual graph insufficiency produces REPLAN_REQUIRED. Request Changes within the same requirement keeps its existing direct Rework flow. Pending requirement changes block acceptance until applied or explicitly withdrawn/resolved.

Once Owner acceptance admits a delivery batch, Task Planner may answer progress questions and explain later requests but cannot route new execution guidance, Rework or requirement/Plan publication into that batch. Replies identify that the accepted result is proceeding unchanged. New requirements after delivery are initiated separately by the Owner through Todo Discussion; no automatic Task creation or context transfer occurs. Ordinary messages, including conversational requests to stop or change delivery, do not revoke acceptance. Explicit Request Changes or Cancel must use their authenticated commands and delivery guards. Failure or queueing of these later conversation turns does not delay the accepted delivery.

### Guidance delivery

Within-scope guidance records source messages, intended Nodes, applicability, and whether it remains active for future Attempts. Superseding guidance retains history. New Attempts receive active relevant guidance deterministically. Runtime delivery targets exact Attempt identities and records per-recipient receipts (module 03); delivery does not imply understanding, compliance, or completion. Guidance needing changed requirements must use the revision flow. Guidance invalidating completed evidence uses authorized Rework rather than leaving that evidence current.

Owner confirmation may admit an already-prepared requirement change through the same validated command without restarting Planner. Interpretation is Agent work; receipt validation and publication are deterministic program work. A Task Planner Attempt that commits a requirement proposal has completed its phase even while that proposal awaits Owner action.

### Pending input, proposal replacement, and Owner exits

Task turns use immutable input batches and reply provenance, as Todo turns do. A reply-only commit validates the turn claim and source watermark, not unrelated Node progress; it records the observed execution version/time so a progress reply can be historical without overwriting current state. Action routing additionally validates current affected facts. Later messages never cause an earlier reply to consume their input accidentally.

Committing a proposal resolves interpretation of its source input, but leaves its change obligation open. This does not block subsequent conversation turns. A crash before the committed reply leaves the input retryable; draft preparation alone is not a completed phase. A crash after commit cannot duplicate the reply or route its effects again. Failed input has Retry or explicit Owner withdrawal; later queued input is retained, not silently skipped. Withdrawal records a disposition so the processed watermark can advance without inventing a reply.

The Owner may revise a pending proposal through conversation. Persist a new proposal linked to the superseded one and revoke the old confirmation eligibility. Keep the same source obligation pending rather than accumulating orphaned acceptance guards. If settlement was already admitted, cancel/reconcile it before admitting the successor. Read-only discussion of a proposal remains possible while its settlement waits.

Conversation answers to planning issues and blockers must reference the exact open issue and expected version. Planner can record the answer, but clearing a Node blocker and starting work still requires the authenticated Owner Retry/Continue command; an inline action may carry the answer with it. A requirement revision alone never clears unrelated credential, external, or Owner-stop blockers. If intent is ambiguous, ask rather than resuming work.

Guidance is retained before a Plan exists as Task-scoped input and assigned concrete recipients when planning publishes. A correction to already-completed work can be routed through Task conversation while the Task is nonterminal and no accepted delivery operation is active; the same program-owned invalidation primitive resets the selected Nodes and descendants, with Owner-message authority and expected-version checks. Accepted-batch conversation cannot invoke this path; explicit guarded correction must first revoke that batch. This is separate from the Node Agent's upstream-only Rework permission. New scope always requires a Specification revision.
