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

## Execution Details

Execution Details is the diagnostic layer.

It may expose:

- Nodes;
- Attempts;
- Runtime used;
- Session identifiers;
- Workspace/Git details;
- Execution Logs.

This is intentionally below Overview and Timeline.

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
