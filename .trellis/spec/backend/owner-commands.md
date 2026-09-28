# Task-scoped Owner confirmation

## 1. Scope / Trigger

Use for Owner session authentication, immutable proposal preparation and exact
authorization consumption. Implementation: `apps/server/src/owner-commands.ts`;
storage: `0004_owner_commands.sql`. Public login and domain execution are separate.

## 2. Signatures

- Internal `issueOwnerSession(db, ttl?)` / `revokeOwnerSession(db, sessionId)`.
- `prepareTaskProposal(tx, {id, task_id, action, content, ttl?})` returns proposal
  identity, canonical SHA256 digest and control/Specification/Plan basis.
- `POST /v1/owner/commands`: strict generated `OwnerCommand`, `confirm_proposal`.
- `GET /v1/owner/scopes/:scope_id/commands/:request_id`: `OwnerCommandResult`.
- `consumeTaskConfirmation(tx, token, confirmationId, requestId, binding)` binds
  `scope_id`, action and content digest in the caller's transaction.

## 3. Contracts

One Owner, no organization model. Opaque random `owner.v1` credentials are stored
only as hashes and cannot satisfy Runner/Attempt authentication. Session lifetime
is bounded to 24 hours; authentication applies even to receipt reads and replay.

Lock order is session -> Task -> proposal -> authorization. Prepare is server-only
and snapshots the locked Task basis. Conflicting proposal identity reuse fails,
including across concurrent Tasks. Confirmation checks its immutable request
receipt before current-state guards and reuses one authorization per proposal.
Confirmation does not execute the proposed action or advance Task control version.

Consumption revalidates eligibility/current basis and exact action/content/scope.
The domain caller must check its prior command receipt first, then consume, mutate
and store its command result in the same transaction. `consumed_by` alone is not
a domain command result. Same-request re-entry requires the caller's receipt-first
contract; different consumers cannot reuse the receipt.

## 4. Validation & Error Matrix

| Condition | Result |
| --- | --- |
| Wrong, expired or revoked credential | `unauthorized` |
| Unknown/wrong Task, proposal or action binding | `denied_scope` |
| Changed request/proposal/content or different consumer | `payload_conflict` |
| Changed control, Specification or Plan basis | `version_conflict` |
| Expired/revoked proposal | `unmet_precondition` for new confirmation/consumption |
| Known identical committed request | Original result, despite later stale proposal |
| Missing receipt | `unknown`, without success/failure inference |

## 5. Good / Base / Bad Cases

Good: concurrent confirmations yield one authorization. Base: cross-device retry
uses the same request ID and replays the receipt. Bad: a new request refreshes the
expected version to approve changed proposal content.

## 6. Tests Required

`postgres-owner.test.ts` checks principal isolation at HTTP boundaries, hashed
credentials/revocation, replay/conflicts, cross-Task proposal races, exact basis,
expiry and transactional consumption rollback. Shared TS/Go fixtures check strict
Owner schemas, unsupported versions and committed/unknown result fields.

Migration 4 is additive and retains existing Attempt receipts. Run migrations in
isolated real schemas; never drop canonical tables to validate it. Rollback means
stopping new Owner routes while retaining persisted authorization/history.

## 7. Wrong vs Correct

Wrong: commit authorization consumption, then perform the domain mutation later.
Correct: use one `transaction(db, async tx => ...)` for receipt-first lookup,
consumption, domain mutation and immutable command result.
