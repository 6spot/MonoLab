# Research: Multica runtime permissions and shell freedom

> Product terminology and command/path examples were normalized to `monos` on
> 2026-09-29. Exact historical names and observations remain in the original Git
> revisions and unchanged raw JSON attachments; this edit is not a new test run.

- Query: The Owner asked how Multica implements CLI restrictions after stating that normal CLI shell execution should not be restricted.
- Scope: internal reference checkout, read-only inspection of `/Users/me/IdeaProjects/multica`; monos recommendations are separate from reference behavior.
- Date: 2026-09-28
- Reference HEAD: `44ea3b40c8b4f54f4c76d1dd3e3c92e0c0cabd19`, branch `main`; the main session subsequently confirmed the commit with `git rev-parse HEAD`.
- Decision status: the main session communicated adoption of normal shell freedom, existing execution/service identity separation, cgroup lifecycle ownership and Tool Protocol attribution. The earlier strict filesystem/PID/XDG profile is **not adopted**.

## Findings

### Direct answer

Multica intentionally runs coding CLIs unattended with the normal authority of the daemon's OS account. It does **not** impose a general shell command allowlist or a filesystem sandbox on Linux. Its own security documentation explicitly locates the boundary outside the daemon: a dedicated Unix user, container or VM.

This is confirmed by implementation, not inferred from names such as `execenv` or `PrepareIsolated`:

| CLI | Actual launch/configuration in this checkout | Approval handling |
| --- | --- | --- |
| Codex | `codex app-server --listen stdio://`; daemon-generated task config selects `sandbox_mode = "danger-full-access"` on Linux | app-server command and file-change approval requests receive `decision: accept`; known network/fileSystem permission requests are granted for the turn |
| OpenCode | `opencode run --format json --dangerously-skip-permissions`; explicit `--dir`, `cmd.Dir`, `PWD`, optional `--model`, `--variant`, `--session`; prompt via stdin | CLI auto-approves permission requests that survive its explicit deny rules; daemon deliberately avoids using a global permission env override for this |
| Claude Code | `claude -p --output-format stream-json --input-format stream-json --verbose --permission-mode bypassPermissions --disallowedTools AskUserQuestion` | daemon additionally answers tool `control_request` with `behavior: allow`; background execution inputs are forced into foreground to preserve lifecycle tracking |

For the installed OpenCode 1.18.30, the previous official-source research established that `--dangerously-skip-permissions` is an alias of `--auto`: it does not override explicit `deny` rules. Therefore “auto-approve unattended requests” is more precise than “all permissions are disabled.”

### Exact source anchors

All paths in this section are relative to `/Users/me/IdeaProjects/multica`.

| Path and line | Evidence |
| --- | --- |
| `apps/docs/content/docs/security-model.mdx:12` | Tasks have the full file, credential and network permissions of the daemon user. |
| `apps/docs/content/docs/security-model.mdx:14` | Explicitly no filesystem-sandbox guarantee; Windows native Codex opt-in is a narrow compatibility exception. |
| `apps/docs/content/docs/security-model.mdx:20` | Rationale: normal home-dependent build/cloud tools; partial write restrictions caused login/config breakage while not preventing credential reads/exfiltration. |
| `apps/docs/content/docs/security-model.mdx:28` | Dedicated Unix user, container or VM are suggested outer boundaries. |
| `apps/docs/content/docs/security-model.mdx:36` | Per-task directories, agent state and API tokens are useful but not hostile-task escape containment. |
| `server/pkg/agent/codex.go:263` | Constructs `app-server --listen stdio://`. |
| `server/internal/daemon/execenv/codex_sandbox.go:68` | Linux full access is a deliberate product decision, not a failing-sandbox emergency fallback; real HOME/XDG preserves installed tool behavior. |
| `server/internal/daemon/execenv/codex_sandbox.go:108` | Non-Darwin/non-Windows policy returns `danger-full-access`. |
| `server/internal/daemon/execenv/codex_sandbox.go:352` | Writes managed `sandbox_mode` at TOML root; only workspace-write mode gets its network flag. |
| `server/pkg/agent/codex.go:1837` | `thread/start` supplies cwd; `approvalPolicy` and `sandbox` are nil so config/defaults apply. Do not infer an enforced `approval_policy=never` from nearby comments. |
| `server/pkg/agent/codex.go:2560` | Auto-accepts command execution and file changes; known network/fileSystem permission shape is handled at line 2598. |
| `server/pkg/agent/opencode.go:69` | Hardcoded `run --format json --dangerously-skip-permissions`. |
| `server/pkg/agent/opencode.go:79` | Sets `--dir` to task cwd. |
| `server/pkg/agent/opencode.go:101` | Prompt delivered via stdin, keeping it off argv and avoiding command-line length limits. |
| `server/pkg/agent/opencode.go:129` | Also sets `cmd.Dir`; line 146 sets `PWD`. |
| `server/pkg/agent/opencode.go:133` | Explains why a deep-merged `OPENCODE_PERMISSION` override could fail to deny questions due to key ordering; relies on run-session explicit denies plus the auto-approval flag. |
| `server/pkg/agent/opencode.go:149` | Inline OpenCode config currently projects MCP only; preserves workdir `opencode.json` model/tool/permission settings. It does not set `--pure` or redirect XDG here. |
| `server/pkg/agent/claude.go:717` | Actual bypassPermissions/stream-json/noninteractive flags, with AskUserQuestion disabled. |
| `server/pkg/agent/claude.go:452` | Auto-approves tool control requests and foregrounds background tool inputs. |
| `server/pkg/agent/claude.go:884` | Rejects root/sudo bypassPermissions unless the environment explicitly indicates a genuine sandbox. It does not create that sandbox or switch users itself. |
| `server/pkg/agent/launch.go:108` | Common runtime construction is ordinary `exec.CommandContext` with structured argv. |
| `server/pkg/agent/claude.go:880` | `buildEnv` merges daemon `os.Environ()` with task overrides. |

Reference commit links: [OpenCode launch](https://github.com/multica-ai/multica/blob/44ea3b40c8b4f54f4c76d1dd3e3c92e0c0cabd19/server/pkg/agent/opencode.go#L69), [Codex Linux policy](https://github.com/multica-ai/multica/blob/44ea3b40c8b4f54f4c76d1dd3e3c92e0c0cabd19/server/internal/daemon/execenv/codex_sandbox.go#L68), [Claude launch](https://github.com/multica-ai/multica/blob/44ea3b40c8b4f54f4c76d1dd3e3c92e0c0cabd19/server/pkg/agent/claude.go#L717), [security model](https://github.com/multica-ai/multica/blob/44ea3b40c8b4f54f4c76d1dd3e3c92e0c0cabd19/apps/docs/content/docs/security-model.mdx#L10). These links identify the recorded baseline; the code inspected was the local working checkout.

### Process ownership is separate from filesystem restriction

Multica's Unix runtime helper at `server/pkg/agent/proc_other.go:22` sets **`Setpgid=true`**, not UID switching, chroot, filesystem namespaces or cgroups. At line 45 it signals the negative process-group PID, falling back to the direct process if group signaling fails; line 54 polls group existence. The OpenCode cancellation path is installed at `opencode.go:115`, and Claude mirrors it at `claude.go:77`. Windows instead uses Job Objects (`server/pkg/agent/proc_windows.go`).

`server/internal/daemon/execenv/isolation.go:16` explains that `PrepareIsolated` is a **killable preparation subprocess** so a stuck filesystem syscall cannot later mutate a retried task. Its Unix implementation at `isolation_unix.go:14` also uses `Setpgid`; “isolated” here does not mean a sandbox or another OS account.

Targeted searches of production `server/pkg/agent` and `server/internal/daemon` found no `SO_PEERCRED`, `GetsockoptUcred`, `boot_id`, `cgroup`, process credential switching, chroot/unshare or Linux read-only mount enforcement in these launch paths. This is a scoped source finding, not proof about external infrastructure around every Multica deployment.

**monos should retain its own cgroup supervision.** A process group does not guarantee that a `setsid`/double-fork descendant remains included, while monos explicitly requires escaped/background descendant handling, restart inventory and birth/boot identity. Cgroups are useful process ownership infrastructure even when all ordinary shell commands are permitted; they do not imply global filesystem restrictions.

### Workspaces, worktrees and home state

- Standard task preparation is an initially empty task workdir; repositories are checked out on demand (`server/internal/daemon/execenv/execenv.go:365`). `Prepare` selects `<envRoot>/workdir`, output and logs at line 436; explicit local-directory and local-worktree modes are separate existing Multica features, not monos concepts to import.
- A local worktree preserves the user-selected subdirectory depth under a private checkout (`server/internal/daemon/execenv/local_worktree.go:124`, line 144). Git worktree creation runs ordinary `git -C <root> worktree add -b ...` (`execenv/git.go:92`). This avoids accidental checkout collisions; it does not restrict other readable/writable paths.
- `server/internal/daemon/daemon.go:96` documents a real Git common-directory failure: Codex workspace-write allowed checkout files but not linked worktree metadata in the shared cache. For Codex on Linux/Windows it still chooses isolated Git metadata layout at line 110, even though default sandboxing is now off. This supports testing Git common-directory permissions explicitly, not inventing shell command restrictions.
- Task `CODEX_HOME` keeps config/session/skills separate, but `auth.json` is linked to shared CLI authentication (`execenv/codex_home.go:17`), while config files are copied (`:23`). This is state-management convenience, not a separate credential boundary.
- `server/internal/daemon/daemon.go:7364` sets task CODEX_HOME; lines 7369–7373 explicitly preserve the daemon user's real HOME/XDG for `gh`, `aws`, `kubectl`, npm and other tools.

### Credential and API boundary

- `server/internal/daemon/daemon.go:141` requires a task token with the `mat_` prefix; it never falls back to daemon credentials. The task environment contains `MULTICA_TOKEN` at line 152. The main launch path repeats this invariant at line 7319.
- `server/internal/middleware/auth.go:77` hashes the token, loads its server record and overrides user-supplied agent/task/workspace identity headers. `server/pkg/db/queries/task_token.sql:6` requires the token not to be expired. Header hints do not decide identity.
- `MULTICA_TASK_CONFIG_ROOT` redirects implicit Multica CLI profile lookup to task-local state (`daemon.go:7371`; `server/internal/cli/config.go:15,274,336`), reducing accidental fallback to an Owner profile.
- Codex's default shell environment excludes credential-like variable names. Multica explicitly restores the **current** task's token and only authorized explicit credential names (`execenv/codex_shell_env.go:16,42`); it filters inherited `MULTICA_*` belonging to the daemon. This is a useful lesson for any future Codex Adapter, not a reason to copy token-in-environment into monos.
- Same-UID tasks still share the underlying account's readable files and credentials. Multica's own docs acknowledge that outer boundary. Its scoped bearer token design does not itself establish monos's stronger kernel-attributed credential/journal channel for concurrent same-UID Attempts.

### User-directed monos choice

The Owner requested normal CLI shell freedom and asked for Multica as the reference. The main session confirmed the following direction; this supersedes the **earlier candidate** strict profile in [OpenCode research](opencode-runtime.md):

1. Let OpenCode execute normal shell commands, build tools, Git and CLI-maintained config/cache/plugin setup under execution account `me`. No shell command allowlist, global `ProtectSystem=strict` read-only filesystem, `PrivatePIDs`, or read-only XDG workaround is required for this task.
2. Use OpenCode's supported unattended approval behavior, with explicit free-model selection. On installed 1.18.30, `--auto` is the visible alias corresponding to Multica's hidden `--dangerously-skip-permissions`; explicit CLI deny rules remain honored. Do not introduce restrictions solely to satisfy assumptions from the earlier candidate profile.
3. Preserve **separate service and execution identities**, because this is an existing monos architecture contract: service-owned journal/enrollment/delivery credentials and protected caches are not normal execution-account state. Runtime/CLI login remains Owner-managed under `me`. Use narrowly scoped launch privileges; no root coding Agent or broad root command endpoint.
4. Preserve per-Attempt cgroups and durable dispatch identity for attribution, whole-tree stop/freeze and restart reconciliation. Keep execution users from moving processes into other Attempts' cgroups. This is lifecycle/Tool Protocol ownership, not a shell whitelist.
5. Preserve Planner's semantic read-only repository contract using **service-owned immutable inspection snapshots with DAC read-only access to `me`**, under parent directories that `me` cannot rename/replace. Node workspaces remain execution-owned and writable. Planner can write scratch and invoke shell/`monos` normally; copying a snapshot into scratch does not mutate the authoritative inspection snapshot. No global read-only mount is necessary for this mechanism.
6. Preserve the existing `monos` Unix socket peer PID/birth/boot/cgroup verification, immutable journal-before-send and backend fencing/receipt validation. Do not replace these with Multica's env hints or simply inject a long-lived daemon token.
7. Distinguish **monos dependencies** from an installed CLI maintaining its own dependencies. OpenCode internally ensuring its config/plugin files is a runtime behavior to observe, not automatically an extra product dependency or a reason to block XDG writes. Intervene only if a concrete runtime behavior prevents acceptance.

Required validation follows this smaller boundary: ordinary shell writes/build/Git/socket/HTTPS work; service credentials/journal and Planner snapshots cannot be modified by `me`; same-UID Attempt hints cannot obtain another dispatch's Tool Protocol authority; background descendants are stopped/reconciled; real formal completion is confirmed by backend receipts. Do not claim hostile arbitrary-code containment or complete isolation among all processes owned by `me`.

### Related monos specifications

- `ARCHITECTURE.md`: semantic Agent work and deterministic Tool Protocol orchestration; read-only Planner inspection.
- `docs/03-runtime-and-execution.md`: installed Runtime Adapter, cgroup/birth/boot ownership, reserved paths and objective permission behavior.
- `docs/05-tool-protocol.md:269`: kernel-attributed Unix credential/journal channel; `:287` separates Planner scratch from read-only repository access.
- `docs/08-principles-and-non-goals.md`: no imported team/organization model, Runtime Profile or runtime installation/login automation.
- `docs/11-technology-and-deployment.md:75`: native execution and no arbitrary-code-containment claim; `:91` service/execution identities.
- `.trellis/spec/runner/execution-guidelines.md`, `workspace-guidelines.md`, `quality-guidelines.md`: process ownership, two-account permissions and real-runtime evidence.
- `.trellis/spec/protocol/commands.md`: immutable requests, current authority and scoped recovery.

## Caveats / Not Found

- This was read-only source research. No Multica code, local/remote environment, installed CLI, model or package was executed or changed. No runtime tests are claimed.
- The main session verified `git diff --quiet HEAD --` succeeds for `security-model.mdx`, `opencode.go`, `codex.go`, `claude.go`, `proc_other.go` and `codex_sandbox.go` at the paths cited above. These selected files match the recorded commit. Other reference files were inspected from the local checkout; no whole-repository cleanliness claim is made.
- Multica's comments about provider/OS bugs are its documented reasons at this commit, not independently verified present-day upstream behavior. The Windows sandbox opt-in and possible future macOS fix do not change its Linux default.
- No per-task Unix user split or kernel-attributed local credential channel was found in the targeted reference launch path. monos must preserve those requirements from its own architecture rather than infer that Multica implements them.
- Do not copy Multica workspace/team/agent organization entities, runtime profiles, MCP broker design or local-directory resource product model. Only the cited native launch and operational lessons are relevant here.
