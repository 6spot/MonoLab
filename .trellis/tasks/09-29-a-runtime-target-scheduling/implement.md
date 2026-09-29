# Implementation plan: Runtime target selection and shared slots

1. Add backend target resolution at the Runtime boundary. Read saved global/Planner/Role policy and current Runner installation facts within a consistent control admission, enforce policy precedence and hard pin/Auto rules, and return a typed factual result. Keep semantic prompt creation and Owner authorization outside this module.
2. Integrate resolution with existing `DispatchQueue.enqueue` so the selected target, policy source and revision basis are immutable and idempotent. Use additive persistence only if needed; no mutable global slot counter.
3. Update promotion to prioritize eligible control Planner work over Node work with FIFO within each class. Recheck selected installation/current connection at claim, terminalize genuinely unavailable queued targets, and retain capacity/owner/locality fencing.
4. Check the production enrollment/deployment path uses the existing two-slot default; change only a path that creates a different default. Preserve explicit configured capacity and old Runner rows.
5. Add focused real-PostgreSQL cases for policy precedence, target compatibility, stale registry/pin, replay, two-slot saturation, control priority, competing promoters, blocked-owner skip, pre-start target loss and restart. Keep separate fixtures for probe behavior and production scheduling.
6. Run protocol drift, backend lint/typecheck/build, affected local/DB tests and Runner tests if a shared contract changes. Inspect cross-layer data flow and ensure no model invocation is part of this leaf. Record unresolved external assumptions for the later integration acceptance task.

## Review gates

- Before implementation: confirm this PRD/design against module 03, 05, 06 and 09, backend/Runner/protocol specs, and accepted boundary-probe evidence. Review the exact saved-policy to `Dispatch` mapping; do not silently cast unsupported targets.
- Before commit: verify atomic receipt/Attempt/outbox admission, physical slot accounting, idempotent replay and one Start under two-worker contention. A final full-scope Trellis check follows any fixes.
- Rollback point: the new selector can be removed without rewriting existing Attempt/Runner records; additive migration, if any, must preserve old probe records and installations.
