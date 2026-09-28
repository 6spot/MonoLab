# Go Runner and Linux Execution

Status: the Go boundary probe is implemented under `runner`; Linux installation recipes are in `infra/runner`. The active task tracks real-host acceptance separately from local tests. This is not the full Task scheduler or delivery implementation.

## Pre-Development Checklist

- Read [execution](execution-guidelines.md), [workspace](workspace-guidelines.md) and [quality](quality-guidelines.md).
- Read [protocol](../protocol/commands.md) for CLI identity/replay.
- Source contracts: [Runtime](../../../docs/03-runtime-and-execution.md), [Workspace](../../../docs/04-workspace-and-git.md), [host topology](../../../docs/11-technology-and-deployment.md).

## Quality Check

Runner owns processes/effects, never semantic scheduling or direct DB updates. Preserve physical ownership beyond logical cancellation. Use durable journal identities for uncertain starts, Git effects and immutable CLI envelopes. Real Linux supervision, two-account Git permissions and installed CLI access must pass the feasibility gate; fake adapters alone are insufficient.
