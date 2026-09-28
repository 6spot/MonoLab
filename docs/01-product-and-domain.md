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
- role_ids[]
~~~

Project Context is Owner-authored. It may include the project description, long-lived constraints, delivery conventions, and other stable information needed by Planner and execution agents. Do not require AI to generate or own the canonical Project Context.

Resources are the repositories or other execution resources that belong to the Project. Resource-specific default refs and delivery settings belong to the resource configuration rather than the Execution Task.

Roles are globally reusable behavioral profiles. A Project stores only the Role IDs that Planner may use for that Project.

Do not insert a separate Team / Team Blueprint abstraction between Project and Role. Project selects reusable Roles directly.

Project Context is injected directly when Planner or an execution Agent works. Execution Tasks do not duplicate or bind Project resources.

A Todo may be assigned to a Project after capture and may later be moved to another Project. Historical Discussion remains unchanged. Future Planner turns use the Todo's current Project Context.

Existing Execution Tasks never migrate when their parent Todo is moved. Each Execution Task keeps the Project association it had when it was created; later Tasks created from the Todo use the Todo's current Project.

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

An Execution Task is a stable delivery objective created when the Owner confirms execution intent. It owns a conversation and immutable Specification revisions; an unfinished Task can evolve without creating a new Task for every clarification or requirement change.

~~~text
ExecutionTask
- id
- project_id
- todo_id
- title
- initial_specification_revision_id

SpecificationRevision
- id / task_id / parent_revision_id
- specification   # Markdown
- source_message_ids / authorization_receipt_id
- created_at
- created_by
~~~

The Specification should naturally describe the task, requirements, constraints, and acceptance expectations when useful. Do not force a large JSON schema for semantic content.

Execution Task answers only:

> What has the Owner confirmed should be executed?

It does not contain runtime state, Plan state, resource bindings, Workspace state, Artifact state, or execution logs.

Todo Discussion may continue independently and may later produce another Execution Task. Changes to an existing delivery belong in that Task’s own Conversation; later Todo messages never silently modify it.

Execution Task creation is a hard semantic/module boundary. After creation, planning, execution, replan, review, and delivery belong to the Execution Task and do not depend on the Todo Planner Session, Todo Discussion, or Working Requirement State.

The Todo remains independently discussable. A later Execution Task created from the same Todo starts another independent execution chain.

Execution Tasks created through the same Todo are independent execution chains. They do not inherit one another’s Specification, Conversation, Plan, or execution context, and sharing a Todo creates no predecessor/successor Task relationship. The current Project/repository reality naturally carries forward already-delivered code.

## Configuration changes and execution eligibility

Todo capture and Discussion may remain unassigned, but formal Task creation requires selecting an active Project in the preview. The selection is included in Owner confirmation and the immutable Task association. Start additionally requires at least one selected, available Role. A Project without Roles may therefore hold ready-to-start Tasks while the Owner configures execution.

Project resources need not include a repository: non-Git work is allowed. Archived Projects retain history but reject new Task starts until restored. Archiving does not stop already-started Tasks.

Resource identity is stable. Changing a remote repository creates a new resource identity rather than repointing an existing ID. Default-ref changes affect only future workspace creation; an existing Task Workspace retains its recorded base and delivery target. This bookkeeping belongs to Workspace, not Task resource bindings.

Removing a resource from a Project prevents future workspace opens for that resource. If an unfinished Task already has a workspace for it, reject removal until that Task finishes or is cancelled. Likewise, removing a selected Role is rejected while an effective Plan of an unfinished Task references it. Referenced Roles cannot be permanently deleted; they may be hidden from future selection. Role instructions remain editable and later Attempts still use the latest configuration.

Destructive cascade deletion first cancels execution and reconciles active workspace/delivery operations. If the Runner is unavailable or a remote operation has an unknown outcome, deletion remains pending; it must not erase the ownership and recovery records needed to finish safely.

## Task Conversation and evolving requirements

Task Conversation is the Owner's persistent entry point for questions, guidance, requirement changes, planning issues, and review feedback throughout a Task. Planner is invoked on demand, not kept running continuously. Durable messages and formal records reconstruct context independently of provider sessions.

The Task association with its Project and Todo remains stable. The initial Specification revision preserves creation intent. Orchestrator's Task control record holds `current_specification_revision_id`; each published revision is immutable. There is no second mutable Task specification or Task Working Requirement State competing with that pointer.

Ordinary questions and guidance within the effective requirement do not create Specification revisions. Changes to scope, constraints, or acceptance expectations do. Each revision records exact Owner-authorized content and its source; chat alone does not mutate formal state. Module 02 defines interpretation and impact, module 05 authorization, and module 06 atomic publication.

Owner acceptance freezes the current delivery batch. Later Task messages remain discussable but do not alter or block that accepted result. Further implementation after delivery starts as an independent Task through Todo Discussion; the original Task and its accepted history stay intact. Explicit correction/cancellation before delivery finishes follows module 04's guards.

Specification revisions answer what to deliver; Plan revisions answer how work collaborates. Neither automatically forces a new version of the other. Existing Node identities and workspace history survive compatible requirement changes.

Task Conversation serves only clarification, guidance, refinement, and requirement changes for its current Task. It never proposes or creates another Task. COMPLETED and CANCELLED remain terminal; their conversation permits read-only questions and answers. For further execution or a materially independent objective, the Owner returns to Todo Discussion and initiates an independent Task through the normal preview/confirmation flow. Do not reopen accepted delivery, mutate its historical Specification through chat, or transfer Task context into Todo Discussion automatically.
