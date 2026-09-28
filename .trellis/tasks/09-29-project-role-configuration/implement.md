# Execution plan

- [x] Read architecture, existing command/Task primitives, backend/protocol specs and prior evidence.
- [x] Add migration 8 and versioned Project/Role/command/snapshot schemas.
- [x] Implement authenticated reads, idempotent edits, repository normalization and reference guards.
- [x] Integrate optional canonical Task Project and initial Plan Role validation.
- [x] Add DB concurrency/restart/guard/HTTP tests and shared schema fixtures.
- [x] Run lint, typecheck, protocol:check, test, build, native import, test:db and Linux Go race/vet.
- [x] Review full diff, update executable specs/evidence, commit and archive.

User authorization covers design and implementation decisions; execute inline without sub-agents. Do not deploy/restart live services during isolated test runs.
