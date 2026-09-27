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

Todo capture must be fast and low-friction. A Todo does not need to belong to a Project when it is created. Project association is optional at capture time and may be added or changed later.

This supports the primary capture case: the Owner has an idea and records it immediately without first choosing metadata or navigating project structure.

Todo creation is a pure capture/storage action. It must not automatically invoke Planner or any AI model.

The Owner's original capture text is canonical and must not be silently rewritten or renamed by AI. The UI may derive a display label deterministically from the first meaningful line / leading characters, but that is presentation only. If explicit renaming is supported, it is Owner-controlled.

A Todo may remain open for a long time and can produce multiple independent Execution Tasks over time.

Keep Todo lifecycle minimal. V1 only needs active vs archived behavior; do not introduce task-board style Todo states such as Backlog, Doing, Waiting, or Done. Active Todos are the normal working set. Archived Todos are removed from the default working set but remain recoverable.

~~~text
Todo
├─ Discussion
├─ Working Requirement State
├─ Execution Task A
├─ Execution Task B
└─ ...
~~~

Do not formalize V1/V2/V3 labels. Execution Tasks have their own IDs and creation times.

When a Todo is not yet associated with a Project, Discussion may still continue normally. Project Context is injected only when a Project association exists. The UI should make later Project assignment easy without making it a prerequisite for capture.

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
