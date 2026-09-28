# Atomic admission and recovery verification

Reuse BoundaryService constructor-only beforeAdmissionCommit/afterAdmissionCommit
hooks in a separate test process. At the selected hook send SIGKILL to that process;
this exercises real connection loss rather than an exception handled by rollback.
Use Planner commit_task_turn so one transaction changes authority/control version,
writes the reply event, receipt, Stop operation and outbox. A fresh service must
observe none before commit and all exactly once after commit, even without a reply.

Keep a random schema per suite. Each child reconnects its test Runner before
admission, retaining the normal backend-instance fencing. Parent owns fixture setup
and teardown; bounded IPC startup/exit waits prevent stranded workers. Extract the
existing claim worker controller as a shared test helper, preserving its behavior.

Additional recovery case: an admitted workspace operation retains ownership across
connection/heartbeat expiry and revocation. A stale result cannot settle it; current
recovery preserves the original operation identity; Stop cannot release the slot
until the workspace operation settles. Duplicate identical results are idempotent,
changed settled results conflict. Fake results are test inputs, not evidence of
physical Git/Runner/provider exactly-once execution. There is no new lease scheduler
or delivery implementation in this leaf.

Expected changes are tests, shared test helper and DB test entrypoint only. Fix a
business transaction only if a test demonstrates a defect. No migrations, model
calls, canonical data mutations or host restarts are planned.
