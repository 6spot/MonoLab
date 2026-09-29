# Rename the product to monos

## Goal

Use `monos` consistently as product name, CLI name and repository name. The Owner
explicitly requested all documentation branding, local repository and GitHub
repository renaming, approved this task, and delegated routine decisions.

## Confirmed facts

- Current GitHub repository ID is 1390769584, owned by `6spot`; current credentials
  have admin permission. The target was free at preflight and the same repository is now named `6spot/monos`.
- Source spans TypeScript backend/Web, generated protocol, Go Runner/CLI and Linux
  deployment/probe scripts. One checkout is open and has been moved to `/Users/me/IdeaProjects/monos`.
- Historical acceptance records contain immutable process identities, paths, request
  digests and evidence hashes. Their recorded bytes are provenance, not live branding.
- Existing test-host installation remains a separately accepted historical deployment.

## Requirements

1. Product/UI/CLI/help/docs use lowercase `monos`; environment constants use `MONOS_*`.
2. Packages use `@monos/*`, Go modules use `monos.local/*`, executables and command
   directories use `monos` prefixes. Update coupled callers, tests and generated output.
3. Fresh deployment templates use the new namespace, with a documented explicit
   upgrade boundary for existing service paths, cookies and persistent volumes.
4. Rename the existing GitHub repository in place, retaining its repository ID,
   visibility, branch/history and access. Set local origin to its canonical new URL.
5. Rename this local checkout to `/Users/me/IdeaProjects/monos` with tooling verified at the new path.
6. Preserve raw historical evidence JSON, hashes, canonical host state and Git history.
   Normalize Markdown wording and examples; label archived reports as terminology
   updates with exact original observations available in Git history/raw attachments.

## Acceptance criteria

- [x] No old branding remains in tracked source, manifests or Markdown documents.
- [x] Generated protocol, workspace dependencies and all four Go commands build.
- [x] Lint, typecheck, protocol drift, unit/harness/TLS and relevant browser/DB/Go checks pass.
- [x] CLI help and protected Web UI show `monos`; renamed cookie and environment paths agree.
- [x] GitHub canonical name is `6spot/monos`, same ID and visibility, and origin works.
- [x] Local checkout is named `monos`, task/journal committed, working tree clean.
- [x] Raw immutable evidence attachments are unchanged; migration limits are explicit.

## Out of scope

No semantic behavior redesign, new Runtime/model request, host reboot, deletion of
historical data, or blind migration of the running test-host database/Runner storage.
No sub-agents, consistent with the Owner's continuing instruction.
