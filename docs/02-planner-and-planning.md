# Planner & Planning

## Planner

Planner is a system control role.

It is not part of the reusable Role library.

MonoLab may reuse the same Planner configuration and Execution Policy across modules, but Todo planning and Execution Task planning are separate session/context domains.

~~~text
Todo Planner
DISCUSSION
→ MATERIALIZE TASK
→ create Execution Task
→ stop participating in that execution chain

Execution Task Planner
PLAN EXECUTION
→ REPLAN
~~~

Creating an Execution Task is a hard module boundary. The Todo Planner Session is not resumed or inherited inside the Execution Task.

Planner itself runs on a configured Runtime through its own Execution Policy.

Planner Runtime execution uses the same generic Attempt infrastructure as Node Agents. It does not require a separate PlannerInvocation model and does not turn Planner into an Execution Plan Node.

Planner Execution Policy may define ordered fallback targets. Planner failure therefore affects only work that currently requires Planner:

- Todo Discussion/materialization waits or falls back;
- a RUNNING Task that has just been started may wait or fall back during initial planning;
- a REPLAN_REQUIRED Task waits or falls back during Replan;
- an already-published Plan continues normal Orchestrator scheduling without Planner.

## Planner instruction layers

Planner behavior is assembled from two different instruction layers:

~~~text
Fixed System Protocol
+ Owner Planner Guidance
~~~

Fixed System Protocol defines MonoLab's non-overridable product and orchestration rules, including formal state/tool boundaries, required Owner confirmations, immutable Task/Plan semantics, and final acceptance/delivery authority.

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
   ├─ Plan
   └─ Replan
~~~

The only semantic handoff from Todo into Execution Task is the immutable Execution Task itself (plus its Project association). Todo Discussion, Working Requirement State, and Todo Planner Session are not execution-planning context.

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

Owner confirmation creates the immutable Execution Task, but does not immediately materialize an Execution Plan.

A newly created Task enters PLANNING with no current Plan. In this state the Task is a formal, ready-to-run item in the Owner's execution library, but MonoLab does not yet invoke the Execution Task Planner.

Initial planning begins only when the Owner explicitly starts the Task. Starting moves the Task to RUNNING immediately, then MonoLab starts a separate Execution Task Planner Session. This is not a continuation of the Todo Planner Session.

Deferring initial planning until Owner Start is intentional: the Planner should use the current Project Context, current Project Resources, and the current set of Project-selected Roles at the moment execution really begins. Changes made while the Task remains in PLANNING therefore naturally affect the initial Plan without mutating the frozen Task Specification.

Default context should include:

- Fixed System Protocol;
- Owner Planner Guidance;
- immutable Execution Task Specification as the primary semantic input;
- current Project Context;
- Project resource summary;
- selected reusable Role descriptors (role_id, name, description);
- only the formal/current facts needed to build the Plan.

Do not inject Todo Discussion, Todo Working Requirement State, or Todo Planner Session history into execution planning. The frozen Execution Task Specification is the semantic handoff across the module boundary.

Planner does not need full Role instructions in order to choose a Role. Full Role instructions are injected later when that Role actually executes a Node.

### REPLAN

Replan remains inside the Execution Task's own Planner Session/context domain.

Default Replan context should include:

- Fixed System Protocol;
- Owner Planner Guidance;
- immutable Execution Task Specification;
- current effective Plan;
- current Node states and relevant completion summaries;
- relevant Artifacts / formal outputs;
- request_replan(reason);
- current Project Context;
- selected reusable Role descriptors.

Do not return to Todo Discussion as part of execution planning. If the frozen Specification is insufficient, surface that as an execution/task issue rather than silently reaching back into the Todo Planner conversation.

## Context precedence

System invariants cannot be overridden.

Within semantic/project guidance, newer explicit Owner intent for the current Todo/Task may create a task-specific exception to older Project defaults. Such an exception applies only to the current requirement and must not silently mutate Project Context.

When materialized, the effective exception belongs in the immutable Execution Task Specification.

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

Only after explicit Owner confirmation of the preview may the system call `create_execution_task(title, specification)`.

This confirmation rule applies equally to natural-language execution intent ("start it", "do this", "create the execution task") and to an explicit UI action. AI-triggered creation must not bypass the preview.

## Role

Role is a globally reusable logical behavioral profile, not a runtime.

Role describes execution behavior: how the Agent should work, communicate, inspect the codebase, structure its completion summary, and present human-readable output. Project-specific technical constraints such as dependency policy, technology choices, repository conventions, or delivery rules belong in Project Context rather than Role.

System-required protocol/output requirements are injected by MonoLab's fixed Agent Protocol and do not need to be duplicated in every Role.

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

- Fixed Agent Protocol / MonoLab Tool Protocol boundaries;
- full instructions for the selected Role;
- immutable Execution Task Specification;
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

V1 uses a quiescent publication boundary. An unresolved Replan request freezes new Node dispatch, cancels queued Node Attempts and returns their Nodes to PENDING, and lets already-running Nodes finish or be explicitly stopped. Initial Replan generation starts only after those Attempts and their workspace completion operations have settled. A running Node that cannot finish requires Owner Stop; silence alone is not grounds for stopping it.

Planner proposes a complete replacement graph against an explicit current Plan revision and Task control version, with the formal event sequence recorded for provenance. Owner confirms the proposed graph through a human-readable change summary. Publication uses compare-and-set against that basis; changed control facts or edited proposal invalidates confirmation and requires a refreshed proposal. Confirmation to begin planning is not approval of an unseen graph. The prepared graph is retained as an infrastructure operation payload until confirmation or cancellation; it is not a new mutable Plan lifecycle. An authenticated Owner confirmation may publish through the same validated command without restarting the Planner that produced the proposal.

Retain a Node ID only when its goal, Role ID, dependencies, hard requirements, consumes, and expected outputs are unchanged. Its current activation and valid result then carry forward. Changed work receives a new Node ID. A changed dependency therefore also requires new identities for affected downstream work. Removed Nodes remain historical and cannot execute or integrate into the new effective Plan.

Validate before publication: a nonempty acyclic graph, unique Node IDs, all dependencies within the graph, valid Project-selected Roles, and no dangling output references. V1 treats every graph member as required; there is no optional-Node scheduling mode. `hard_requirements` are human-readable objective constraints for the Agent, not an additional hidden scheduler predicate. Old Artifacts may be cited explicitly as historical context, but never implicitly treated as current evidence.

### Review feedback planning

Request Changes records Owner feedback and revokes any pending delivery acceptance. The Task enters REPLAN_REQUIRED as a temporary scheduling freeze while the Execution Task Planner routes feedback; this does not itself require a new Plan revision.

The Planner may propose either Rework of existing Node(s), or a changed Plan. For Rework, the Owner's Request Changes authorizes applying the proposed existing-Node targets through the system command boundary; this clears the review-routing freeze and resumes normal scheduling. For a changed Plan, use the proposal confirmation and publication contract above. A normal Agent-requested Replan can only be cleared by confirmed Plan publication, not by this review-feedback exception.

Planner has a task-scoped Rework command for review routing. The Node Agent's upstream-only `request_rework` rule remains unchanged. Feedback and any blocker answer are persisted as Task-scoped Owner decisions and included in the next relevant Attempt; they must not rely on Todo Discussion or opaque Runtime session memory.

## Discussion turns and durable semantic output

Owner messages are persisted before scheduling Planner work, with a client request ID and a monotonic Todo message sequence. V1 processes one Discussion turn at a time per Todo. Messages received during an active turn remain queued in message order; they do not silently change the input of that turn. The UI distinguishes queued input from input already being answered. Owner Stop can interrupt the current turn, but does not delete the submitted messages.

Each turn has a stable source message ID, input message watermark, and Project-context reference. These are Todo message-processing fields, not a separate PlannerInvocation domain. Fallback Attempts handle the same source turn. A completed turn advances the processed Owner-message watermark exactly once. Its context includes committed earlier replies and Owner input only through its source message, even if later messages are already stored. Later turns then consume their own queued input in order. Reply messages retain the source message ID so append order cannot confuse which message they answer.

Planner commits a Discussion turn through `commit_discussion_turn(reply, working_requirement_state, task_preview?)`. The command atomically stores the final assistant message, its updated requirement state and source watermark. If a Task preview is present, its exact title/specification/Project payload is attached to that immutable message as structured content so a reconnect can render it again. The preview card remains transient presentation, with no Draft Task ID or lifecycle. Task creation still requires a separate exact-content Owner receipt.

Streamed text is provisional until that commit succeeds. Incomplete output and provider transcripts remain Attempt logs; they are not final Discussion messages and do not overwrite Working Requirement State. If the Runtime exits without committing, show an interrupted/retry turn and retain subsequent queued messages; do not skip the failed input and answer later messages out of order. After a successful commit, a lost response or later Runtime exit must not trigger a duplicate reply via fallback.

`update_working_requirement_state` remains available for explicit cache rebuilding, with compare-and-set against the committed Discussion watermark. Normal turns use the atomic commit command. Rebuilding from the same canonical history never rewrites original messages or Owner decisions.

If the Todo moves Projects during an active turn, preserve its eventual reply with the Project attribution it used, but do not install its old-Project requirement state as the current cache. A subsequent Planner turn rebuilds understanding for the new Project. Old previews require a refreshed proposal before creation under a different Project. No automatic model invocation is required merely because the Project changed.
