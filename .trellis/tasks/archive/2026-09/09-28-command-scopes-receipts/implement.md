# Execution plan

- [x] Inspect architecture, existing command/auth/receipt and migration contracts.
- [x] Record Task-only confirmation scope and deferred login/Runtime limits.
- [x] Add migration and protocol schemas/generated artifacts.
- [x] Implement Owner sessions, immutable prepare/confirm and transaction-local consume.
- [x] Wire authenticated Owner command/status routes with strict schemas.
- [x] Add real PostgreSQL tests for principal separation, replay/conflict, stale basis,
      expired/revoked sessions/proposals, single confirmation and atomic consumption.
- [x] Run lint/typecheck/unit/protocol/build and full real database suite.
- [x] Update specs, commit and advance to Task control/revision primitives.

No canonical test-host data resets. Migrate forward after tests pass; retain
existing receipt meanings. Product state changes remain inside Tool Protocol.
