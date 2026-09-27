# Owner Review & UI

## UI principle

Do not expose orchestration internals as the primary product experience.

The Owner should see work, results, decisions, and attention requirements.

Node IDs, Attempt IDs, Runtime sessions, Worktrees, raw DAGs, and logs are secondary debugging/execution details.

## Primary information architecture

~~~text
Todo / Inbox
→ long-lived things to think about

Todo Detail
→ Discussion
→ independent Execution Tasks created over time

Execution Board
→ global view of formal Execution Tasks

Execution Task Detail
→ Overview
→ Timeline
→ Execution Details

Projects
→ long-lived Project context/resources
~~~

Planner/Role/Runtime configuration belongs to settings/infrastructure areas, not the primary daily workflow.

Do not introduce a separate Activity page to replace the Execution Board.


## Todo workspace

Todo is the fastest capture surface in the product.

Creating a Todo should require only the idea itself. Project selection is optional and must not block capture. The Owner can associate the Todo with a Project later.

On desktop/web, selecting a Todo should not navigate away from the Todo list into a completely separate page.

The application already has a global primary navigation sidebar. Do not add a separate third scope column inside Todo, because that would create an unnecessarily deep four-column desktop layout.

Prefer a two-column Todo workspace inside the main content area:

~~~text
Global navigation | Todo workspace

┌───────────────┬──────────────────────┬─────────────────────────────────────┐
│ App menu      │ Todo list            │ Selected Todo                       │
│               │                      │                                     │
│ Todos         │ [scope/filter ▼]     │ Discussion with Planner             │
│ Execution     │ [search]             │                                     │
│ Projects      │                      │ Execution Task preview/cards        │
│ Settings      │ Todo A               │                                     │
│               │ Todo B ← selected    │ Message composer                    │
│               │ Todo C               │                                     │
└───────────────┴──────────────────────┴─────────────────────────────────────┘
~~~

Scope/filter controls belong at the top of the Todo list column rather than in a separate column.

Useful scopes are intentionally small:

- Active — default working set;
- Inbox — active Todos with no Project;
- Project — filter active Todos by one Project;
- Archived — explicit secondary view.

Project filters may use a compact dropdown/menu rather than permanently listing every Project.

The Todo list remains visible while the Owner discusses the selected Todo on the right.

This reduces context drift when several Todos are active: the Owner can always see which Todo is selected and can switch directly without leaving the workspace.

### No Todo selected

When no Todo is selected, the right workspace should show a quiet empty state rather than auto-opening an arbitrary Todo.

Recommended empty state:

~~~text
No Todo selected

Select a Todo on the left to view it or start a discussion.

[Create Todo]
~~~

The primary creation surface still lives in the Todo list column. The right-side Create Todo action, if shown, should simply focus/open that same capture flow rather than introducing a second creation model.

Do not invoke Planner, show Current Understanding, or preload a Discussion when no Todo is selected.

When possible, the client may restore the Owner's previously selected Todo for the current scope/session if it still exists and is visible. If there is no valid previous selection, remain in the explicit empty state rather than automatically selecting the first Todo.

If the current scope contains no Todos at all, the empty state may instead explain that the scope is empty and point to the same quick-capture action.

The right side is the Todo working surface, not a modal that hides the surrounding Todo context. On smaller/mobile screens the same information may use a full-screen presentation, but the conceptual model remains list + selected Todo workspace.

The selected Todo workspace contains:

- Todo title and optional Project association;
- Original Capture;
- optional expandable Current Understanding after Discussion has begun;
- long-lived Discussion;
- transient Execution Task preview when proposed;
- inline cards for confirmed Execution Tasks created from this Todo;
- message composer.

### Todo list behavior

Default ordering is by recent Discussion activity, not by manual priority.

Discussion activity includes Owner messages, Planner replies, and creation of a confirmed Execution Task from that Todo. Background execution state changes must not reorder the Todo list.

A lightweight unread/new-reply dot may appear beside a Todo when Planner activity completed while the Owner was viewing another Todo. Do not show Execution Task states such as Running, Review, Agent count, or Node progress on Todo rows.

Todo rows should remain compact and recognizable rather than becoming mini task cards.

Recommended row content:

~~~text
● Runtime fallback handling           MonoLab
  Codex quota exhausted; switch Claude        12m
~~~

Use:

- first line: Owner-controlled title when one exists; otherwise a deterministic display excerpt from the original capture text;
- second line: most recent meaningful Owner/Planner Discussion text, truncated to one line;
- trailing time: recent Discussion activity;
- optional unread/new-reply dot;
- optional lightweight Project label only in cross-Project views such as Active.

Do not auto-generate or silently replace the Todo title with AI, and do not create or persist a separate AI-generated Todo summary only for list rendering. Prefer deterministic use of recent meaningful Discussion text. If the latest message is trivial or empty, the UI may walk backward to the most recent useful text.

When the current scope is already a specific Project, omit the repeated Project label from every Todo row.

Do not add priority, labels, due date, board status, Agent count, progress, or other project-management metadata to the Todo row.

Each Todo keeps its own composer draft. Switching from Todo A to Todo B and back must restore A's unfinished draft instead of sharing one global draft buffer.

Planner work is independent per Todo. The Owner may switch to Todo B while Planner is still responding in Todo A. A may complete in the background and surface a lightweight unread indicator without stealing focus or blocking work in B.

Todo conversation context, Working Requirement State, draft text, and unread state are isolated per Todo to prevent cross-Todo context leakage.

### Planner activation

Todo capture is passive. Creating a Todo does not automatically start Planner work.

Simply selecting/opening a Todo also does not invoke Planner. The Owner may review, organize, or archive captured ideas without spending model work or creating unsolicited replies.

Planner is invoked only after an explicit discussion action, such as:

- the Owner sends a message in that Todo's Discussion composer; or
- the Owner explicitly chooses a "Discuss / Ask Planner" action.

The original capture text remains available as context for the first Planner turn, but Planner does not respond to it until the Owner explicitly starts Discussion.

This allows the Owner to rapidly capture many ideas and leave some untouched indefinitely.

### Original Capture presentation

Do not render the Todo's creation content as if it were the first chat message sent to Planner.

Show it as a lightweight, distinct Original Capture block above Discussion, for example:

~~~text
Original Capture

Runtime fallback should not replan the Node when Codex quota is exhausted...

Captured Sep 27, 20:42
~~~

Below that block, Discussion begins only after the Owner sends the first message to Planner.

On the first Planner request, provide Original Capture + Project Context when assigned + the Owner's first Discussion message as context.

This preserves the semantic distinction:

- Original Capture = what the Owner wanted to remember;
- Discussion = when the Owner decided to actively work through it with Planner.

### Execution Task preview

Every proposed Execution Task must be previewed before formal creation, regardless of whether creation was initiated through natural language or a UI button.

The preview should be lightweight:

~~~text
Execution Task Preview

Title
...

Specification
...

Project
Morie / Unassigned

[Cancel] [Continue discussing] [Confirm & Start]
~~~

The Owner can reread the exact title/specification that will become immutable.

The preview is not a persisted Draft Task and should not introduce another domain lifecycle. It is temporary UI state.

After confirmation, the system creates the immutable Execution Task and replaces/inserts the preview with a confirmed inline card in the Discussion flow.

A confirmed Execution Task card may show:

- title;
- created time;
- current execution state;
- View Task;
- Run/Review status appropriate to the current Task state.

The card anchors the moment in the Discussion when that formal execution was created, while full execution detail remains in Execution Task Detail / Execution Board.


## Project overview

Project UI should remain a light overview and scope lens, not become another project-management dashboard.

A Project overview may show:

- Project name and Owner-authored Context;
- linked Resources and their default refs;
- a compact summary of active Todos;
- a compact summary of current Execution Tasks;
- actions to edit Project Context / Resources.

Project-scoped Todos and Execution Tasks should still use the canonical Todo Workspace and Execution Board.

For example:

~~~text
Project: MonoLab

Context
...

Resources
6spot/MonoLab · main

Active Todos        8   [View in Todos]
Current Executions  3   [View in Execution]
~~~

Selecting `View in Todos` opens the Todo Workspace with the Project filter applied.

Selecting `View in Execution` opens the Execution Board filtered to the Project.

Avoid duplicating a full Todo list, full Execution Board, or another task state model inside Project Overview.

## Execution Board

Board columns are user-facing organization, not a 1:1 copy of internal Task states.

V1:

~~~text
Queued
Running
Review
Done
~~~

Suggested mapping:

~~~text
QUEUED
→ Queued

RUNNING / BLOCKED / REPLAN_REQUIRED
→ Running
  + Needs Attention decoration when applicable

REVIEW
→ Review

COMPLETED
→ Done

CANCELLED
→ history/filter, not a permanent primary column
~~~

Attention may be shown as a filter/section inside the Board.

Todo cards do not show Execution Task runtime state. Todo and Execution Task are separate concepts.

## Task Overview

Overview should answer four questions:

1. What is this Task?
2. Where is it now?
3. What has it produced?
4. Does the Owner need to do anything?

Default content:

- immutable Execution Task Specification;
- current status/attention;
- current Progress;
- formal Outputs;
- stage-appropriate Owner actions.

Do not default to DAGs, Attempts, Runtimes, or raw logs.

## Progress

Do not use percentages or ETA.

Use deterministic counts and human-readable groups, for example:

~~~text
3 / 5 completed

Completed
✓ Analyze current lifecycle
✓ Refactor window management
✓ Fix history layout

In progress
● Verify memory release

Waiting
○ Final regression check
~~~

Progress is a projection of the current effective Plan and Node states.

After Rework/Replan, show only the current effective work. Old Plan structure, removed Nodes, and rework history belong in Timeline.

The real DAG is for development/debugging only and should not appear in normal Owner UI.

## Timeline

Timeline shows meaningful formal changes, not raw operation noise.

Default emphasis:

- meaningful work completed;
- formal Artifacts published;
- Rework requested;
- Replan requested/approved/published;
- Owner decisions;
- Task ready for review;
- Task completed.

Runtime failover, session resume, heartbeat, Workspace creation, and raw commands belong in Execution Details unless they materially affect Owner understanding.

Multiple low-level Events may be grouped into one human-readable Timeline entry.

Timeline is semantic history: it explains what formally happened and what was produced.

## Execution Flow

Below Timeline, show a separate lightweight execution-flow block.

This is not another semantic Timeline and it is not the Plan DAG.

Its purpose is to let the Owner visually see how work moved through the Task by showing when each Node/work item was triggered and when it reached its current or terminal state.

A compact row may show:

~~~text
Analyze current lifecycle
Triggered 18:32
Completed 18:47

Refactor window management
Triggered 18:47
Completed 19:06

Verify memory release
Triggered 19:06
Running

Final regression check
Waiting
~~~

Recommended fields:

- human-readable Node goal;
- trigger/start time;
- current Node state;
- completion/block/cancel time when applicable;
- duration may be derived for display.

Do not show percentage progress.

Do not show the DAG or dependency edges.

Do not show Runtime, Session, Attempt IDs, Worktree details, or raw logs in this block.

Sort primarily by actual trigger time so the Owner can read the execution sequence directly.

A Node that has never been triggered may appear as Waiting without a trigger time.

If a Node is reactivated by Rework, keep the same Node identity and show its additional activation in a compact way rather than inventing a new Node. The full historical reason for the Rework remains in Timeline.

This block is a deterministic projection of Node lifecycle timestamps/states, not a new persisted object and not model-generated content.

## Execution Details

Execution Details is the diagnostic layer, but the UI should remain flat.

Node is the primary visible execution unit. Attempt remains an important backend model for fallback, recovery, Session ownership, and log attribution, but it should not become a required navigation level.

Do not force the Owner through:

~~~text
Node
→ Attempt
→ Log
~~~

Instead, select a Node and show its current/latest execution information directly in the same view:

~~~text
Node Detail

Status / trigger time / completion time

Current execution
- Runtime
- Model
- Thinking
- start time
- last activity / end time
- end reason when relevant

Execution Log

Workspace / Git
- workspace/repository
- start/completion revision
- changed files
- diff

Previous executions   # only when more than one Attempt exists
~~~

The term `Attempt` does not need to appear in normal UI.

If a Node has only one execution, show it directly.

If fallback, retry, or manual Runtime switching creates additional Attempts, expose them as a compact `Previous executions` or `Execution history` section inside the same Node detail view.

For example:

~~~text
Current execution
Claude Code · Succeeded
19:06 → 19:38

Previous executions (1)
Codex · Quota exhausted
18:47 → 19:06
~~~

Selecting a previous execution may switch the visible Execution Log without navigating to another page.

Runtime, Model, Thinking, status, timestamps, and end reason are useful diagnostic information here.

Session ID, Runner ID, Runtime version, raw runtime payloads, and similar infrastructure data should be hidden under an advanced/debug affordance.

For a running Node, execution controls such as Stop or Switch Runtime belong here. These actions affect execution of the same Node; they do not create a new Node or require Replan.

Workspace/Git information belongs in the same Node detail view but remains visually distinct from the Execution Log:

- Execution Log answers how the Agent worked.
- Workspace/Git answers what code state the Node produced.

The backend remains precise:

~~~text
Node
└─ Attempt 1
└─ Attempt 2
~~~

The product UI does not have to mirror that storage hierarchy.

## Owner Review

When all required work is finished, Task enters REVIEW, not COMPLETED.

Review targets the final integrated Task result.

For Git Tasks, Owner reviews the final Task Workspace, not an individual Node Worktree.

Default Review content includes:

- Execution Task Specification;
- completion summaries;
- Artifacts;
- final Git changes/diff/commit information.

V1 Owner actions:

~~~text
Accept / Merge
Request Changes
Cancel
~~~

No Git:
- Accept → COMPLETED.

Git:
- Accept → deterministic Git Delivery;
- delivery success → COMPLETED;
- delivery failure → remain REVIEW.

Git Delivery has its own operation state. Do not expand Task states with MERGING/MERGED/etc.

Request Changes means improving the current result to satisfy the existing immutable Specification. It may cause Rework or a new Plan revision.

A genuinely new requirement outside the frozen Specification goes back to Discussion and becomes a new Execution Task.

Only the Owner can finally accept the Task. Agents cannot self-approve or directly perform final merge/close.
