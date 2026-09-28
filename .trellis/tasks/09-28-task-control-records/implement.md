# Execution plan

- [x] Review domain contracts and existing probe/Owner receipts.
- [x] Add migration 5 with same-Task constraints and immutable history.
- [x] Implement transaction-local record/publication/reactivation primitives.
- [x] Integrate fixture, command and completion paths with canonical records.
- [x] Test graph guards, stale activation/basis, history, atomic rollback,
      competing publications and populated migration.
- [x] Run lint/typecheck/unit/protocol/build plus real PostgreSQL suites.
- [x] Update specs/evidence; commit and archive; advance to durable dispatch.

No live migration, model trial or host restart is required for this data foundation.
