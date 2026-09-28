# Verification — 2026-09-29

- Linux Node 24.21.0 / PostgreSQL 17.11: all 69 DB-entrypoint cases passed (67 database and two pure cases). Includes eight new DB cases and preserved independent-process crash suites.
- Local lint/typecheck, 63 tests, protocol generation check, build and native import passed. Linux Go race/vet passed; the added shared configuration fixtures pass wire validation.
- Configuration persistence and same-key replay survive service reconstruction. Concurrent edits admit one version; failed receipt insertion rolls back Project/resources/version.
- Resource identity, alias, selection/hidden Role, unfinished Plan and unsettled workspace protections verified. Cookie origin and revoked session checks cover the configuration routes.
- First DB run exposed a test-only JSON key-order comparison; compare complete object structure because jsonb preserves values, not source property order.
- No live application/database migration, Owner credentials, Runtime login or provider state changed. Configuration limit is a complete 2 MiB snapshot; future expansion may paginate deliberately.
