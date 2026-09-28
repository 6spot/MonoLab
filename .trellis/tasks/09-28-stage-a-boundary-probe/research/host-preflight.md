# Linux host preflight — 2026-09-28

## Evidence boundary

Owner supplied the test host and SSH access in the conversation. Initial read-only SSH inspection succeeded against `100.120.14.84:22`. The SSH password is deliberately not recorded in task files. A subsequent, explicitly authorized configuration transfer is recorded separately below. No package installation, account creation, model request, service deployment or reboot was performed.

These observations establish environment/provider facts, not passing results for PRD AC1–AC10. Later bounded real requests are recorded below.

## Observed host

| Item | Observation |
| --- | --- |
| Distribution | Debian GNU/Linux 13.6 (trixie), x86_64 |
| Kernel | `6.12.107+deb13-amd64` |
| PID 1 / supervisor | systemd 257.13 |
| Cgroups | cgroup v2; controllers include cpuset, cpu, io, memory and pids |
| Virtualization detector | `systemd-detect-virt` reported `none`; this does not prove the host is disposable |
| Existing non-root account | `me`, UID/GID 1000, home `/home/me`, shell `/bin/bash` |
| Execution-account prerequisite | `me` is not in the docker group; `sudo` was not found in the inspected root PATH. Full host boundary checks remain pending. |
| Git / Docker | Git 2.47.3; Docker 29.8.0 |
| System Node.js | v20.19.2; do not treat this as the supported product toolchain selection |
| Other toolchains | Python 3 available; Go and pnpm absent from inspected noninteractive PATH, not proven absent everywhere |
| Available storage / memory | About 400 GiB free on the root/home filesystem; about 13 GiB available memory at inspection |

## Installed CLIs and initial authentication context

| Item | Observation |
| --- | --- |
| Codex | `codex-cli 0.157.1`, `/home/linuxbrew/.linuxbrew/bin/codex` |
| OpenCode | `1.18.30`, `/home/linuxbrew/.linuxbrew/bin/opencode` |
| Installation ownership | Linuxbrew links are owned by `me`; both commands resolve in `me`'s interactive login environment |
| Noninteractive discovery | Default root SSH PATH did not resolve either command. Runner must use the resolved executable and an explicit execution environment, not depend on interactive shell startup. |
| Codex status | `codex login status` returned `Not logged in` for both root and me |
| Root Codex configuration | `/root/.codex/config.toml` exists, selects a custom provider, has a base URL and an inline credential, and sets `requires_openai_auth = false`. No `auth.json` exists. Only boolean configuration facts were printed; provider URLs and credentials were not output. |
| me Codex configuration | No `/home/me/.codex/config.toml` or `auth.json` found |

The status command alone does not establish whether the custom provider can serve requests. No authenticated model request has been sent. Root's configuration must not be assumed accessible to an Agent running as `me`; running the Agent as root would invalidate the intended privilege-boundary test.

The Owner subsequently explicitly authorized copying the existing provider configuration to `me`. This is environment preparation, not a new MonoLab runtime-login feature.

## Authorized configuration preparation

- Source: `/root/.codex/config.toml`; destination: `/home/me/.codex/config.toml`.
- Copied the selected provider stanza and the existing model, model-provider, reasoning-effort and response-storage settings. Root-specific Agent, notification, project-trust, permission, system-prompt and UI settings were not copied.
- Parsed and validated the resulting TOML locally on the remote host; wrote via a temporary file with a no-overwrite final link and synced the file/directory.
- Verified destination owner UID 1000, file mode 0600, directory mode 0700 and readability as `me`. Verified root's source bytes were unchanged.
- No credential values, provider URL, SSH password or configuration contents were printed or stored in the repository. No `auth.json` or session history was copied.
- This establishes configuration availability to the execution account. It does not establish that the provider accepts a real Codex request; that remains an implementation-stage probe case.

## Installed command evidence

`codex exec --help` on this host confirms noninteractive execution, `--json`, `--ephemeral`, `--cd`, `--add-dir`, `--sandbox read-only|workspace-write|danger-full-access`, file/stdin prompts and config overrides. `codex sandbox --help` exposes Linux sandbox execution and named permission profiles. Their presence does not establish that the combined read-only repository, Unix socket, HTTPS and lazy workspace requirements work.

OpenAI documentation retrieval was attempted for `https://developers.openai.com/codex/auth/` and `https://developers.openai.com/codex/noninteractive/`; requests were rejected with HTTP 403. No current official-page claims are inferred from those failed reads. Installed command help and the above host observations are the available evidence; verify exact permission configuration against the installed release during implementation.

## Consequences for the plan

- Initial preference was Codex using the Owner's existing provider. The subsequent explicitly authorized OpenCode/free-model choice below supersedes it; implement only that selected Adapter in this task.
- Use `me` for CLI/workspace execution and a distinct service account for Runner journal/cache/credentials. Root SSH is an administrative bootstrap path, not the Agent identity.
- Use task-owned directories, units, database volumes and loopback/private test endpoints. Check existing resources before choosing ports or paths; no assumptions about unrelated host services.
- Pin supported build dependencies at scaffolding time. Building backend in its own container and cross-building Runner locally can avoid replacing the host's global toolchain.
- Process restart tests affect only task-owned services. A host reboot affects the whole machine and requires an agreed execution window before it is run; do not infer that permission from host access.
- Service account/cgroup delegation, Planner socket/network access, cross-account Git operations and all fault/reboot cases remain untested. The initial real-provider request results are recorded below.

## Implementation checkpoint: Codex provider failure

After implementation approval, two bounded text-only requests as `me` produced no model reply. The 75-second and 35-second limits ended with timeout exit 124; sanitized error events reported `Connection failed: error sending request`. No tool calls were requested and no provider configuration was changed.

Direct unauthenticated diagnostics under both root and `me` established DNS resolution but failed HTTPS handshakes. Verified TLS probes to all four resolved addresses (two IPv4, two IPv6), using default TLS negotiation and TLS 1.2, all returned `SSLV3_ALERT_HANDSHAKE_FAILURE`. A control handshake to `developers.openai.com` succeeded with TLS 1.3. This identifies a connection failure for the configured provider from this host, not an invalid API-key conclusion or a general claim that Codex cannot work.

No certificate verification bypass, provider URL replacement or paid fallback was attempted. The Owner explicitly instructed using OpenCode with a free model if Codex remained problematic; Codex-provider investigation was stopped accordingly.

## Implementation checkpoint: OpenCode free-model success

The installed `opencode models opencode --verbose` catalog lists `opencode/mimo-v2.6-flash-free` as active, tool-call capable, with input/output/cache-read/cache-write costs all zero. Select this model explicitly and recheck cost/availability before subsequent real trials; do not silently choose a paid model.

Executed under `me` in an empty task-owned scratch directory:

```text
/home/linuxbrew/.linuxbrew/bin/opencode run --pure --format json \
  --model opencode/mimo-v2.6-flash-free --dir <scratch> \
  'Reply exactly MONOLAB_PROVIDER_OK. Do not call tools or inspect files.'
```

Observed: exit 0, 7.15 seconds, exact expected reply, `step_start`, `text`, `step_finish` JSON events, no errors or stderr. Scratch: `/home/me/monolab-probe-smoke.xgpd2wb6`. No paid credentials were configured, and no session-sharing flag was used.

This clears the initial provider-usability checkpoint and allows backend/protocol implementation to begin. It does not prove native command invocation, permission enforcement, journal/recovery or any full PRD acceptance case. Those require the integrated probe.
