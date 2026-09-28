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
- provider?            # e.g. github
- provider_repo_id?    # opaque provider identifier
- default_ref?
- default_branch?
- remote_preparation   # automatic (default) | after_acceptance
- merge_method?        # unset = first method the repository allows
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
instruction_files[]   # repository agent instructions at the root, e.g. AGENTS.md / CLAUDE.md
~~~

Repeated calls for the same Node/resource should be idempotent.

The Fixed Agent Protocol directs the Agent to read the returned instruction files before working. They describe repository conventions, are not copied into Project Context, and cannot override the Fixed Agent Protocol or Tool Protocol.

The Agent does not manage system-level clone/fetch/checkout/worktree isolation itself.

Workspace Manager owns:

- clone/fetch;
- checkout/base revision;
- workspace reuse;
- Git worktree creation;
- isolation;
- cleanup;
- restoration;
- read-only Planner inspection snapshots.

Inside the returned workspace, the Runtime's native coding tools may freely read/write files, run shell commands, build, test, and search.

A Planner inspection snapshot (module 02) is a disposable read-only materialization at a finalized revision. It is not a Task Workspace, has no delivery lineage, and never becomes a Node input or integration source.

Workspace access must respect current execution ownership. A superseded Attempt must not be allowed to finalize/integrate Workspace state after a successor Attempt has taken ownership.
## V1 Workspace lifecycle

V1 uses one Runner and keeps Task Workspace / Node worktrees local to that Runner.

Create a Task Workspace lazily when the first execution step actually needs a repository. Do not create repository workspaces merely because the Execution Task entered RUNNING.

Task Workspaces clone from a Runner-local repository cache per resource (module 11), which the system fetches from the remote with read-only credentials. The cache is infrastructure, not a workspace or delivery lineage.

For a given repository:

- serial Nodes normally reuse the Task Workspace directly;
- when Nodes must execute concurrently against the same repository, Workspace Manager creates isolated Node worktrees from the current Task Workspace base;
- the Agent and Planner never choose whether to use a worktree;
- a completed isolated Node is finalized and integrated back into the Task Workspace before downstream dependent work is unlocked;
- after successful integration, the isolated worktree may be cleaned up while formal Attempt/log/history remains;
- conflict recovery reuses the same Node identity and rebuilds a fresh worktree from the latest Task Workspace.

Task Workspace remains the canonical execution/review workspace for the lifetime of the Task. REVIEW always uses the integrated Task Workspace.

CANCELLED and COMPLETED are logical lifecycle outcomes, not instructions to immediately delete local Workspace data. Cleanup/retention is an infrastructure policy and may remove local Task Workspace/worktrees later when no longer needed. V1 retention removes a Task's local materializations and scratch space a configurable period after the Task becomes terminal, never while an unfinished completion, delivery, or transfer operation references them. Formal Artifacts and logs stay available through managed storage.


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

Finalization includes tracked modifications/deletions and untracked files that the repository's ignore rules do not exclude. Ignored untracked files are not added automatically; ignore rules do not silently discard changes to already-tracked files. Content findings on tracked files are handled by delivery checks. The completion revision must descend from the revision the Node's workspace started from, so Task Workspace history stays append-only; Agents update from the target branch by merging, not rebasing. A result that breaks this rule or exceeds a deterministic limit such as a maximum file size fails finalization with the offending revision or paths; nothing is silently repaired. The Node is then blocked with that reason, and Retry starts a new Attempt that can fix the result.

If finalization or required integration fails, `complete_node()` fails and the Node must not be marked COMPLETED.

V1 does not guarantee recovery from permanent loss of the Runner's local disk. Cross-Runner durability / external Workspace persistence is a future capability, not a V1 requirement.

## Parallel integration

Parallel Node results are integrated into the Task Workspace by deterministic program logic.

For a Node whose result must affect downstream repository state, required integration is part of the completion boundary. Downstream Nodes must not be unlocked until the completed result is durably integrated into the Task Workspace.

If integration conflicts, do not first mark the Node COMPLETED and then discover that its result cannot be used. Preserve the Attempt/log/finalized result as history, rebuild the same Node workspace from the latest Task Workspace, and retry the same Node activation with a new Attempt according to the conflict recovery path. The activation does not advance: none of its results became current, and activation advances only for Rework.
If integration succeeds without conflict, continue automatically.

If a later integration conflicts with an already-integrated result, do not create a permanent "merge-agent" business concept.

A simple V1 recovery is:

1. preserve the old Attempt/log/result under its operation ref;
2. rebuild the conflicting Node workspace from the latest Task Workspace;
3. start a new Attempt for the same Node activation, with the conflict facts and the preserved result revision as explicit input;
4. let it adapt its work to the new base.

The Node identity remains unchanged.

If the collaboration structure itself is no longer sufficient, the Agent may request Replan.

## Final Task Workspace

Owner Review for Git tasks always reviews the integrated Task Workspace, never an arbitrary Node Worktree.

Agents do not directly push the final delivery branch, create the final PR, or merge the final branch.

## Git delivery

Formal remote delivery is owned by MonoLab, not by the execution Agent.

For GitHub-backed resources with automatic remote preparation (the default), when all required work is integrated and the Task enters REVIEW, MonoLab automatically starts delivery preparation:

1. finalize the Task Workspace and prepare a candidate delivery commit from its exact result tree;
2. run pre-push checks on that candidate and its publication range;
3. create or reuse a Task delivery branch;
4. push that branch through the configured Git provider credentials;
5. create or update the GitHub pull request automatically;
6. read GitHub checks / CI status;
7. read mergeability;
8. expose the prepared delivery in Owner Review.

There is no separate Owner-facing "Prepare PR" step in V1.

Pre-push checks inspect the actual candidate delivery history: all commits newly reachable from the proposed delivery head relative to its recorded verified remote parents, and every introduced/changed file version in those commits, including content later deleted. Checking only the net base-to-head diff is insufficient. Also check the final delivery tree for configured content findings. Findings identify commit, path, content digest and rule; matching credential values are redacted from UI/logs. The scan records its rule/configuration version and the exact candidate head/parent set.

Checks flag tracked files excluded by ignore rules, files over a configured size limit, credential-pattern matches, and workflow-file changes the provider integration lacks permission to push. They run locally when the Task enters REVIEW in both preparation modes. Findings stop remote preparation. The Owner may request corrections or explicitly override eligible content findings with a receipt bound to the result, candidate head, scan version and finding IDs. Missing provider permissions are not overridable; fix authorization or remove the prohibited change. Any candidate/parent/rule change requires rechecking and invalidates the previous override. Passing checks is not proof that a result contains no secrets.

A resource may set `remote_preparation: after_acceptance`, for example for a public repository or for CI that exposes secrets to pushed branches. REVIEW then shows only the local result. Accept pushes the delivery branch, opens the review request, waits for required checks on that exact head, and merges. A failure at any step leaves the Task in REVIEW, and any review request already opened stays open.

The review request title is the Task title; its body is rendered deterministically from current completion summaries and a MonoLab Task reference, and updates re-render it. `merge_method` selects merge, squash, or rebase; when unset, delivery uses the first of these the repository allows. Internal Task Workspace history and published delivery history are separate. Published delivery branches only fast-forward; MonoLab never force-pushes them. The candidate construction and recovery rules below enforce this independently of Agent commit history.

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

## Internal history and publication history

V1 retains Agent commits, completion/integration revisions, and operation refs as internal execution history. They remain useful for diagnosis and corrective work, but are not pushed as the delivery branch's ancestry. Delivery exports the exact finalized result tree; it does not silently edit or filter that tree. If its content needs correction, use Request Changes and revalidate the new result.

The system creates a delivery candidate commit with that result tree and controlled parents:

- for the first publication, the recorded repository base commit verified as an existing remote revision;
- for later publications, the last reconciled published delivery head, preserving fast-forward updates;
- when adapting to a newer target, an additional verified remote target revision may be included only if that revision was integrated into the internal result. Never use a private Agent/completion commit as a delivery parent.

This preserves target-merge ancestry without publishing private intermediate commits. Persist the candidate commit identity, parent set and construction metadata once per operation so retries reuse exactly the same head. An unpushed candidate rejected by checks may be replaced from a corrected result using the same published parent basis; preserve the rejected candidate as internal history. Never replace a candidate whose push outcome is uncertain until remote reconciliation establishes whether it was published.

Each candidate manifest maps `source_workspace_revision` and `result_tree_id` to `delivery_head` and its parents. Verify tree equality before publication. Internal test evidence retains its actual source revision; provider CI and acceptance bind the exact delivery head. Changing a candidate head, even with the same tree, requires fresh head-specific checks and any necessary acceptance. A signing/build process that depends on commit identity must validate the delivery commit itself.

Only the explicit delivery ref and its intended reachable history are published. Do not push internal refs/tags, use mirror/all-ref push, or copy Agent commit messages into delivery commit metadata. Generate delivery commit metadata from controlled Task/version identifiers. An unexpected remote head blocks preparation for reconciliation rather than force-push or silently replacing its lineage.

For example, an internal commit may add a credential-like value and a later corrective commit remove it. A clean exported result can then pass checks because the private intermediate commit is not an ancestor of the delivery head. Conversely, any prohibited content still in the exported tree must be corrected or explicitly handled under the finding policy; export is not an automatic content sanitizer.

If sensitive content was already published, deleting it in a later commit does not remove its remote history. Stop automatic delivery and report the affected published revision for explicit remediation. Credential revocation/rotation and any provider-side history cleanup are separate Owner-controlled operations; ordinary Rework does not claim to undo exposure and MonoLab does not automatically rewrite remote history.

## Delivery targets, acceptance, and partial delivery

At first workspace creation record the resolved base commit and a branch delivery target from resource configuration. A tag or commit may be a checkout base, but cannot itself be a merge destination; resolve the repository's configured/default branch separately. Existing workspace targets do not move when Project defaults change.

Entering REVIEW exposes the local integrated result immediately. PR preparation proceeds as a durable delivery operation; preparation failures remain in REVIEW with Retry and the exact failed step. Review never depends on successful network access merely to become visible.

Owner acceptance binds the effective Plan, current Node activations, Artifact set, and each repository's source result tree, exact candidate delivery head/parents and target branch. The candidate exists locally even when remote preparation waits for acceptance. No new Agent work starts while final delivery is active. Merge uses the provider's expected-head guard. Head changes, Request Changes, or Rework revoke acceptance; a new acceptance is needed for changed code. Required checks must apply to that exact head. If the provider cannot enforce the expected-head condition, V1 does not offer automatic merge through that provider. Target-branch movement requires fresh checks and mergeability evaluation; adapting Task code to it requires renewed review.

The recorded base and delivery target never move automatically. Before each activation first opens a resource, the system fetches the target branch into the resource cache with read-only credentials and refreshes the workspace's remote-tracking refs, so Agents see the current target without holding credentials. When the provider reports conflicts or an out-of-date branch, Review shows it (module 07). Resolving it is ordinary Request Changes feedback; Planner can route it to Rework because keeping the result mergeable into its delivery target is within every Specification. The new activation receives the provider's mergeability facts and the current target revision and merges the target into the Task result; the next preparation updates the same review request.

Each delivery item has a stable identity and durable operation progress. After an uncertain push/create-PR/merge response, reconcile remote branch/PR state before retrying. A timeout does not prove failure. Find an existing PR by its delivery identity rather than creating duplicates.

Multiple repositories are not an atomic transaction. Before finalizing the first delivery item, validate all items and their applicable prerequisites; then deliver in stable resource-ID order. GitHub items finalize on confirmed merge; plain-Git items finalize only when the system records exact-version Owner acceptance together with verified branch publication. A preparation push alone never finalizes an item. Record each successful item immediately. If a later item fails, remain REVIEW and display partial delivery explicitly. Retry only undelivered items under still-valid acceptance. Never automatically revert already-merged repositories. Once any item has finalized, Request Changes cannot reopen that delivered result as if nothing shipped; finish remaining approved delivery or cancel the remainder. Further execution is initiated separately by the Owner through Todo Discussion as an independent Task. Cancellation never undoes a completed remote merge and must reconcile in-flight operations before reporting their outcome. It closes open review requests for undelivered items and keeps their branches.

For arbitrary Git URLs without PR/merge capabilities, V1 prepares a Task delivery branch and exposes its exact commit/diff. With automatic preparation, push that branch during REVIEW and offer `Accept delivered branch`. A successful push is preparation only: before final acceptance is recorded, Request Changes and authorized requirement revisions remain available under the ordinary guards and update the same branch by fast-forward. Merely publishing the branch does not trigger partial-delivery restrictions.

Plain-Git final delivery requires both an exact-result Owner receipt and verified publication of that accepted commit. Reconcile the remote ref to the candidate head, then record the item's final acceptance under the current Task/result and pending-input guards. A mismatched or uncertain remote head leaves REVIEW with recovery attention; never accept a different head or treat a timeout as success. Persist the verified head and observation with the receipt. Later remote edits do not rewrite the historical accepted version, and MonoLab does not claim to prevent external branch changes.

With `remote_preparation: after_acceptance`, show the local candidate and label the action `Accept & publish branch`: Owner confirmation authorizes publication of that exact candidate, but the item remains unfinished until publication is verified and final acceptance is recorded. A failed push remains REVIEW with Retry. An input or Request Changes admitted before that final record prevents finalization; reconcile any in-flight push as preparation and resolve the input before proceeding. A push alone never converts new input into a post-delivery request.

Final acceptance and conflicting Owner commands serialize on Task control. If final acceptance wins, the ordinary final/partial-delivery restrictions apply. Once every item is finalized, the Task can complete. Merging the branch into the target is manual and explicitly outside plain-Git delivery; Task completion never claims such a merge happened. Missing write credentials remain a REVIEW delivery error. Agent runtimes never receive delivery credentials.

Request Changes serializes with delivery dispatch: revoke acceptance and cancel pending merge dispatch before routing feedback. While that routing operation is unresolved, Task remains REVIEW but the backend rejects new acceptance and merge admission, even if all Nodes are still COMPLETED and all checks pass. Finishing PR preparation or refreshing checks cannot clear this guard. If a merge request is already in flight, reconcile its outcome first and apply the partial-delivery rules if it succeeded. A plain-Git push in flight is preparation until final acceptance is recorded; its success alone does not block correction. Likewise, old PR-preparation workers may not push after a newer result version is prepared; delivery operations serialize per item and validate the current result version before remote mutation.

## Location-independent workspace identity

A Task Workspace is a logical workspace per `(task_id, resource_id)`. Its ID is stable; `path` is only a Runner-local locator returned to the execution that can access it. Control/UI APIs address Workspace IDs and result revisions through Workspace services, not by opening paths on the backend host. A workspace record includes its host Runner, storage incarnation, materialization generation, repository identity, recorded base/target, and finalized revision. These are Workspace infrastructure facts, not duplicated Task resources.

Storage incarnation identifies the local storage lineage. Replacing a Runner disk or registering a new machine under an old display name cannot make old paths valid. A missing incarnation/materialization is an explicit unavailable result. V1 does not promise to recover lost disk contents by cloning the remote default branch.

The Workspace service owns a durable operation journal and enforces materialization generation plus expected revision on local side effects, including checkout, integration, reset, and cleanup. Backend authorization is necessary but insufficient: a stale worker must not delete or mutate a workspace that a newer generation owns. A successor operation takes over only after the previous local worker is stopped/reconciled; lock timeout alone is insufficient. Do not hold a database transaction open while waiting on Runner RPC or Git commands. Persist operation admission, execute locally, then commit the reconciled result with the appropriate version guard.

A future transfer preserves the logical Workspace ID but creates a new materialization generation/location. Before switching authority, quiesce source writers and operations, transfer a system-produced manifest containing exact Git objects/refs and any required private/untracked result data, verify content on the destination, and atomically publish the new location. Old source materializations become inaccessible to current execution before cleanup. This contract leaves transport implementation open; V1 does not require an external Workspace Store, live migration, or Agent checkpoints.

An attempt fencing token fences Agent commands; a materialization generation fences local workspace ownership. Neither token is a substitute for terminating writers. For future distributed Nodes, immutable result manifests and serialized integration at the authoritative Task Workspace must exist before a remote Node can become COMPLETED or unblock dependants.

## Integrated result and validation evidence

Conflict-free Git integration is not semantic validation. Completion records identify the repository revisions actually inspected/tested and the produced result revision; a human-readable test claim cannot silently apply to code integrated later from another Node.

When the Specification requires validation of the combined result, Planner must arrange a final verification work item dependent on every contributing code-producing branch, or keep implementation and final verification in one Node. This is goal-specific planning, not a fixed Reviewer Role, Artifact type, or mandatory workflow template. The Orchestrator checks declared dependencies and provenance; it cannot infer semantic test coverage.

Later integration, corrective Rework, or a merge from the target branch makes earlier validation evidence historical for that older revision. Review displays that attribution and required provider checks apply to the exact delivery head. The UI must not describe the final result as verified merely because every Node declared completion or an earlier head passed CI.

Read-only repository inspection produces no delivery item when the finalized Task result has no changes to deliver. Such a Task can still publish analysis Artifacts and use Owner Accept. Define Git delivery from modified results, not merely from whether `open_workspace` was called.

Integration never treats database success as proof of file durability. The local implementation must make its result objects, operation refs, and journal recoverable across supported process/host restart before acknowledging them. Permanent storage loss remains outside V1's guarantee. Retention cannot delete results still referenced by unfinished completion, delivery, or transfer operations.

For same-repository concurrent Tasks, each Task keeps its own workspace and delivery lineage. Target-branch movement is handled through fresh provider checks/mergeability and, when needed, reviewed corrective work; one Task never resets another's workspace. Within a Project, prevent accidental duplicate repository resources for the same canonical provider repository identity, so URL aliases cannot create competing delivery items for one repository in the same Task. Plain-Git canonical identity resolution belongs to the repository adapter.

## Requirement changes and delivery basis

Delivery manifests and Owner acceptance bind the effective Specification revision, applicable Plan, activation/evidence basis and exact result mapping. A new requirement revision invalidates earlier acceptance even when its result tree is unchanged. Prior test evidence may be carried forward only with explicit applicability recorded under module 06; changing requirements does not rewrite historical tests or commits.

Pending unclassified Task input or unresolved correction/change guards new acceptance and remote delivery dispatch. Dispatch admission serializes with input/change admission under Task control. An already-admitted push/merge may still finish: a newly saved message cannot revoke a provider operation already in flight. Reconcile its outcome before changing that delivery basis. A successful earlier merge is reported truthfully; it is never represented as delivery of a later requirement.

After any item has merged or final branch-only delivery has completed, do not admit in-place requirement changes to that delivery batch. Preserve its accepted basis, reconcile/finish or explicitly cancel remaining delivery, and explain that new requirements must be initiated separately by the Owner through Todo Discussion as an independent Task. Messages received during uncertain delivery remain durable with this outcome explained. Never compensate by automatically undoing a remote merge or rewriting published history.

Before irreversible delivery, a requirement change preserves workspace/result history and the existing PR lineage where applicable. Settle admitted workspace/push operations, invalidate incompatible candidate/acceptance metadata, and prepare the revised result under the same controlled public ancestry rules. A requirement change is not permission to reset recorded repository base/target or migrate workspaces.

### Input arriving after delivery dispatch

New input prevents subsequent provider write dispatch, but never rewrites the basis of an already-admitted write. If that write definitively failed without final delivery, route the input normally before retry. A successful preparation push, including a plain-Git push authorized by an earlier acceptance receipt, does not itself finalize delivery; process pending input before recording plain-Git final acceptance. If a merge succeeded or plain-Git final acceptance was already recorded, resolve changed-scope input with an explanation that it cannot change this delivery and that further execution must be initiated by the Owner through Todo Discussion. Do not create a Task preview or automatically transfer that input into Todo. Record this disposition and show it to the Owner, rather than retaining an impossible in-place change guard forever.

If every accepted item has already delivered, record COMPLETED against the original accepted Specification/Plan/result even when newer messages await interpretation. Those messages remain durable and are processed as terminal-Task conversation. The completion transaction does not treat the new input as fulfilled or propose/create another Task. For partial delivery, pause remaining dispatch until new input is resolved or explicitly withdrawn, then offer retry of the unchanged accepted remainder or cancellation. This exception reconciles a delivery already in flight; it never permits admitting a new merge while pending-input guards exist.

## Provider refresh without inbound webhooks

V1 delivery correctness does not depend on a public webhook endpoint or an open browser. Persist scheduled refresh/reconciliation work for active delivery items. Backend workers poll provider checks, commit statuses, mergeability and uncertain push/PR/merge outcomes with bounded backoff, jitter and rate-limit handling. Webhooks, when configured, are authenticated deduplicated wakeups that accelerate the same reconciliation path; they are not authoritative lifecycle transitions.

Tie every observation to the repository, PR/branch identity and exact head. Stale CI success for an old head cannot authorize a new merge. Pending checks, temporary unknown mergeability, revoked permissions and rate limits remain visible delivery attention/progress; none is inferred success. Restore access and Retry through the same operation identity. Recheck required provider conditions immediately before guarded final delivery. An unchanged head does not override a new Owner input guard.

For no-change or non-Git Tasks, do not wait for a nonexistent PR: Owner acceptance of the exact requirement/Plan/output manifest completes the Task when its required local work and all input guards are settled. This uses the same authorization boundary and preserves Artifacts independently of workspace paths.
