# AGENTS.md

This repository is the source of truth for MonoLab.

Before changing architecture or implementing a subsystem:

1. Read [ARCHITECTURE.md](ARCHITECTURE.md).
2. Read the relevant module under [docs/](docs/README.md).
3. Preserve the explicit invariants in [docs/08-principles-and-non-goals.md](docs/08-principles-and-non-goals.md).
4. Do not reintroduce concepts that the architecture explicitly removed.

## Architecture rule

MonoLab separates semantic work from deterministic orchestration:

- Agent: understand, reason, decide what work is needed, and call system tools.
- Program: perform deterministic state changes, workspace management, scheduling, persistence, and delivery.

System-level state changes must go through the Tool Protocol. Natural-language output is never a formal state transition.

## Reference projects

Multica may be used as a reference for mature runtime, daemon, repository, session, and execution patterns. Do not copy its organizational/team abstractions into MonoLab.
