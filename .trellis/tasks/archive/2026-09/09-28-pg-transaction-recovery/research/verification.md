# Atomic admission and recovery results

> Product terminology and command/path examples were normalized to `monos` on
> 2026-09-29. Exact historical names and observations remain in the original Git
> revisions and unchanged raw JSON attachments; this edit is not a new test run.

Implemented independent admission workers using constructor-only crash hooks and
SIGKILL before/after COMMIT. Tests assert complete rollback before commit and one
receipt/event/operation/outbox plus authority/control transition after commit.
Recovery and duplicate replay retain the original operation; fake Stop settlement
is idempotent. Unresolved workspace operations prevent slot release across stale
control, revocation and changed duplicate results.

The first two runs failed before fault injection because the new Planner fixture
omitted required routing. Adding routing `{kind: reply_only}` fixed that test
input; no business transaction was changed. All failed runs remain preserved.

Final pinned Node 24.21.0 / PostgreSQL 17.11 run: 25/25 pass across the original
16, independent-claim 6 and recovery 3 cases; 7.20 s total, 2.016 s recovery suite.
The shared worker-controller extraction also reran all six claim cases unchanged.
Host evidence: `/root/monos-pg-recovery-evidence/run-01` through `run-03`;
run-03 includes hashes of every staged TypeScript test file. Tests and package
entrypoint were mounted read-only over the previously built pinned test image.
Reproduce after building the Compose tests image with `pnpm test:db`, or use the
existing Compose test-profile recipe. All data uses random isolated schemas.

This verifies canonical database admission and result handling. Physical workspace
ownership and GitHub effects are not simulated into an acceptance claim. No model,
provider request, migration or product transaction change was needed. Commit and
archive bookkeeping remains pending while sequential development continues.

Work checkpoint: `cef301d` (local commit; no product-source push).
