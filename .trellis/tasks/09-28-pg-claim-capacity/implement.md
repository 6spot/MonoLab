# Claim/capacity execution plan

Status: implemented and verified under the Owner’s instruction to develop existing tasks sequentially. Execute directly in
the main session per the Owner's current preference; no sub-agents.

## Ordered work

- [x] Inspect existing fixture transaction, unique owner index and 16-test DB suite.
- [x] Separate outstanding Runtime acceptance from independent DB verification.
- [x] Persist requirements, design and reviewable execution scope.
- [x] Activate this existing task after final-plan approval; preserve the probe's pending state.
- [x] Add `apps/server/test/fixtures/claim-worker.ts` and a focused integration suite.
- [x] Implement IPC barriers, bounded worker failures and reliable teardown.
- [x] Verify same Attempt replay, same owner contention and capacity overflow.
- [x] Verify pre/post-commit worker termination and stale/revoked authority.
- [x] Fix only observed owning transaction defects; avoid unrelated refactors.
- [x] Run local lint/typecheck/unit/protocol/build checks and the full real DB suite.
- [x] Record versions, source hashes, exact commands, failures and passing matrix.
- [x] Work committed in cef301d; archive follows.

## Validation

Existing `pnpm test:db` selects only postgres.test.ts; extend its explicit selection
to include the new suite so default unit runs keep real DB tests opt-in. Keep the
Compose test target using that entrypoint. Do not silently omit the new suite.

Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm protocol:check`, `pnpm build`,
then the pinned Linux Compose test profile against private PostgreSQL. Use the
existing task deployment for infrastructure, with random test schemas only.

## Rollback and ownership

Expected edits: the new tests/worker, test entrypoint and task evidence. Product
changes are conditional on demonstrated test failures and limited to their owner.
Preserve all current uncommitted probe/roadmap work. Do not reset DB volumes,
Runner journals, branches or unrelated files when switching tasks.
