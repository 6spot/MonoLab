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

Workspace access must respect current execution ownership. A superseded Attempt must not be allowed to finalize/integrate Workspace state after a successor Attempt has taken ownership. If Workspace storage is shared across Runners, fencing must also protect system-managed finalize/integration operations from stale writers.
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

## Node completion and durable boundary

`complete_node(summary)` is the durability boundary between transient Runner work and formal completed work.

A Node must not become COMPLETED while its only authoritative code result still exists on one Runner's local filesystem.

When completion begins, Workspace Manager must:

1. verify the current Attempt ownership / fencing generation;
2. prevent that Attempt from continuing to mutate the workspace being finalized;
3. freeze/finalize the Node workspace state;
4. persist a durable checkpoint outside the disposable Runner execution environment;
5. integrate that result into the Task Workspace when integration is required;
6. persist the resulting durable Task Workspace state;
7. only then allow the formal Node COMPLETED transition and downstream scheduling.

The exact checkpoint representation is infrastructure, not a new product/domain object. For Git work it may use durable Git objects/commits/bundles or equivalent backing storage managed by Workspace Manager. Do not require every Node completion to push a user-visible remote branch merely for durability.

The invariant is:

~~~text
Node COMPLETED
⇒ completed result can be reconstructed without the Runner that executed it
~~~

For a Git workspace, preserve enough information to reconstruct at least:

- start revision;
- completion revision / finalized dirty changes;
- the integrated Task Workspace revision after completion when applicable.

The Agent is not required to create commits itself. If it already committed during work, keep those commits. If dirty changes remain, Workspace Manager may create an internal completion commit/checkpoint.

The important boundary is the reproducible code state, not "exactly one commit per Node".

If durable persistence or required integration fails, `complete_node()` fails and the Node must not be marked COMPLETED.

A failed/incomplete Attempt may lose uncheckpointed intermediate edits when its Runner is permanently lost. That is acceptable because those edits never crossed the formal completion boundary.

A COMPLETED Node's result must never depend on that Runner remaining available.
## Parallel integration

Parallel Node results are integrated into the Task Workspace by deterministic program logic.

For a Node whose result must affect downstream repository state, required integration is part of the completion boundary. Downstream Nodes must not be unlocked until the completed result is durably integrated into the Task Workspace.

If integration conflicts, do not first mark the Node COMPLETED and then discover that its result cannot be used. Preserve the Attempt/log/checkpoint as history, rebuild the same Node workspace from the latest Task Workspace, and reactivate/retry the same Node according to the conflict recovery path.
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

For GitHub-backed resources, when all required work is integrated and the Task is ready to enter REVIEW, MonoLab automatically prepares delivery:

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
