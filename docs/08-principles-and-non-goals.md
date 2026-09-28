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
10. Design extension points at provider boundaries, but keep V1 intentionally narrow and GitHub-first.

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
- operation logs inside Task/Timeline;
- Local Directory as a V1 Project resource;
- GitHub-specific repository semantics leaking into core Workspace/Task/Node models;
- Team Blueprint / reusable team-management layer in V1;
- product-level Runner type taxonomy such as Cloud/Tokyo/US/Personal-Mac runners;
- arbitrary Adapter-defined settings UI / exposing every CLI flag;
- installing or authenticating coding Runtimes on behalf of the Owner.

## Important invariants

### Todo is not execution

Todo is a long-lived topic.

Execution Task is a stable delivery objective with its own Conversation and immutable Specification revisions. The effective requirement can change through exact Owner authorization and deterministic publication.

Tasks under one Todo are independent. They do not inherit requirements, conversations, Plans, or execution context from one another. Task Conversation serves only its current Task and cannot propose/create another Task. Terminal Task conversation is read-only; further execution starts through Todo Discussion with a new independent preview and Owner confirmation. Already-delivered repository code remains ordinary Project reality, not inherited Task context.

Do not derive Todo status from Execution Task runtime state.

### Project is the resource boundary

Project Context provides repositories/resources directly.

Tasks do not duplicate or bind Project resources.

The core repository abstraction is Git-based, not GitHub-specific. V1 UX may be GitHub-first through a provider integration and repository picker.

Agents use `open_workspace(resource_id)` when they actually need a repository. Planner inspects repositories only through read-only snapshots and never receives a writable workspace.

### Role is not Runtime

Role describes reusable execution behavior. Project-specific technical constraints belong in Project Context.

Projects directly select which reusable Roles Planner may use.

Execution Policy selects Runtime/model/thinking/fallbacks.

Plans reference Role IDs but do not snapshot Role instructions. New executions use the latest Role configuration; already-running executions keep their already-injected context.

Do not add a Team layer merely to group Roles before assigning them to Projects.

### Node is not Attempt

Node is durable work.

Attempt is one runtime execution.

Runtime switching keeps the Node.

### Rework is not Replan

Rework repeats existing work.

Replan changes collaboration structure.

REPLAN_REQUIRED means the current collaboration graph is insufficient. Request Changes and pending Planner feedback routing are not evidence of that condition. Routing is an internal operation while Task remains REVIEW; apply Rework directly when the graph is sufficient, and create a formal Replan request only when it is not.

### Owner-blocking waits have explicit exits

A control wait that needs the Owner — pending Task input/change, a planning issue, unresolved review feedback, or a Replan request — offers an explicit resolution besides Cancel: answer and retry, withdraw the input/change/feedback, or dismiss the Replan request. Each resolution is a recorded Owner decision; the system never resolves such a wait on its own. Dismissing Replan rejects the structural change, not the originating review feedback; withdrawing feedback is a separate Owner decision.

### Completed is not Accepted

Node Completed means an Agent declared its work complete.

Task Completed means the Owner accepted final delivery.

### Timeline is not Log

Timeline shows formal history and outputs.

Execution Log contains raw operation history.

### System Tool Protocol owns formal state

Workspace-internal coding is Runtime-native.

Workspace-external formal state changes go through MonoLab tools.

### Valid result is not retained history

Rework preserves history and integrated code, but invalidates current output evidence for the affected Node activations. Only valid completed activations in the effective Plan contribute current acceptance evidence.

### Logical fencing is not process isolation

Attempt fencing protects formal commands. Workspace handoff also requires stopping or isolating old writers. A terminal database record alone does not prove that filesystem mutation has stopped.

### Acceptance is version-specific

Owner confirmation is enforced by the command backend and binds the exact proposed Task, Specification revision, Plan, or delivery result. Acceptance binds the effective Specification/Plan and exact result together. Changed content cannot inherit approval. For plain Git, publishing a delivery branch is preparation; final delivery requires recorded exact-version Owner acceptance and verified publication, and does not include a target-branch merge. Multi-repository delivery may partially succeed and must never be presented as atomic.

Successful Owner acceptance freezes that delivery batch and its input cutoff. Earlier unresolved input prevents acceptance; later chat remains available but cannot block or alter the batch, including during checks, retries and partial delivery. Explicit correction/cancellation follows delivery guards. After delivery, further implementation uses an independent Task; accepted history is never reopened through conversation.

### One deployed Runner is not a singleton domain

Stage A/V1 deployment limits do not change data cardinality or module contracts. Runtime policy uses logical integration IDs; process and workspace locations are Runner-scoped infrastructure. Multiple Runners first serve separate Tasks; same-Task distribution requires explicit workspace transport and ownership guarantees.

### Completion evidence is revision-specific

Preserving code, completing work, validating the combined result, and Owner acceptance are distinct facts. Test evidence records the actual input/result revision and cannot automatically validate later integrated code.

### Internal Git history is not publication history

Keep private Agent execution commits for audit and recovery. Delivery exports the exact finalized result tree using controlled public ancestry and checks the actual candidate publication range. Already-pushed delivery history is never rewritten automatically; internal history is not pushed merely because a Node completed.

### Persistent Planner responsibility is not a resident process

Task Planner is available throughout delivery through durable Task context and on-demand Attempts. Runtime session memory is an optimization, never the requirement or conversation source of truth.

### Requirement change is not graph change

Specification revisions change what to deliver. Plan revisions change collaboration structure. A requirement change may use the existing graph; only actual graph insufficiency warrants REPLAN_REQUIRED. Conversation routing and change settlement use internal operations, not new Task lifecycle states.

### Received is not applied

Saving a message, interpreting it, delivering guidance to an Attempt, publishing a requirement revision, and completing the requested work are distinct facts. Record input provenance and recipient outcomes; never infer a formal change or successful implementation from natural-language acknowledgement.
