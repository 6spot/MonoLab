# Rebuildable Owner reads

`OwnerReads` shares transaction-local Owner session authentication. Lock session then
Task for a coherent overview/event cutoff; read canonical records directly, so cache
loss/restart cannot change answers. Overview carries effective revision IDs, control
version, Task state, current Plan Node counts, queued/physically held Attempts, open
operation count and a cursor at the observed formal-event sequence. No semantic
summary or raw logs are treated as lifecycle state.

`GET /v1/owner/tasks/:task_id` returns generated TaskOverview.
`GET /v1/owner/tasks/:task_id/events?cursor=...` returns generated TaskEventPage.
The opaque base64url cursor contains schema version, Task ID and last visible sequence;
strict canonical decoding and scope validation reject malformed/cross-Task cursors.
Events are read in increasing sequence, at most 64 and bounded by encoded JSON bytes.
Only included items advance the cursor. Reconnect after a page fetch uses its saved
cursor; consumers identify entries by Task+sequence for at-least-once transport.

A sequence gap or cursor ahead of canonical history returns reset_required and a
cursor at the current canonical cutoff. Clients must refresh overview and restart
live reads from that snapshot, showing unavailable history rather than inventing it.
No truncation/retention is introduced in this task. Empty polling preserves cursor.

Event bodies remain formal JSON facts; Runner paths in them are opaque locators.
No filesystem reading or raw Runtime-event union. Projection tables are unnecessary
until measured read cost warrants a rebuildable cache. SSE/browser binding belongs
to the later frontend work; these durable cursors are independent of connection life.
