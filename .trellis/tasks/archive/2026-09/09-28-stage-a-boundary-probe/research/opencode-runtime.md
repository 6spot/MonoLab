# Research: OpenCode 1.18.30 permissions and Linux execution boundary

> Product terminology and command/path examples were normalized to `monos` on
> 2026-09-29. Exact historical names and observations remain in the original Git
> revisions and unchanged raw JSON attachments; this edit is not a new test run.

- Query: Can the installed OpenCode run noninteractively, invoke bundled `monos`, access lazily materialized reserved paths, and keep Planner repositories read-only without a new sandbox framework?
- Scope: mixed; official release source/documentation and monos contracts. No remote changes, provider requests, credential inspection or package installation performed by this researcher.
- Date: 2026-09-28
- Status: source evidence with an **earlier, superseded strict-profile candidate**, not a passed host test. Parent reports one successful free-model text-only request; actual boundary trials remain required.

## Findings

### Superseding user-directed decision

The Owner subsequently stated that normal CLI shell execution should not be restricted and asked how Multica handles it. [Multica source research](multica-runtime-permissions.md) confirms its normal-account/auto-approval model. The main session adopted normal shell freedom: **no shell allowlist, global read-only filesystem profile, PrivatePIDs or read-only XDG workaround**. Keep existing service/execution identity separation, per-Attempt cgroup lifecycle ownership and kernel-attributed Tool Protocol calls. Planner repositories remain read-only through service-owned immutable inspection snapshots and DAC; Node workspaces and normal CLI state remain writable by `me`.

The exact OpenCode source/event/configuration facts below remain useful. The deny-first policy, strict systemd namespace/mount template and corresponding namespace/XDG tests are retained only as historical research candidates, **not implementation requirements**. The current unattended launch may use supported `--auto` (the visible alias corresponding to Multica's `--dangerously-skip-permissions`) while honoring explicit CLI denies. OpenCode's own internal config/plugin maintenance is not automatically a new monos dependency; do not add write restrictions solely to suppress it.

### Earlier candidate for the implementer — superseded above

Use the installed `/home/linuxbrew/.linuxbrew/bin/opencode` version `1.18.30`, explicit `opencode/mimo-v2.6-flash-free`, `run --pure --format json --agent monos-probe --dir <scratch>`, stdin for the assembled task input, and an explicit Adapter-owned configuration. Do not pass `--auto`, `--yolo` or `--dangerously-skip-permissions`.

Use a systemd **service**, not a caller-owned scope, for each Attempt. The fixed execution user is `me`. Native systemd filesystem namespaces provide Planner read-only repositories and narrowly writable Node paths; systemd/cgroup v2 provides whole-tree ownership. OpenCode's tool permissions supplement this boundary but cannot enforce it against arbitrary shell commands. This adds no product abstraction or sandbox dependency and preserves the architecture's non-hostile-Agent / no arbitrary-code-containment claim.

### Exact release evidence and source locations

All OpenCode line numbers below refer to the official `anomalyco/opencode` **`v1.18.30`** tag, fetched successfully from raw GitHub on the research date. The installed version was established by the parent's host evidence; the tag content was not cryptographically matched to the installed binary.

| Official source path | Relevant behavior |
| --- | --- |
| `packages/opencode/src/index.ts:62` | `--pure` sets `OPENCODE_PURE`; documented meaning is “run without external plugins.” It is not clean configuration, a sandbox, or disabled network. |
| `packages/opencode/src/plugin/index.ts:170` | Built-in plugins remain; external plugin list is empty under pure mode. |
| `packages/opencode/src/cli/cmd/run.ts:1` | Default `run` sends one prompt, emits events and exits at idle; interactive/attach modes are separate. |
| `packages/opencode/src/cli/cmd/run.ts:242` | `--auto` auto-approves permissions not explicitly denied; hidden aliases feed the same switch at line 274. |
| `packages/opencode/src/cli/cmd/run.ts:801` | Without auto mode, `permission.asked` is immediately rejected. Warning is printed, then `permission.reply(..., "reject")`. |
| `packages/opencode/src/cli/ui.ts:31` | UI warning output goes to stderr. |
| `packages/opencode/src/config/config.ts:415` | Custom file config loads before project config; it is not a final override. |
| `packages/opencode/src/config/config.ts:482` | `OPENCODE_CONFIG_CONTENT` is parsed and merged after normal file/directory configuration. Managed/account sources may still follow it. |
| `packages/opencode/src/config/config.ts:450` | Even under `--pure`, config loading ensures `.gitignore` and starts background installation of `@opencode-ai/plugin` for configuration directories. |
| `packages/core/src/npm.ts:139` | Dependency installation returns without action when the target config directory is not writable. |
| `packages/opencode/src/config/config.ts:559` | `OPENCODE_PERMISSION` merges global permissions late; invalid JSON is logged and skipped, so never rely on it without validation. |
| `packages/opencode/src/config/paths.ts:23` | `OPENCODE_DISABLE_PROJECT_CONFIG` suppresses ancestor project `.opencode` directories, but home `.opencode` still participates. |
| `packages/core/src/v1/config/permission.ts:5` | Permission actions are `ask`, `allow`, `deny`; keyed object rules preserve input property order. |
| `packages/opencode/src/permission/index.ts:28` | Last matching rule wins, unmatched rule means `ask`. Explicit deny fails before asking. |
| `packages/opencode/src/agent/agent.ts:267` | Custom agents support prompt/model/mode; agent-specific permissions merge after global permissions. |
| `packages/opencode/src/tool/shell/id.ts:14` | Actual tool ID and permission key remain **`bash`**, even though implementation file is `shell.ts`. |
| `packages/opencode/src/tool/shell.ts:263` | External-directory requests match absolute `<directory>/*`; bash permission requests match parsed commands. |
| `packages/opencode/src/tool/shell.ts:369` | Dynamic shell path expressions may be skipped by path inspection. Only selected command names are scanned at line 397. |
| `packages/opencode/src/tool/shell.ts:303` | Shell executes command strings under host process permissions, with detached process groups on POSIX. |
| `packages/opencode/src/tool/shell.ts:416` | Native shell inherits runtime process environment plus plugin additions. |
| `packages/opencode/src/tool/external-directory.ts:24` | File/directory access outside instance paths checks absolute parent-directory wildcard. |
| `packages/opencode/src/tool/read.ts:255` | `read` permission pattern is **relative to instance.worktree**. |
| `packages/opencode/src/tool/edit.ts:102`, `packages/opencode/src/tool/write.ts:54` | `edit` permission patterns are also relative to instance.worktree, not necessarily absolute paths. |
| `packages/core/src/global.ts:10` | XDG data/cache/config/state roots, plus OS temp, contain OpenCode state. Startup creates these directories. |
| `packages/core/src/v1/config/config.ts:52` | `snapshot`, `share`, `autoupdate`, `model`, `small_model` are supported settings. |
| `packages/core/src/v1/config/agent.ts:20` | Custom primary-agent prompt and permissions are supported; `steps` forces a text-only response after its limit, so it is not a guaranteed lifecycle-call mechanism. |

Source links: [run](https://github.com/anomalyco/opencode/blob/v1.18.30/packages/opencode/src/cli/cmd/run.ts), [configuration](https://github.com/anomalyco/opencode/blob/v1.18.30/packages/opencode/src/config/config.ts), [agent configuration](https://github.com/anomalyco/opencode/blob/v1.18.30/packages/opencode/src/agent/agent.ts), [shell](https://github.com/anomalyco/opencode/blob/v1.18.30/packages/opencode/src/tool/shell.ts), [permission evaluation](https://github.com/anomalyco/opencode/blob/v1.18.30/packages/opencode/src/permission/index.ts), [release permission docs](https://github.com/anomalyco/opencode/blob/v1.18.30/packages/web/src/content/docs/permissions.mdx).

### Earlier restricted configuration recipe — not adopted

The following is a **candidate Planner configuration**, to validate under the installed binary before launching real trials. Replace example paths with canonical task-owned paths. The custom agent is an Adapter implementation detail, not a monos Role or Runtime Profile. Keep its complete policy in the selected agent as well as any global baseline; a global permission change alone does not override an existing agent-specific rule.

```json
{
  "$schema": "https://opencode.ai/config.json",
  "model": "opencode/mimo-v2.6-flash-free",
  "small_model": "opencode/mimo-v2.6-flash-free",
  "share": "disabled",
  "autoupdate": false,
  "snapshot": false,
  "shell": "/bin/bash",
  "agent": {
    "monos-probe": {
      "mode": "primary",
      "model": "opencode/mimo-v2.6-flash-free",
      "prompt": "Adapter-owned fixed Tool Protocol instructions; use the native bash tool to invoke monos for formal actions. Natural-language output is never a formal transition.",
      "permission": {
        "*": "deny",
        "read": "allow",
        "glob": "allow",
        "grep": "allow",
        "bash": "allow",
        "edit": "deny",
        "external_directory": {
          "*": "deny",
          "/var/lib/monos-probe/execution/attempt-a/scratch/*": "allow",
          "/var/lib/monos-probe/execution/attempt-a/inspection/*": "allow"
        },
        "question": "deny",
        "task": "deny",
        "skill": "deny",
        "lsp": "deny",
        "webfetch": "deny",
        "websearch": "deny",
        "plan_enter": "deny",
        "plan_exit": "deny"
      }
    },
    "title": {"model": "opencode/mimo-v2.6-flash-free"},
    "summary": {"model": "opencode/mimo-v2.6-flash-free"},
    "compaction": {"model": "opencode/mimo-v2.6-flash-free"}
  }
}
```

- The `*` rule comes first. Do not lexically sort permission object keys after generation: precedence is meaningful.
- `bash: allow` permits native shell operation under the Linux filesystem boundary; it does **not** grant filesystem authority itself. `monos`, repository inspection and arbitrary userland write-attempt tests can then run noninteractively. Narrow bash command patterns may reduce mistakes but are not a security boundary or a robust shell parser policy.
- Planner scratch JSON can be written via shell. If allowing a native edit tool for scratch, generate patterns relative to the actual `instance.worktree`; do not assume the documentation's absolute edit example matches this release's implementation.
- Node profile: give `edit` appropriate relative scratch/workspace allow rules, or use `edit: allow` with the OS writable allowlist as the authoritative write boundary. Keep `external_directory` default deny and add each reserved Node workspace/worktree and Git common directory. The reserved path itself and descendants must match the request's `<dir>/*`; do not grant `/var/lib/monos-probe/*` wholesale.
- Do not treat external_directory as a network or Unix-socket permission. These are ordinary syscalls from `bash`/`monos`, governed by Linux and backend authentication. No MCP server is needed.
- Pin main, small/auxiliary and custom-agent models to the verified-free model. Disabling `task` prevents model-created native subagents from choosing another configured model. Validate resolved built-in title/summary/compaction configuration and record model IDs emitted by real events; explicit main `--model` alone does not demonstrate that all auxiliary work is free.
- Set `OPENCODE_DISABLE_PROJECT_CONFIG=1`, `OPENCODE_DISABLE_AUTOUPDATE=1`, `OPENCODE_DISABLE_LSP_DOWNLOAD=1`, `OPENCODE_DISABLE_EXTERNAL_SKILLS=1` and `OPENCODE_DISABLE_CLAUDE_CODE=1` in the Adapter's explicit environment. `--pure` remains useful but is not a replacement for these or resolved configuration checks.
- Use an Adapter-generated `OPENCODE_CONFIG_CONTENT` or a service-owned config file plus verified override strategy. Do not edit repository files or Owner configuration. The content must contain no backend/Runner credential. Normal CLI-owned credentials remain on the host under the existing execution identity.
- OpenCode data/cache/state/config paths must exist, and the runtime paths that persist state must be writable. Prefer task-owned XDG subdirectories for this anonymous free-model probe to isolate test history from Owner history; keep the real execution home and resolve any CLI-owned provider requirements before changing XDG paths. Home `.opencode` and managed sources can still affect config, so inspect only sanitized resolved policy/model fields. `debug config` prints **the whole config**, which can include secrets; capture and parse it privately, never stream it to logs.
- **`--pure` does not prevent dependency installation.** Config loading still ensures `.gitignore` and starts a background `@opencode-ai/plugin` installation (`config.ts:450`). A minimal no-install probe variant is to precreate the task-owned XDG config directory and its `.gitignore`, keep that directory read-only, and use `OPENCODE_CONFIG_CONTENT`; `core/npm.ts:139` skips non-writable directories. Data/cache/state/temp remain writable as required. Precreating `.gitignore` avoids a read-only-filesystem write during config loading (`config.ts:309`); its startup catch only handles PermissionDenied, so do not assume every EROFS error is swallowed. Verify the complete configuration-directory list and behavior under the real binary before adopting this variant. Do not modify Owner configuration to make it pass, and do not count CLI-internal installation as disabled merely because external plugins are disabled.
- `read: allow` above is acceptable for non-secret fixture content. If retaining `.env` exclusions, add explicit relative rules; release docs say `.env` defaults deny but release implementation at `agent.ts:129` uses ask. Do not depend on defaults for a claimed protection.

### Earlier strict systemd service candidate — not adopted

Candidate fixed service properties, supported by official **systemd v257** documentation and awaiting test on host 257.13:

```ini
[Service]
Type=exec
User=me
Group=me
NoNewPrivileges=yes
CapabilityBoundingSet=
AmbientCapabilities=
ProtectSystem=strict
ProtectHome=read-only
ProtectControlGroups=yes
ProtectKernelTunables=yes
RestrictNamespaces=yes
PrivatePIDs=yes
PrivateTmp=yes
KillMode=control-group
SendSIGKILL=yes
Restart=no
UMask=0077
ReadWritePaths=/var/lib/monos-probe/execution/attempt-a/scratch
```

The launcher must add only exact approved writable roots for runtime XDG state and, for Nodes, reserved workspace/worktree **and Git common directory**. Planner inspection roots are never writable. Keep logs/journal/credential storage outside every granted execution subtree with ordinary account permissions as well. Empty capability sets and `NoNewPrivileges` ensure the execution-owned Linuxbrew executable is never invoked with root authority. Scope privileged launch/stop/freeze operations to fixed user, task-owned unit IDs and canonical paths; validate symlinks and prevent arbitrary unit properties/environment from a caller.

Why these details matter:

1. `ProtectSystem=strict` mounts the filesystem read-only except API filesystems; `ReadWritePaths` creates exact writable exceptions without overriding DAC. `ProtectHome=read-only` still permits reading the installed Linuxbrew executable and CLI configuration. `PrivateTmp` intentionally provides writable service temp. Do not set `ProtectHome=yes`, which hides Linuxbrew under `/home`.
2. **Do not enable `PrivateNetwork`**, or deny AF_UNIX/AF_INET/AF_INET6, in this profile. Provider HTTPS, backend HTTPS and the Runner Unix socket must work. A socket's parent can be read-only: connecting to an existing Unix socket does not create a filesystem entry. Socket mode/parent search permissions and actual connection must still be tested. Read-only mounts do not protect a writable socket protocol; cgroup attribution and backend auth do that.
3. `PrivatePIDs=yes` exists in systemd v257 and hides other same-UID processes from the Attempt's `/proc` view, closing easy alternate-path access through another process's `/proc/<pid>/root` or `cwd`. `ProtectProc=invisible` alone hides other UIDs, **not** other same-UID Attempts. Runner remains outside this PID namespace and must derive host PID with `SO_PEERCRED`, host `/proc` birth identity/cgroup, and boot ID; never trust the CLI's namespace PID hint. With PrivatePIDs, the namespace init's death kills remaining namespace processes; test actual signal behavior and keep cgroup verification authoritative.
4. `RestrictNamespaces=yes` restricts later namespace creation/switching by the Agent, without preventing ordinary threads/process creation. It complements no CAP_SYS_ADMIN; test OpenCode/Bun and shell tools under it. It does not create a new product sandbox feature.
5. Attempt cgroup directories must not be writable/delegated to `me`. A service-unit tree owned by systemd is sufficient; do not set `Delegate=yes` on an Agent unit. If the Runner service uses delegation, delegation belongs to its service identity and the narrow launcher; do not make `cgroup.procs` writable by the execution account.
6. `KillMode=control-group` stops every cgroup member, including shell children in a detached session/process group. `setsid` and double-fork do not escape a cgroup. Freeze before finalization, and verify `cgroup.events`/process inventory rather than freeing claims after only the main PID exits. Preserve durable unit/dispatch mapping and host boot identity across Runner restart.
7. Pre-create **stable empty reserved directories before launch**; do not prefix necessary grants with `-` to silently ignore absent paths. Lazy clone/materialization must fill those directories, not rename/replace a bind-mounted root inode. An absent-at-launch `ReadWritePaths=-...` is not a durable grant for a later-created path. Reserve Git common directories separately before concurrent worktree use.
8. Do not create nested writable host mounts beneath Planner read-only paths during an Attempt. systemd documents that newly propagated host mounts can remain writable. This is a probe constraint, not full hostile-host containment. Prefer ordinary directory materialization and check the resulting mount view.
9. An inherited writable descriptor or connection to a more privileged helper is not blocked by read-only mounts. The launcher closes unneeded descriptors; `monos` never receives host directory FDs or a broad administrative service. Preserve the architecture's explicit no arbitrary-code-containment claim.
10. `NoNewPrivileges` affects this process tree, not new processes started through an external user manager, cron/at daemon or other IPC service. Keep user-manager sockets such as `/run/user/1000/bus` inaccessible to probe Attempts when present, do not inject a user bus address or PAM login session, and test `systemd-run --user` fails. Apply task-specific `InaccessiblePaths` only after checking compatibility; do not mask the Runner socket or claim cgroup ownership alone fences unrelated external services.

Systemd references: [v257 systemd.exec](https://github.com/systemd/systemd/blob/v257/man/systemd.exec.xml), [v257 systemd.kill](https://github.com/systemd/systemd/blob/v257/man/systemd.kill.xml), [v257 resource control](https://github.com/systemd/systemd/blob/v257/man/systemd.resource-control.xml). The current rendered systemd documentation was also fetched, but the versioned source is authoritative for proposed host properties.

### Structured events and formal-call reliability

`run.ts:678` emits JSON Lines objects containing `type`, `timestamp`, `sessionID` and type-specific fields. Relevant types are:

| Event | Evidence and Adapter implication |
| --- | --- |
| `step_start` | `part.type=step-start`; activity observation, not task state. |
| `step_finish` | Step result/usage; may recur; not Node completion. |
| `text` | Emitted only once a text part has `time.end`, not for every streaming token. Do not advertise incremental token streaming from this interface without further verification. |
| `tool_use` | Emitted for completed **or error** tool parts. Inspect `part.tool`, `part.state.status`, input/output/error and tool exit metadata; occurrence alone is not success. |
| `reasoning` | Only when enabled and finalized; do not require it. |
| `error` | Session/prompt errors. Keep objective provider category, sanitized message, original evidence and process exit distinct. |

Permission requests are not directly emitted as a dedicated JSON event by `run`. Source shows an exact stderr warning `permission requested: ...; auto-rejecting` followed by tool failure. The Adapter can normalize this documented-for-the-pinned-source behavior to permission-denied/attention, and capture the subsequent structured error. It must not infer “waiting for input” from silence. A denied tool can be followed by a normal assistant response and process exit zero, so exit zero is not enough to pass a required-tool case.

`run --format json` uses an in-process server for its local SDK path (`run.ts:948` onward), not a required externally listening `opencode serve`. Avoid `--attach` for this probe. stdin is read as the prompt (`run.ts:40`, input handling before session creation); preserve one invocation per Attempt. Session IDs are opaque, recorded with Runner/runtime identity. Resume and live input remain optional until separately tested; do not enable `--continue` to pick a convenient prior session.

The model must call native `bash` → bundled `monos`. The CLI journals its immutable envelope through the attributed Unix channel **before HTTPS send**. Only a backend receipt/admitted operation proves formal completion. A model's JSON/prose or OpenCode `step_finish` cannot substitute for that. After admitted completion stops the OpenCode tree, absence of a final `tool_use` or clean process exit is expected; Runner reads the admitted result with its own scoped recovery authority.

### Earlier candidate test matrix — use current decision to select cases

Run deterministic syscall/permission checks first with the exact service properties, then bounded real free-model trials under those same properties. Record failed trials as well as successes.

| Case | Required observable result |
| --- | --- |
| Resolved config | Installed binary parses custom primary agent, exact free main/small/auxiliary models and permission rules. Output is sanitized before leaving host. No paid fallback or model change. |
| Planner tool use | Real OpenCode calls `monos --help`, reads a fixture repository and writes a request input in scratch. Actual backend HTTPS and Unix socket connection succeeds. |
| Planner write attempts | `touch`, shell redirection, Python open/write, Git write/commit and symlink-path write against repository fail; file bytes, refs and metadata remain unchanged. Test `/proc/<other>/root` alias is inaccessible when same-UID companion exists. Successful scratch write is a positive control. |
| Noninteractive deny | Deliberately denied `edit`, `task` or out-of-grant directory tool produces refusal/error without blocking for stdin; no effect occurs. Do not use `--auto` to make the case pass. |
| Lazy Node paths | Runtime starts before repository contents exist; service materializes into reserved stable dirs; same OpenCode session reads/writes and commits there. Git common-dir writes work for Node and fail for Planner. |
| Unix attribution | Two concurrent same-UID Attempts call socket with forged peer Attempt/session/PID hints. Host peer PID + birth/boot/cgroup binds each to its actual dispatch; no cross-credential/journal access. |
| Process escape attempts | Native shell launches background child, `setsid`, double-fork and child ignoring TERM. They stay in unit cgroup; freeze/kill prevents any further sentinel writes. No write access to another cgroup or successful user-manager escape. |
| Real lifecycle | At least the task-prescribed repeated bounded trials call a real formal command. Compare backend receipt/request digest to intended input. Text-only success fails this case. |
| Completion/recovery | Completion admission stops caller; no final stdout required. Runner recovers original operation after daemon reconnect and expired Agent credential. No new Agent mutation is authorized. |
| Runtime storage | OpenCode state/history writes stay in explicitly allowed task-owned XDG/temp roots; read-only repository does not break provider HTTPS. No updates/LSP downloads/plugins cause unexpected writes. |

No host reboot is needed for the above focused runtime tests. The separate agreed-window reboot acceptance item remains outstanding until executed.

### monos files and related specs

| Repository path | One-line relevance |
| --- | --- |
| `ARCHITECTURE.md` | Tool Protocol owns formal state; Planner repositories are read-only. |
| `docs/08-principles-and-non-goals.md` | No Runtime Profile, no CLI installation/login automation, no lifecycle transitions from prose. |
| `docs/03-runtime-and-execution.md:37` | Adapter verifies headless events, fixed context, bundled CLI, noninteractive grants and session behavior. |
| `docs/05-tool-protocol.md:269` | CLI journal/credential channel verifies kernel process attribution, immutable envelopes and scoped recovery. |
| `docs/11-technology-and-deployment.md:75` | Native Linux execution, distinct service/execution identities, existing runtime login and no arbitrary-code-containment claim. |
| `.trellis/spec/runner/execution-guidelines.md` | Durable start intent, cgroup/birth/boot attribution and Planner socket/HTTPS requirements. |
| `.trellis/spec/runner/workspace-guidelines.md` | Pre-reserved lazy paths and Git common-dir grants. |
| `.trellis/spec/runner/quality-guidelines.md` | Real Linux/runtime evidence, not macOS or fake-adapter equivalence. |
| `.trellis/spec/protocol/commands.md` | Immutable retries and completion result recovery after caller termination. |
| `.trellis/tasks/09-28-stage-a-boundary-probe/design.md:65` | Approved permission/isolation probe and explicit OpenCode free-model substitution. |
| `.trellis/tasks/09-28-stage-a-boundary-probe/research/host-preflight.md` | Debian 13.6/systemd 257.13/cgroup v2/OpenCode 1.18.30 and initial 7.15-second text-only success. |

At inspection, backend/protocol package manifests were being scaffolded concurrently; no implemented Runner Adapter was available to cite. Recommendations are source-backed launch patterns, not claims about existing monos source.

## Caveats / Not Found

- Public rendered `opencode.ai/docs/permissions/` and `/docs/config/` returned HTTP 403. GitHub tree API returned rate-limit 403. Versioned raw official docs/source were reachable and used instead. Current `dev` permission docs were also reachable and showed matching general permission semantics; current docs are not proof of installed release behavior.
- One fetch of v257 resource-control source timed out; a subsequent bounded retry succeeded. Versioned execution/kill/service/resource-control docs were read, but documentation support is not runtime proof.
- The user-approved free model's zero-cost catalog and one successful text-only request come from parent evidence; this researcher made no model/API requests. Availability/pricing must be rechecked before real trials; free is not a guarantee of unlimited quota or permanent availability.
- Config ordering has home, managed/account and per-agent layers. `--pure`, a global permission object, or `OPENCODE_CONFIG` alone cannot establish effective policy. Verify sanitized resolved fields in the actual execution environment.
- Systemd properties are supported by v257 documentation, but runtime support/namespace behavior on this concrete kernel remains an empirical gate. If a property fails, record the exact limitation before choosing an equivalent mechanism; do not silently remove the read-only guarantee.
- This profile preserves the architecture's non-hostile-Agent assumption. It is not a promise to contain all hostile same-UID activity or hide credentials independently available to the execution account. Protecting backend/service secrets still requires separate UID/DAC, private DB/network topology and scoped Tool Protocol authorization.
- `PrivatePIDs` changes namespace-local PID views; the Runner must use kernel-observed host identities. Acceptance needs actual socket attribution under this option, not only a systemd configuration parse.
- No remote test repository was authorized in this research. No push/merge/provider-write tests or production credentials are involved.
