# Task control and immutable execution records

Retain `tasks` as the physical identity/control row. `specification_id`, nullable
`plan_id`, `control_version` and `state` remain authoritative; do not duplicate
these fields in another control table. Broaden existing lifecycle checks to the
architecture state sets. Legacy `resource_id` remains probe-only and nullable
for future Project-owned resources, not a new Task resource binding.

Migration 5 adds revision metadata (parent, canonical digest, authorization and
Plan creation Specification basis), same-Task composite foreign keys, immutable
`plan_nodes` definitions, append-only `node_activations` and completion evidence.
Legacy records retain content and unknown historical metadata stays null. New Attempts persist launch Specification/Plan IDs; initial Plan publication also verifies the recorded Planner launch basis, so supplying a refreshed expected version cannot authorize an obsolete Planner. Backfill
current graph/activation facts from existing probe Nodes/Plan content, marking
legacy activation basis explicitly; do not claim reconstructed old facts were
recorded at launch. New records always bind exact revision IDs. SQL prevents
updates/deletion of immutable revision, graph, activation and completion rows.

`task-records.ts` owns transaction-local initialization, initial Plan publication,
pre-start Specification publication and settled reactivation primitives. Validate
IDs, bounded JSON and acyclic graph membership before writes. Initial publication
requires RUNNING/no current Plan and an expected Specification/control basis.
Existing Nodes may appear in a later Plan only with unchanged immutable definition;
actual Replan publication remains deferred. Specification publication for this
leaf is PLANNING-only, consumes exact Owner confirmation, records parent/content
and atomically switches the pointer. Post-start changes need the later settlement
operation and are rejected here.

All helpers lock Task first, validate expected bases, and never perform external
effects. A caller that needs Runner/Owner locks takes those first in the established
order. Reactivation requires no unreleased Attempt or unresolved workspace operation
for the affected subgraph, expands descendants mechanically, appends a fresh
activation and clears only current result projection. History remains intact.

Probe fixture creation writes the same graph/activation records. Command admission
checks relational effective membership and activation basis. Completion writes an
append-only result before updating Node/Task projections in the same transaction;
old completed activations cannot be reused after reactivation. Continue to return
existing authenticated receipts before new-effect guards. No Runtime wire change.

The next dispatch task owns durable scheduling intents. These internal primitives
are not new public commands and do not independently launch or schedule work.
Rollback retains migrated history and stops incompatible writers; never down-migrate
by dropping canonical records. All database verification uses disposable schemas.
