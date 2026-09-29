# Design: Runtime target selection and shared slots

## Boundary

The backend Runtime scheduling module reads the existing Owner configuration and current Runner registry, resolves one Stage A target, then calls `DispatchQueue.enqueue` in the owning control transaction. It returns the chosen target or a structured factual inability to select. The Task/Todo module supplies authorization, immutable prompt, resource, revision basis and request identity; it does not write Attempt or outbox rows directly. Runner receives only a committed `Dispatch` and never resolves product policy.

## Selection and admission

1. Resolve the policy source: explicit one-off target, applicable Planner/Role policy, then global policy. Record its source and selected target in the immutable Attempt admission context. Stage A selects the default target only; second-CLI ordered fallback remains Stage B. If an explicit target is unusable, return its objective reason without trying another target.
2. Resolve `runtime_id` against the current, online, ready Runner installation observation. A concrete `runner_id` constrains placement. Auto has one eligible Runner in Stage A; multiple eligible Runners cannot be used as an implicit workspace transfer. A missing policy, absent installation, stale observation or unsupported adapter/model/thinking setting returns an explicit pre-start result.
3. Keep the tested OpenCode/LongCat wire and adapter limit for this leaf. A configured manual model other than the approved probe model, or any thinking level currently unsupported by the adapter, remains saved configuration but cannot produce a Start. Product support for other selected models requires its own reviewed protocol/adapter extension. No new live model run is needed for this leaf.
4. Submit the selected target with the existing prompt and control basis to `DispatchQueue.enqueue` in the caller's transaction. Preserve its content digest and `QUEUED` row across replay/restart. The owning caller handles the selection result and Owner attention; no new Task state is introduced.

## Capacity and ordering

Promotion keeps the existing Runner → Task → Attempt lock order and physical reservation count. Among eligible queued rows on a Runner, initial/control Planner work precedes Node work; oldest `created_at,id` wins inside each class. Do not block all candidates behind one unresolved owner. The existing serial Task writer and locality checks remain. A busy but healthy target stays queued; no fallback or attention is inferred. A disconnected sole Runner leaves its queued work intact for reconnection. Objective loss of the selected Runtime after reconnection terminalizes that queued row with a factual reason; it never launches a substitute under the same Attempt ID.

The existing fixture enrollment defaults capacity to two; production enrollment must use that Stage A default while preserving the configurable 1–32 database range. Actual occupied slots derive from unresolved physical reservations, not a mutable slot counter.

## Recovery and compatibility

Use existing outbox replay and Runner incarnation fencing. Keep old probe fixture dispatches valid and avoid changing persisted launch JSON meaning. If the new metadata requires storage, add additive fields/migration and retain the exact selected target on replay. A cancelled pre-start Attempt has no Runner process, workspace handoff or mutation credential. For an unavailable target discovered after queueing, terminalize once and let the owning module decide whether to request a fresh Attempt after current policy review.

## Trade-offs and limits

This deliberately leaves product-created Task and Todo conversations to their own packages. It does not claim real production host behavior from database tests. The follow-on Runner/log leaf verifies actual CLI launch and broadens the wire/adapter only when a selected production target requires it. No model other than the Owner-approved LongCat is invoked as part of acceptance without a fresh explicit decision and zero-price check.
