# Principles & Non-goals

This document prevents architectural drift.

## Core principles

1. One human Owner. Do not model an enterprise organization.
2. Owner controls intent, important decisions, and final acceptance.
3. AI performs semantic work.
4. Programs perform deterministic orchestration.
5. Process may be noisy; formal state stays clean.
6. Cloud execution is first-class and independent of client uptime.
7. Prefer the smallest sufficient abstraction.
8. Build developer-first UX while keeping lower-level execution concepts reasonably generic.
9. Use mature systems such as Multica as implementation references, not as product-model templates.

## Explicitly removed / rejected concepts

Do not reintroduce without a new, explicit architectural decision:

- role_type;
- capabilities[] taxonomy;
- Role Resolver;
- fixed Developer / Tester / Reviewer system roles;
- fixed Implementation / Test / Review Artifact types;
- simple/normal/complex fixed workflow templates;
- Outcome enums that force Agents to classify every result;
- Role-bound Runtime;
- independent Runtime Profile layer;
- Execution Task Resource Binding;
- Task Resource State;
- initial_resources[] as a formal Task boundary;
- Resource selection as a Planner permission gate;
- Node Working State / mandatory checkpoints for recoverability;
- automatic "Runtime hung" inference from silence;
- dynamic runtime scoring by speed/cost/intelligence/predicted quota;
- a user-facing DAG as normal product UI;
- an Activity page that duplicates/replaces Execution Board;
- a large Current Task State semantic summary;
- operation logs inside Task/Timeline.

## Important invariants

### Todo is not execution

Todo is a long-lived topic.

Execution Task is a formal execution snapshot.

Do not derive Todo status from Execution Task runtime state.

### Project is the resource boundary

Project Context provides repositories/resources directly.

Tasks do not duplicate or bind Project resources.

Agents use `open_workspace(resource_id)` when they actually need a repository.

### Role is not Runtime

Role describes behavior.

Execution Policy selects Runtime/model/thinking/fallbacks.

### Node is not Attempt

Node is durable work.

Attempt is one runtime execution.

Runtime switching keeps the Node.

### Rework is not Replan

Rework repeats existing work.

Replan changes collaboration structure.

### Completed is not Accepted

Node Completed means an Agent declared its work complete.

Task Completed means the Owner accepted final delivery.

### Timeline is not Log

Timeline shows formal history and outputs.

Execution Log contains raw operation history.

### System Tool Protocol owns formal state

Workspace-internal coding is Runtime-native.

Workspace-external formal state changes go through MonoLab tools.
