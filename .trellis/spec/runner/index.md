# Go Runner and Linux Execution

Status: the Go boundary probe under `runner` passed real Linux/OpenCode acceptance on 2026-09-29; recipes are in `infra/runner`. The archived boundary-probe report records the exact LongCat model, four normal completions, live service restart and controlled reboot. Runner startup after reboot was manual. This is not production Runtime integration, the full Task scheduler or delivery implementation.

## Pre-Development Checklist

- Read [execution](execution-guidelines.md), [workspace](workspace-guidelines.md) and [quality](quality-guidelines.md).
- Read [protocol](../protocol/commands.md) for CLI identity/replay.
- Source contracts: [Runtime](../../../docs/03-runtime-and-execution.md), [Workspace](../../../docs/04-workspace-and-git.md), [host topology](../../../docs/11-technology-and-deployment.md).

## Quality Check

Runner owns processes/effects, never semantic scheduling or direct DB updates. Preserve physical ownership beyond logical cancellation. Use durable journal identities for uncertain starts, Git effects and immutable CLI envelopes. Real Linux supervision, two-account Git permissions and installed CLI access must pass the feasibility gate; fake adapters alone are insufficient.
