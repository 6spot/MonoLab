# MonoLab Architecture

This file is the architecture map. Detailed rules live in the linked modules.

## Product flow

```text
Project
  │
  └─ Todo
      ├─ Discussion
      ├─ Working Requirement State
      ├─ Execution Task A
      ├─ Execution Task B
      └─ ...
```

```text
Owner
  ↓
Todo / Discussion
  ↓
Planner
  ↓
Working Requirement State
  ↓  Owner expresses execution intent
Execution Task
  ↓
Planner
  ↓
Execution Plan
  ↓
Orchestrator
  ↓
Node(s)
  ↓
Execution Attempt(s)
  ↓
Runtime Adapter
  ↓
Codex / Claude Code / OpenCode / ...
```

## Execution data

```text
Execution Task   = what is being executed
Execution Plan   = how work is divided and ordered
Node             = durable collaboration/work unit
Attempt          = one concrete runtime execution
Execution Log    = raw execution process
Artifact         = formal semantic output
Task Event       = formal lifecycle history
Current Task State = small rebuildable current-state projection
Timeline         = UI projection of formal events and artifacts
```

## Workspace

```text
Project Context
  ↓
Node
  ↓
open_workspace(resource_id)
  ↓
Workspace Manager
  ├─ shared Task Workspace for serial execution
  └─ isolated Git Worktree for concurrent execution
```

Agents work freely inside the workspace. System state outside the workspace is controlled through the Tool Protocol.

## UI

```text
Todo / Inbox
  → long-lived things to think about

Todo Detail
  → Discussion + independent Execution Tasks

Execution Board
  → global view of formal Execution Tasks

Execution Task Detail
  → Overview / Timeline / Execution Details

Projects
  → long-lived project context and resources
```

The Execution Plan DAG is an internal execution/debugging structure, not normal user-facing UI.

## Modules

- [01 Product & Domain](docs/01-product-and-domain.md)
- [02 Planner & Planning](docs/02-planner-and-planning.md)
- [03 Runtime & Execution](docs/03-runtime-and-execution.md)
- [04 Workspace & Git](docs/04-workspace-and-git.md)
- [05 Tool Protocol](docs/05-tool-protocol.md)
- [06 State & Formal Data](docs/06-state-and-formal-data.md)
- [07 Owner Review & UI](docs/07-owner-review-and-ui.md)
- [08 Principles & Non-goals](docs/08-principles-and-non-goals.md)
