# Workspace & Git

## Core rule

Workspace is the system-level logical concept.

Git Worktree is only one technical implementation used for development projects.

Core models should not depend on Git Worktree semantics.

## Project resources

Project Context already contains its repositories/resources.

MonoLab core is Git-first, while V1 product UX is intentionally GitHub-first.

The core resource model must not be named or designed as a GitHub-only object. A repository resource should represent a Git repository with provider metadata layered on top:

~~~text
GitRepositoryResource
- id
- remote_url
- provider?          # e.g. github
- provider_repo_id?  # opaque provider identifier
- default_ref?
- default_branch?
~~~

A repository resource may define an optional default `ref` (branch, tag, or commit) used as the normal checkout/base for future work. If no ref is configured, the system may use the repository's default branch.

V1 should strongly prefer GitHub integration:

- connect GitHub through a GitHub App / provider integration;
- let the Owner pick authorized repositories directly;
- fetch repository metadata and default branch from GitHub;
- keep room for later PR, CI/check, mergeability, and delivery integration.

Also keep a secondary arbitrary Git URL path so the architecture is not provider-locked.

V1 explicitly does not support Local Directory resources. Cloud execution should start from repository resources that a Runner can clone/fetch rather than machine-local paths.

Future providers such as GitLab, Gitea, Forgejo, or self-hosted Git should be able to implement the same Git repository abstraction without changing Workspace, Task, or Node semantics.

The resource owns its default ref; the Task does not need to repeat it.

Execution Task does not bind or copy a resource list.

Planner does not need to preselect which repository a Task will use.

An execution Agent decides which Project resource it actually needs during work.

## Entering a repository

Before an Agent first accesses a Project repository, it must call:

~~~text
open_workspace(resource_id)
~~~

The system returns at least:

~~~text
workspace_id
path
~~~

Repeated calls for the same Node/resource should be idempotent.

The Agent does not manage system-level clone/fetch/checkout/worktree isolation itself.

Workspace Manager owns:

- clone/fetch;
- checkout/base revision;
- workspace reuse;
- Git worktree creation;
- isolation;
- cleanup;
- restoration.

Inside the returned workspace, the Runtime's native coding tools may freely read/write files, run shell commands, build, test, and search.

Workspace access must respect current execution ownership. A superseded Attempt must not be allowed to finalize/integrate Workspace state after a successor Attempt has taken ownership.
## V1 Workspace lifecycle

V1 uses one Runner and keeps Task Workspace / Node worktrees local to that Runner.

Create a Task Workspace lazily when the first execution step actually needs a repository. Do not create repository workspaces merely because the Execution Task entered RUNNING.

For a given repository:

- serial Nodes normally reuse the Task Workspace directly;
- when Nodes must execute concurrently against the same repository, Workspace Manager creates isolated Node worktrees from the current Task Workspace base;
- the Agent and Planner never choose whether to use a worktree;
- a completed isolated Node is finalized and integrated back into the Task Workspace before downstream dependent work is unlocked;
- after successful integration, the isolated worktree may be cleaned up while formal Attempt/log/history remains;
- conflict recovery reuses the same Node identity and rebuilds a fresh worktree from the latest Task Workspace.

Task Workspace remains the canonical execution/review workspace for the lifetime of the Task. REVIEW always uses the integrated Task Workspace.

CANCELLED and COMPLETED are logical lifecycle outcomes, not instructions to immediately delete local Workspace data. Cleanup/retention is an infrastructure policy and may remove local Task Workspace/worktrees later when no longer needed.


## Serial and parallel execution

Serial Nodes normally share the Task Workspace.

When multiple Nodes execute concurrently against the same repository, the system automatically creates isolated Node Worktrees.

The Agent and Planner do not decide whether to use a Worktree.

~~~text
serial
A → B → C
→ shared Task Workspace

parallel
     B
A →  ├
     C
→ isolated B/C worktrees
~~~

The system may isolate concurrent Nodes even when one later turns out to be read-only. Avoid adding a read/write taxonomy merely to optimize away a cheap Worktree.

## Node completion and Git boundaries

`complete_node(summary)` is the formal boundary from active Agent work to a completed Node.

V1 uses one Runner, so Task Workspace and Node worktrees may remain local to that Runner. Do not require an external Workspace Store or cross-Runner checkpoint system.

When completion begins, Workspace Manager should:

1. verify the current Attempt ownership / fencing generation;
2. stop/freeze further mutation of the workspace being finalized;
3. finalize the Node workspace state;
4. integrate the result into the local Task Workspace when required;
5. record the resulting Git revisions / dirty-state snapshot needed for normal same-Runner recovery;
6. only then allow Node COMPLETED and downstream scheduling.

For Git work, record at least:

- start revision;
- completion revision / finalized dirty changes;
- resulting Task Workspace revision when integration occurs.

The Agent is not required to create commits itself. If it already committed, keep those commits. If dirty changes remain, Workspace Manager may create an internal completion commit/snapshot.

If finalization or required integration fails, `complete_node()` fails and the Node must not be marked COMPLETED.

V1 does not guarantee recovery from permanent loss of the Runner's local disk. Cross-Runner durability / external Workspace persistence is a future capability, not a V1 requirement.

## Parallel integration

Parallel Node results are integrated into the Task Workspace by deterministic program logic.

For a Node whose result must affect downstream repository state, required integration is part of the completion boundary. Downstream Nodes must not be unlocked until the completed result is durably integrated into the Task Workspace.

If integration conflicts, do not first mark the Node COMPLETED and then discover that its result cannot be used. Preserve the Attempt/log/finalized result as history, rebuild the same Node workspace from the latest Task Workspace, and reactivate/retry the same Node according to the conflict recovery path.
If integration succeeds without conflict, continue automatically.

If a later integration conflicts with an already-integrated result, do not create a permanent "merge-agent" business concept.

A simple V1 recovery is:

1. preserve the old Attempt/log/result;
2. rebuild the conflicting Node workspace from the latest Task Workspace;
3. reactivate the same Node;
4. let it adapt its work to the new base.

The Node identity remains unchanged.

If the collaboration structure itself is no longer sufficient, the Agent may request Replan.

## Final Task Workspace

Owner Review for Git tasks always reviews the integrated Task Workspace, never an arbitrary Node Worktree.

Agents do not directly push the final delivery branch, create the final PR, or merge the final branch.

## Git delivery

Formal remote delivery is owned by MonoLab, not by the execution Agent.

For GitHub-backed resources, when all required work is integrated and the Task enters REVIEW, MonoLab automatically starts delivery preparation:

1. finalize the Task Workspace;
2. create or reuse a Task delivery branch;
3. push that branch through the configured Git provider credentials;
4. create or update the GitHub pull request automatically;
5. read GitHub checks / CI status;
6. read mergeability;
7. expose the prepared delivery in Owner Review.

There is no separate Owner-facing "Prepare PR" step in V1.

The PR is infrastructure for Review/Delivery, not a separate business decision.

A Task should normally have one delivery branch / PR per modified repository. A multi-repository Task may therefore have multiple delivery items under one Task-level Git delivery.

Request Changes keeps the same Task and normally reuses the same delivery branch / PR. New work is pushed to the existing PR and checks run again.

Owner acceptance triggers the deterministic delivery operation. For GitHub this may refresh checks/mergeability and merge the PR. Only successful final delivery moves the Task to COMPLETED.

If delivery cannot complete because checks fail, mergeability changes, branch protection blocks the merge, provider access fails, or a similar objective condition occurs, the Task remains in REVIEW.

Task state must not be expanded with Git-specific states such as MERGING or MERGED. Delivery operation state belongs to the Git delivery subsystem.

Core delivery remains provider-neutral:

~~~text
Git Delivery
├─ prepare branch
├─ push branch
└─ provider capabilities
   ├─ create/update review request
   ├─ read checks
   ├─ read mergeability
   └─ merge
~~~

GitHub is the V1 provider. Future providers may map those capabilities to Merge Requests, pipelines, and equivalent operations.

## Workspace ownership under late repository access

Workspace Manager serializes allocation and integration per `(task_id, resource_id)`. Repository discovery remains lazy and Agent-driven; no Task resource binding is introduced.

Direct Task Workspace reuse is permitted only when exactly one Node activation is admitted for the Task and no isolated work or integration remains for that repository. While that Node holds a direct workspace lease, no other Node Attempt for the Task is dispatched. This deliberately conservative rule prevents a later `open_workspace()` from forcing a live process to migrate directories.

When multiple Node activations are admitted, they receive isolated worktrees on first repository access, even if only one has opened that repository so far. Worktrees fork from a recorded, finalized Task Workspace revision. Allocation never forks from another Node's dirty working directory. Integration holds an exclusive repository lock and compare-and-set on the expected Task Workspace revision; concurrent completions serialize in operation-admission order.

A direct workspace lease spans the owning activation's live processes and recovery operations. After Stop, failure, or block, Workspace Manager first stops writers and preserves dirty changes in an internal snapshot before releasing the lease. Unfinished changes are not integrated as completed results. Independent work uses the last finalized Task revision. Continuing the interrupted Node restores its private result, adapting to a newer Task base if needed. This is system-managed workspace bookkeeping, not Agent-authored checkpoints.

## Rework code and output policy

V1 Rework is corrective work on the current integrated Task result; it does not automatically revert historical commits. New Attempts receive the Rework reason, the affected Nodes, and a clear distinction between historical and currently valid outputs. They must remove or adapt obsolete code where necessary. Previously completed descendants run again and revalidate their results.

Invalidated completion summaries and Artifacts remain readable as history but are excluded from default current-output context and acceptance evidence. `supersedes` is optional provenance, not the mechanism that makes an invalidated output stop being current.

## Recoverable workspace operations

Database transactions cannot atomically commit Git and database effects. Completion is a persisted infrastructure operation with a stable operation ID, Task/Node activation and Attempt attribution, expected input revision, captured result revision, resulting Task revision, and recoverable stages: admitted, writers stopped, result finalized, integrated, formally committed. These are operation stages, not Node states or mandatory Agent checkpoints.

Before filesystem mutation, persist the operation intent. A per-Task orchestration barrier serializes completion/invalidation admission; a Node completion involving multiple repositories reserves its whole local completion boundary before any integration, preventing another completion from consuming partial results. Acquire repository locks in stable resource-ID order. Preserve result objects under operation-specific Git refs so recovery can recognize an already-applied integration even if database acknowledgement was lost. After integration, commit Node completion, its summary/event, and projection advancement in one database transaction. Schedule downstream work only after that commit. Dispatch intents are durable or reconstructable from canonical state.

On restart reconcile unfinished operations against recorded refs and revisions. Resume missing stages or return an already-committed result; never blindly merge again. Unexpected workspace revisions stop the operation for recovery instead of overwriting them. Multi-repository Node completion records each repository stage separately and marks the Node complete only when every opened repository has settled. Partial local integration blocks review and further workspace use until reconciled.

## Delivery targets, acceptance, and partial delivery

At first workspace creation record the resolved base commit and a branch delivery target from resource configuration. A tag or commit may be a checkout base, but cannot itself be a merge destination; resolve the repository's configured/default branch separately. Existing workspace targets do not move when Project defaults change.

Entering REVIEW exposes the local integrated result immediately. PR preparation proceeds as a durable delivery operation; preparation failures remain in REVIEW with Retry and the exact failed step. Review never depends on successful network access merely to become visible.

Owner acceptance binds the effective Plan, current Node activations, Artifact set, and exact per-repository delivery head and target branch. No new Agent work starts while final delivery is active. Merge uses the provider's expected-head guard. Head changes, Request Changes, or Rework revoke acceptance; a new acceptance is needed for changed code. Required checks must apply to that exact head. If the provider cannot enforce the expected-head condition, V1 does not offer automatic merge through that provider. Target-branch movement requires fresh checks and mergeability evaluation; adapting/rebasing Task code requires renewed review.

Each delivery item has a stable identity and durable operation progress. After an uncertain push/create-PR/merge response, reconcile remote branch/PR state before retrying. A timeout does not prove failure. Find an existing PR by its delivery identity rather than creating duplicates.

Multiple repositories are not an atomic transaction. Before the first merge, validate all items and their checks; then deliver in stable resource-ID order. Record each successful item immediately. If a later item fails, remain REVIEW and display partial delivery explicitly. Retry only undelivered items under still-valid acceptance. Never automatically revert already-merged repositories. Once any item is merged, Request Changes cannot reopen that delivered result as if nothing shipped; finish remaining approved delivery or cancel the remainder and create a follow-up Task. Cancellation never undoes a completed remote merge and must reconcile in-flight operations before reporting their outcome.

For arbitrary Git URLs without PR/merge capabilities, V1 prepares and pushes a Task delivery branch, exposes its exact commit/diff, and offers `Accept delivered branch`. Successful branch delivery plus Owner acceptance completes the Task; merging into the target branch is manual and explicitly outside this delivery mode. Missing write credentials remain a REVIEW delivery error. Agent runtimes never receive delivery credentials.

Request Changes serializes with delivery dispatch: revoke acceptance and cancel pending merge dispatch before routing feedback. While that routing operation is unresolved, Task remains REVIEW but the backend rejects new acceptance and merge admission, even if all Nodes are still COMPLETED and all checks pass. Finishing PR preparation or refreshing checks cannot clear this guard. If a merge request is already in flight, reconcile its outcome first and apply the partial-delivery rules if it succeeded. Likewise, old PR-preparation workers may not push after a newer result version is prepared; delivery operations serialize per item and validate the current result version before remote mutation.

## Location-independent workspace identity

A Task Workspace is a logical workspace per `(task_id, resource_id)`. Its ID is stable; `path` is only a Runner-local locator returned to the execution that can access it. Control/UI APIs address Workspace IDs and result revisions through Workspace services, not by opening paths on the backend host. A workspace record includes its host Runner, storage incarnation, materialization generation, repository identity, recorded base/target, and finalized revision. These are Workspace infrastructure facts, not duplicated Task resources.

Storage incarnation identifies the local storage lineage. Replacing a Runner disk or registering a new machine under an old display name cannot make old paths valid. A missing incarnation/materialization is an explicit unavailable result. V1 does not promise to recover lost disk contents by cloning the remote default branch.

The Workspace service owns a durable operation journal and enforces materialization generation plus expected revision on local side effects, including checkout, integration, reset, and cleanup. Backend authorization is necessary but insufficient: a stale worker must not delete or mutate a workspace that a newer generation owns. A successor operation takes over only after the previous local worker is stopped/reconciled; lock timeout alone is insufficient. Do not hold a database transaction open while waiting on Runner RPC or Git commands. Persist operation admission, execute locally, then commit the reconciled result with the appropriate version guard.

A future transfer preserves the logical Workspace ID but creates a new materialization generation/location. Before switching authority, quiesce source writers and operations, transfer a system-produced manifest containing exact Git objects/refs and any required private/untracked result data, verify content on the destination, and atomically publish the new location. Old source materializations become inaccessible to current execution before cleanup. This contract leaves transport implementation open; V1 does not require an external Workspace Store, live migration, or Agent checkpoints.

An attempt fencing token fences Agent commands; a materialization generation fences local workspace ownership. Neither token is a substitute for terminating writers. For future distributed Nodes, immutable result manifests and serialized integration at the authoritative Task Workspace must exist before a remote Node can become COMPLETED or unblock dependants.

## Integrated result and validation evidence

Conflict-free Git integration is not semantic validation. Completion records identify the repository revisions actually inspected/tested and the produced result revision; a human-readable test claim cannot silently apply to code integrated later from another Node.

When the Specification requires validation of the combined result, Planner must arrange a final verification work item dependent on every contributing code-producing branch, or keep implementation and final verification in one Node. This is goal-specific planning, not a fixed Reviewer Role, Artifact type, or mandatory workflow template. The Orchestrator checks declared dependencies and provenance; it cannot infer semantic test coverage.

Later integration, corrective Rework, or code-changing rebase makes earlier validation evidence historical for that older revision. Review displays that attribution and required provider checks apply to the exact delivery head. The UI must not describe the final result as verified merely because every Node declared completion or an earlier head passed CI.

Read-only repository inspection produces no delivery item when the finalized Task result has no changes to deliver. Such a Task can still publish analysis Artifacts and use Owner Accept. Define Git delivery from modified results, not merely from whether `open_workspace` was called.

Integration never treats database success as proof of file durability. The local implementation must make its result objects, operation refs, and journal recoverable across supported process/host restart before acknowledging them. Permanent storage loss remains outside V1's guarantee. Retention cannot delete results still referenced by unfinished completion, delivery, or transfer operations.

For same-repository concurrent Tasks, each Task keeps its own workspace and delivery lineage. Target-branch movement is handled through fresh provider checks/mergeability and, when needed, reviewed corrective work; one Task never resets another's workspace. Within a Project, prevent accidental duplicate repository resources for the same canonical provider repository identity, so URL aliases cannot create competing delivery items for one repository in the same Task. Plain-Git canonical identity resolution belongs to the repository adapter.
