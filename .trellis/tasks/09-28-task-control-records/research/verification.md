# Verification — 2026-09-29

- Local: lint, typecheck, 52 unit/schema tests, protocol generation check and build.
- Native module smoke: `node --experimental-strip-types -e "import('./apps/server/src/app.ts')"` passed.
- Linux Node 24.21.0 / PostgreSQL 17.11: complete 41-case DB entrypoint passed
  (40 database cases and the pure graph validation case). Disposable schemas only.
- Includes populated version-4 migration with preserved completed-operation history;
  concurrent publication; prior-state observer during uncommitted graph publication;
  rollback of revision pointer and consumed confirmation; stale claim/revision/Plan
  rejection; immutable graph membership; retained completion after descendant reset.
- First run: 39/41, two native crash workers could not load a TypeScript parameter
  property in OwnerCommands. Replaced it with an erasable field/constructor and
  enabled `erasableSyntaxOnly` to catch this in typecheck. No production deployment.
- One harness attempt mounted entire packages read-only and hid dependency symlinks;
  it failed before tests. Corrected mounts to source/test/migration directories.

Current helpers are internal record primitives; public Start, input/Owner policy
checks, post-start settlement, durable scheduling and UI remain later roadmap work.
Existing deferred real-model, concurrent live restart and host reboot gates remain
unverified. No sub-agents were used; canonical host data was not reset or migrated.
