# Workspace and Git Effects

Sources: [Workspace](../../../docs/04-workspace-and-git.md), [host permissions](../../../docs/11-technology-and-deployment.md).

## 1. Scope / Trigger

Lazy open/inspection, direct leases, isolated worktrees, finalization/integration, candidate export and retention.

## 2. Signatures

`open_workspace(resource_id)` returns logical workspace ID, Runner-local path and root instruction files. Identity is `(task_id, resource_id)`; records retain host/storage incarnation/materialization generation, base/target and finalized revision. Backend addresses IDs, not host paths.

The current probe implements one local fixture repository through [Git effects](../../../runner/internal/host/git.go), [snapshot export](../../../runner/internal/host/snapshot.go) and [finalization](../../../runner/internal/host/finalize.go). The full serial Task workspace/integration scheduler and remote delivery remain separate implementation work; do not infer them from the probe's fixture paths.

## 3. Contracts

Reserve allowed paths before CLI launch, including Git common directories. Materialize lazily without moving a live process. A resource added after launch is available to later Attempts.

The probe's `createTraversalRoot(path, uid, gid)` explicitly applies `0755` after creating/chowning a new Attempt parent; `mkdir(0755)` alone is filtered by the service's `0027` umask. Execution-owned children explicitly receive `02750`. Existing parents must already have the exact expected owner/group/type/mode; reject symlinks or mismatches without taking them over. Preserve failed Attempt directories and use a fresh Attempt ID after verified release.

One direct workspace lease prevents other Node dispatch for that Task. Multiple admitted Nodes use isolated worktrees from finalized revisions. Serialize integration and reserve a whole multi-repository completion boundary before partial effects can become visible.

Stop writers, finalize, integrate, then grant completion evidence. Preserve operation-specific refs and local journal stages. Interrupted private work is not a completed integrated result. Rework corrects existing code rather than automatically reverting it.

The probe persists finalization inputs before `commit-tree` and retains an operation-specific ref for replay. Typed `recoverable` failures retain the admitted operation; `capture_hard_limit` and `invalid_finalization` block completion. Retrying repairs the same operation, under current activation/basis guards, rather than granting the terminal Agent a fresh mutation.

Service-owned repository caches are execution-readable, not writable. Cross-account clones use `--no-local` without hardlinks/alternates. Scoped `safe.directory` does not replace filesystem permission. Credentialed push stays service-owned. On Git 2.39, local clone strips `GIT_CONFIG_PARAMETERS` before `upload-pack`; argv `-c` trust alone is insufficient across owners. The [Git wrapper](../../../runner/internal/host/git.go) passes only exact known paths in a temporary 0600 `GIT_CONFIG_GLOBAL` file inherited by the transport child, then removes it. Do not modify user/global Git configuration or use wildcard safe directories.

Planner inspection is a service-owned immutable snapshot with service-owned parent directories. Execution can read/traverse it but cannot write, chmod or replace its root through shell. Native shell remains available; ownership protects the supplied snapshot without introducing a global filesystem sandbox.

Export the exact final tree with controlled public parents; never push private Agent commits or all refs. Persist candidate identity once, scan introduced history and final tree, and reconcile uncertain push before replacing a candidate.

## 4. Validation & Error Matrix

| Condition | Behavior |
| --- | --- |
| Stale materialization generation | Reject local mutation |
| Integration conflict | Preserve result; bounded retry same Node/activation |
| Unexpected revision | Stop for reconciliation |
| Local capture hard limit | Preserve work; Node BLOCKED; no completion |
| Publication-only finding | Finalized result enters REVIEW; no remote write |
| Unknown push result | Reconcile before candidate replacement |
| Missing disk lineage | Explicit unavailable; no silent clone-as-recovery |
| Existing Attempt parent has wrong owner/type/mode | Reject preparation; preserve original path |

## 5. Good / Base / Bad Cases

Good: a crash after Git integration resolves from operation refs once.
Base: serial work lazily opens one Task workspace.
Bad: expose partially integrated repositories to downstream work or publish all private refs.

## 6. Tests Required

Exercise two-account fetch/clone/export, direct-lease late repository access, concurrent integrations, crash after each effect, retained private work, cleanup protection and exact candidate-tree equality. Test capture/publication limits separately. Provider write tests require an explicitly authorized test repository.

Run traversal-root tests under umask `0027`, asserting final `0755`, and reject existing files, symlinks and wrong ownership without chmod/replacement. Probe-tool installation separately tests root umask `0077` so its shared driver remains readable.

## 7. Wrong vs Correct

Wrong: a lease timeout alone permits another worker to reset the workspace.
Correct: validate generation/revision, stop/reconcile the old effect owner, then acquire physical ownership.
