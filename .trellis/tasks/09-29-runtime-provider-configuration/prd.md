# Runtime and provider configuration

## Goal
Owner can configure execution targets and GitHub access and inspect installed Runtime facts through authenticated APIs without database edits or automatic CLI setup.

## Requirements
- Persist Global and Planner execution policies and optional per-Role policy. Targets contain logical runtime_id, optional hard runner_id pin, optional model_id/thinking_level, ordered complete fallbacks and optional attention-only duration budget. Manual model IDs are allowed.
- Report Runner identity/connectivity/capacity and installation facts keyed by Runner/runtime. Discover the supported installed OpenCode CLI under the fixed execution account; report version or objective unavailability. CLI login and real execution readiness remain distinct and unverified.
- Persist GitHub App ID/installation/private key with authenticated versioned write-only commands; encrypt private key at rest, omit secrets from snapshots/receipts/logs and bound inputs.
- Read authorized GitHub repositories through a static provider API boundary with scoped ephemeral tokens, bounded pagination and sanitized errors. Git resources can retain opaque provider repository metadata without turning core resources into GitHub objects.
- Keep credential scopes separate, reject stale configuration and stale Runner incarnations, and retain offline observations without reporting them as online.

## Acceptance
- [x] Policy storage/replay and manual model selection work without changing existing running Attempts or installing/authenticating CLIs.
- [x] Runner discovery executes only a fixed version command as the execution account; authenticated versioned reports survive backend reconstruction and stale channels cannot overwrite them.
- [x] GitHub configuration protects secret material, validates keys and returns bounded repository data through installation authorization; provider failures have actionable sanitized errors.
- [x] Local, real PostgreSQL, protocol and Linux Go checks pass; no live provider or Runtime readiness claims are fabricated.

## Boundaries and authority
Autonomous sequential implementation authorized by Owner; no sub-agents. This leaf supplies configuration/discovery, not production dispatch adapters, fallback execution or remote publication. Supported probe adapter remains OpenCode; later Runtime integration owns other CLIs/general launch selection. No arbitrary CLI flags, Runtime Profile, dynamic scores or login automation.
