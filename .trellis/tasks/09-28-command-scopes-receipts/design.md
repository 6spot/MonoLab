# Owner command and confirmation foundation

Add a reviewed migration for opaque Owner sessions (single owner), immutable
server-prepared task proposals, authorization receipts and Owner request receipts.
Retain existing Attempt command receipts; no rewrite of historical probe records.
Tokens have a distinct owner.v1 prefix and random secret, stored only as SHA256;
Runner enrollment tokens and signed Attempt credentials cannot satisfy this path.
The login/bootstrap issuer is internal; no unauthenticated session-issuance route.

`POST /v1/owner/commands` accepts one versioned `confirm_proposal` command, with
request ID, task scope, expected control version, proposal ID and content digest.
No principal/role fields are accepted from request bodies. Authenticate inside
the transaction, lock Task, check immutable receipt before current-basis guards,
then confirm only the stored proposal with exact scope/action/content and current
control/Specification/Plan basis. Revoked/expired/stale proposals cannot gain new
authorization. Different request IDs confirming the same immutable proposal reuse
one authorization receipt. Same request with changed bytes conflicts.

Server-only prepare inserts an immutable proposal at a locked canonical Task basis;
conflicting reuse is rejected. Actions are bounded to the next Task operations:
apply_specification_revision, apply_rework, accept_delivery. Confirmation does not
execute those actions. Transaction-local consumption rechecks current basis and
exact binding, and marks a confirmation with the consuming command request ID;
a second different consumer is rejected. The module performing the actual state
change must consume and write its own command result in the same transaction.

Add versioned schema definitions and generated TS/Go/OpenAPI output using the
existing generator. Tests exercise real DB concurrency/replay/revocation/rollback
and cross-principal API rejection. No UI, public login, scheduler or delivery
execution is added by this leaf. Todo proposal binding comes with Todo records;
this first implemented confirmation scope is explicitly Task-only.
