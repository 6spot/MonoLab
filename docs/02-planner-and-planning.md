# Planner & Planning

## Planner

Planner is a system control role.

It is not part of Project Roles and is not a separate user-visible "discussion agent" plus "planning agent". The same configured Planner performs different phases:

~~~text
DISCUSSION
→ MATERIALIZE TASK
→ PLAN EXECUTION
→ REPLAN
~~~

Planner itself runs on a configured Runtime through its own Execution Policy.

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

Role is a logical behavioral profile, not a runtime.

In V1, Roles belong directly to a Project. There is no Team or Team Blueprint abstraction.

~~~text
ProjectRole
- id
- project_id
- name
- description
- instructions
- expected_outputs?   # optional soft guidance
- execution_policy?
~~~

Do not add role_type, capabilities taxonomy, Developer/Tester/Reviewer system types, Role Resolver, or a separate reusable Team layer.

Planner receives the current Project's Roles using only a small descriptor:

~~~text
role_id
name
description
~~~

and directly selects a concrete `role_id`.

Role configuration is expected to change infrequently, so keeping it scoped to the Project is simpler than maintaining a separate global team-management model.

Dynamic multi-Agent orchestration still requires Planner. Planner may select one or more Project Roles only when the work actually benefits from multiple Nodes.

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
