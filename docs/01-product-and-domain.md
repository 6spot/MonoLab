# Product & Domain

## Positioning

MonoLab is a personal AI cloud development workspace for one Owner.

The primary loop is:

~~~text
Todo → Discussion → Execution Task → Planner
     → Execution Plan → Cloud Execution
     → Owner Review → Accept / Merge
~~~

Web and Mobile are both first-class clients. Closing a client must not stop cloud execution.

The UX is developer-first. The lower-level execution model should remain generic enough to support other personal-work scenarios later, without turning the first version into a generic workflow product.

## Project

A Project is the long-lived context and resource boundary.

Project Context may include project description and instructions, long-lived constraints, repositories/resources, default refs, and other stable information needed by Planner and execution agents.

Project Context is injected directly when Planner or an execution Agent works. Execution Tasks do not duplicate or bind Project resources.

## Todo

A Todo is a long-lived thing the Owner wants to think about or handle. It is not an execution state.

A Todo may remain open for a long time and can produce multiple independent Execution Tasks over time.

~~~text
Todo
├─ Discussion
├─ Working Requirement State
├─ Execution Task A
├─ Execution Task B
└─ ...
~~~

Do not formalize V1/V2/V3 labels. Execution Tasks have their own IDs and creation times.

## Discussion

Discussion is the long-lived conversation between Owner and Planner. It may contain incomplete ideas, rejected ideas, corrections, reversals, and exploration.

Discussion history remains intact. It is intentionally allowed to be messy.

## Working Requirement State

Working Requirement State is the Planner's current effective understanding of the Discussion.

It is mutable, compact, preferably Markdown, a projection/cache rather than immutable truth, and rebuildable from Discussion if necessary.

It should keep only currently effective information. A useful informal structure is:

~~~markdown
Current goal
...

Confirmed
- ...

Current direction
- ...

Open questions
- ...
~~~

Planner suggestions must not silently become Owner decisions.

## Execution Task

An Execution Task is the immutable formal snapshot created when the Owner expresses clear execution intent.

~~~text
ExecutionTask
- id
- project_id
- todo_id
- title
- specification   # Markdown
- created_at
- created_by
~~~

The Specification should naturally describe the task, requirements, constraints, and acceptance expectations when useful. Do not force a large JSON schema for semantic content.

Execution Task answers only:

> What has the Owner confirmed should be executed?

It does not contain runtime state, Plan state, resource bindings, Workspace state, Artifact state, or execution logs.

Discussion may continue after an Execution Task is created and may later produce another independent Execution Task.

A new Execution Task under the same Todo does not automatically ingest semantic history from older Execution Tasks. The current Project/repository reality naturally carries forward already-delivered code.
