# Execution

Owner authorized main-session sequential work and creation of the test repository.

- [x] Implement bounded structured gh API wrapper and immutable evidence writes.
- [x] Add local regressions for HTTP parsing and exact-SHA merge request construction.
- [x] Create synthetic repository, branch and PR; configure required status check.
- [x] Verify stale expected SHA rejection and required pending/failure/success cases.
- [x] Record account/repo identity, source hash, responses and permission limits.
- [x] Review/validate and continue to uncertain create/merge recovery using this harness.

Run Python unittest and the explicit --execute harness. Preserve all failed
provider responses by status/code; do not expose credentials or product content.
