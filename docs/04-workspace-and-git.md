# Workspace & Git

## Core rule

Workspace is the system-level logical concept.

Git Worktree is only one technical implementation used for development projects.

Core models should not depend on Git Worktree semantics.

## Project resources

Project Context already contains its repositories/resources.

A repository resource may define an optional default `ref` (branch, tag, or commit) used as the normal checkout/base for future work. If no ref is configured, the system may use the repository's default branch.

This follows the useful separation seen in Multica: the resource owns its default ref; the Task does not need to repeat it.

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

When `complete_node(summary)` succeeds, the system finalizes the Node's workspace state.

For a Git workspace, record:

- start revision;
- completion revision;
- dirty changes that must be persisted.

The Agent is not required to create commits itself.

If the Agent has already committed during work, keep those commits.

If dirty changes remain at completion, the system may create a completion commit/snapshot.

The important boundary is:

~~~text
start_revision → completion_revision
~~~

not "exactly one commit per Node".

## Parallel integration

Parallel Node results are integrated into the Task Workspace by deterministic program logic.

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

Agents do not directly merge the final branch.

Final delivery happens only after Owner acceptance through the system delivery path.
