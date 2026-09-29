# Sequential implementation plan

- [x] Inspect tracked names, affected modules, canonical remote/admin permission and local path collision.
- [x] Read architecture, invariants and affected layer specs; record requirements/design.
- [x] Activate the task, using the Owner's delegated implementation authorization; work in the main session.
- [x] Normalize tracked source/Markdown/manifests, preserving raw evidence; rename command directories.
- [x] Regenerate protocol; refresh workspace links; document compatibility/upgrade boundary.
- [x] Run local lint, typecheck, tests, protocol drift, build, Python/TLS and CLI help checks.
- [x] Run real DB/browser and available Go checks in isolated environments; record that Linux/systemd reruns are unavailable and preserve existing host state.
- [x] Review whole diff, old-name exceptions, raw evidence hashes and docs/source consistency.
- [x] Rename GitHub repository in place, verify identity and update origin; commit all work.
- [x] After validation and remote rename, move the local directory and verify tooling from the new path; then commit/archive/record the journal using the new cwd.

Commands: `pnpm install --frozen-lockfile`, `pnpm protocol:generate`, `pnpm lint`,
`pnpm typecheck`, `pnpm test`, `pnpm protocol:check`, `pnpm build`,
`python3 -m unittest discover -s infra/probe -p 'test_*.py'`,
`node --test infra/compose/test-prepare.mjs`, `go test -race ./...`, `go vet ./...`,
`sh infra/runner/build.sh <fresh-output-dir>`, browser suite against an isolated DB.
