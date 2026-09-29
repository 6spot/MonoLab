# AGENTS.md

This repository is the source of truth for monos.

Before changing architecture or implementing a subsystem:

1. Read [ARCHITECTURE.md](ARCHITECTURE.md).
2. Read the relevant module under [docs/](docs/README.md).
3. Preserve the explicit invariants in [docs/08-principles-and-non-goals.md](docs/08-principles-and-non-goals.md).
4. Do not reintroduce concepts that the architecture explicitly removed.

## Architecture rule

monos separates semantic work from deterministic orchestration:

- Agent: understand, reason, decide what work is needed, and call system tools.
- Program: perform deterministic state changes, workspace management, scheduling, persistence, and delivery.

System-level state changes must go through the Tool Protocol. Natural-language output is never a formal state transition.

## Reference projects

Multica may be used as a reference for mature runtime, daemon, repository, session, and execution patterns. Do not copy its organizational/team abstractions into monos.
<!-- TRELLIS:START -->
# Trellis Instructions

These instructions are for AI assistants working in this project.

This project is managed by Trellis. The working knowledge you need lives under `.trellis/`:

- `.trellis/workflow.md` — development phases, when to create tasks, skill routing
- `.trellis/spec/` — package- and layer-scoped coding guidelines (read before writing code in a given layer)
- `.trellis/workspace/` — per-developer journals and session traces
- `.trellis/tasks/` — active and archived tasks (PRDs, research, jsonl context)

If a Trellis command is available on your platform (e.g. `/trellis:finish-work`, `/trellis:continue`), prefer it over manual steps. Not every platform exposes every command.

If you're using Codex or another agent-capable tool, additional project-scoped helpers may live in:
- `.agents/skills/` — reusable Trellis skills
- `.codex/agents/` — optional custom subagents

Managed by Trellis. Edits outside this block are preserved; edits inside may be overwritten by a future `trellis update`.

<!-- TRELLIS:END -->
