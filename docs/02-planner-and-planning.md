# Planner & Planning

## Planner

Planner is a system control role.

It is not part of the reusable Role library and is not a separate user-visible "discussion agent" plus "planning agent". The same configured Planner performs different phases:

~~~text
DISCUSSION
→ MATERIALIZE TASK
→ PLAN EXECUTION
→ REPLAN
~~~

Planner itself runs on a configured Runtime through its own Execution Policy.

## Planner instruction layers

Planner behavior is assembled from two different instruction layers:

~~~text
Fixed System Protocol
+ Owner Planner Guidance
~~~

Fixed System Protocol defines MonoLab's non-overridable product and orchestration rules, including formal state/tool boundaries, required Owner confirmations, immutable Task/Plan semantics, and final acceptance/delivery authority.

Owner Planner Guidance is user-editable and controls collaboration style, preferences, tone, planning habits, and other soft behavior. It must not override the Fixed System Protocol.

Do not expose the raw Fixed System Protocol as an editable prompt. UI may show a read-only summary of managed system behavior.

## Phase-specific Planner context

Do not use one ever-growing universal Planner prompt. The same Planner is reused across phases, but Context Builder assembles different context for each phase.

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

After Owner confirmation creates the immutable Execution Task, planning switches from the Discussion world to the formal execution world.

Default context should include:

- Fixed System Protocol;
- Owner Planner Guidance;
- immutable Execution Task Specification as the primary semantic input;
- current Project Context;
- Project resource summary;
- selected reusable Role descriptors (role_id, name, description);
- only the formal/current facts needed to build the Plan.

Do not inject the full Todo Discussion by default after the Task has been frozen. Rejected ideas, reversals, and exploratory conversation should not continue to pollute execution planning when the effective requirement is already captured by the Specification.

Planner does not need full Role instructions in order to choose a Role. Full Role instructions are injected later when that Role actually executes a Node.

### REPLAN

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

Do not return to the full Todo Discussion unless an explicit read is needed to resolve a concrete ambiguity.

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

The preview is transient UI state, not a persisted domain object and not yet an Execution Task.

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

A Replan creates a new complete Plan revision and switches `current_plan_id`. Old plans remain as history.

Replan is required when collaboration structure changes, for example adding a Node, removing a not-yet-started Node, changing dependencies, turning future work from serial to parallel, or replacing future Role assignments.

Completed Nodes, Artifacts, Events, Execution Logs, and Workspace/Git state remain.

Runtime switching is not Replan. Rework of an existing Node is not Replan.

Replan should preserve valid existing work and change only what is necessary for the future, even though the stored result is a complete new immutable Plan revision.

V1 requires Owner confirmation before a requested Replan is published.
