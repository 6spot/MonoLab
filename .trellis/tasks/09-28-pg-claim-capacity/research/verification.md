# Independent claim evidence

Implemented `apps/server/test/postgres-claims.test.ts` and its test-only IPC worker.
No business transaction or migration changes were needed. Separate Node processes
use separate PostgreSQL sessions; the parent observes concurrent lock waits before
releasing its barrier. Crash tests send SIGKILL at explicit transaction checkpoints.

Six cases pass: identical Attempt replay; same owner across two Runner locks;
four workers sharing capacity two with no loser Task/Node/outbox; killed open
transaction rollback; durable Start after post-commit worker death; revoked/stale
ownership retaining capacity until validated Stop settlement.

Local lint/typecheck, 45 unit tests, protocol check and build pass. On the pinned
Node 24.21.0 / PostgreSQL 17.11 host, the full real database suite passes 22/22.
Initial run: 7.04 s. Final source run after worker close-event cleanup: 6.95 s,
including 6.205 s for independent-worker tests. Go/Runtime/model work was not invoked.

Host evidence: `/root/monolab-pg-claim-evidence/run-01/` contains source hashes,
image build log and first result; `run-02/` retains the final test-file hash and
result. The final run used the read-only staged test source mounted into the same
built test image. Reproduce with the Compose test profile after rebuilding tests;
`pnpm test:db` now explicitly includes both suites. Schemas are random and dropped
after child shutdown; canonical Runner/Attempt rows are untouched.

This verifies the probe's database claim primitive, not a complete product
scheduler or physical writer isolation. Commit/archive bookkeeping is pending;
the Owner directed continuation to the next planned task without waiting for the
deferred Runtime/provider acceptance.

Work checkpoint: `cef301d` (local commit; no product-source push).
