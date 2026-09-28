# Transaction recovery implementation

Owner authorized sequential implementation; main session executes directly.

- [x] Verify preceding claim/capacity evidence and inspect admission hooks/records.
- [x] Persist scope, crash strategy, physical-owner limits and execution order.
- [x] Activate task and reuse/extract bounded independent worker test control.
- [x] Kill a Planner admission process at before/after commit hooks.
- [x] Assert authority/control/event/receipt/operation/outbox all-or-none and replay.
- [x] Verify workspace operation recovery, stale completion denial and retained slot.
- [x] Run lint/typecheck/unit/protocol/build plus full isolated real PostgreSQL suite.
- [x] Record evidence, sync specs and prepare commit bookkeeping with prior work.

Use pnpm test:db with explicit inclusion of the new suite; run through pinned
Compose tests. Only random test schemas are removed, after all children close.
Retain raw test logs privately and record sanitized results. Runtime and GitHub
physical effect validation remains separate.

Implementation and validation passed; work committed in cef301d; archive follows.
