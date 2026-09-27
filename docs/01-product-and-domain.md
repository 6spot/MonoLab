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

V1 Project creation should stay small:

~~~text
Project
- name
- context / description
- resources[]
- roles[]
~~~

Project Context is Owner-authored. It may include the project description, long-lived constraints, delivery conventions, and other stable information needed by Planner and execution agents. Do not require AI to generate or own the canonical Project Context.

Resources are the repositories or other execution resources that belong to the Project. Resource-specific default refs belong to the resource configuration rather than the Execution Task.

Roles are also Project-owned long-lived configuration in V1. A Project directly defines the small set of Roles Planner may use for that Project. Do not insert a separate Team / Team Blueprint abstraction between Project and Role.

Project Context is injected directly when Planner or an execution Agent works. Execution Tasks do not duplicate or bind Project resources.

A Todo may be assigned to a Project after capture and may later be moved to another Project. Historical Discussion remains unchanged. Future Planner turns use the Todo's current Project Context.

Existing Execution Tasks never migrate when their parent Todo is moved. Each immutable Execution Task keeps the Project association it had when it was created; later Tasks created from the Todo use the Todo's current Project.

Project lifecycle should remain simple:

- Active Projects are available for normal selection and execution.
- Archived Projects keep Context, Resources, Todo associations, and historical Execution Tasks intact, but are removed from normal active pickers/views.
- Permanent deletion is allowed only when there are no references, unless the Owner explicitly chooses a destructive cascade delete.
- Cascade delete must clearly state that related Todos, Execution Tasks, Artifacts, logs, and other Project-owned historical data will also be permanently removed. It is never the default deletion behavior.

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
├─ Original Capture
├─ Discussion
├─ Working Requirement State
├─ Execution Task A
├─ Execution Task B
└─ ...
~~~

Do not formalize V1/V2/V3 labels. Execution Tasks have their own IDs and creation times.

When a Todo is not yet associated with a Project, Discussion may still continue normally. Project Context is injected only when a Project association exists. The UI should make later Project assignment easy without making it a prerequisite for capture.

## Original Capture

Original Capture is the Owner-authored content recorded when the Todo is created.

It is not a Discussion message and must not imply that Planner was invoked at capture time.

Original Capture remains intact as the historical record of what the Owner first wanted to remember. It may later be used as context when Discussion begins.

## Discussion

Discussion begins only when the Owner explicitly starts interacting with Planner for that Todo, normally by sending the first Discussion message.

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
