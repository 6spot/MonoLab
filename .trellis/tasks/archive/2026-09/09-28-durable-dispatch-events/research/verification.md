# Verification — 2026-09-29

- Local lint/typecheck, 52 unit/schema tests, protocol drift check, build and native
  Node type-erasure import of the full application passed.
- Linux Node 24.21.0 / PostgreSQL 17.11: all 49 DB-entrypoint cases passed, including
  eight new dispatch cases and existing Owner/revision/claim/recovery suites.
- New process tests killed the promotion worker with SIGKILL before/after COMMIT:
  before leaves one QUEUED selection and zero Start rows; after retains one RUNNING
  reservation and one Start. New backend reconnect reuses the same dispatch ID.
- Concurrent workers cannot oversubscribe; full capacity leaves Task RUNNING and
  selected work QUEUED. Old owner exit holds capacity until Stop settles. Late
  started events retain FAILED state; duplicate exit makes one Stop operation.
- Task locality rejects unsupported transfer; Node dependency evidence is checked.
- No real model calls, live server migration or restart. Host database volumes and
  canonical process journals are preserved. Native Runtime gates remain deferred.
