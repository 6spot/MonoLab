# Cross-Layer Review Prompts

Sources: [architecture](../../../ARCHITECTURE.md), [invariants](../../../docs/08-principles-and-non-goals.md).

## Trace the command

- Which authenticated Owner/Agent/system identity originates it?
- Where does schema validation end and domain validation begin?
- Which module owns the record and shares the required transaction?
- Are receipt, authorization, event and outbox committed together?
- Does an admitted operation survive loss of the caller?
- Which stable ID deduplicates retries?

Read [protocol](../protocol/commands.md) and [database](../backend/database-guidelines.md).

## Trace effects and recovery

- Can an old process still write after logical cancellation?
- What proves ownership before local/provider takeover?
- Does the backend accidentally open a Runner path?
- What happens after an effect succeeds but acknowledgement is lost?
- Are completion evidence and actual tested revisions attributed correctly?

Read [Runner](../runner/index.md) and [delivery](../backend/delivery-contracts.md).

## Trace input and UI

- Did input commit before or after Owner acceptance?
- Does later chat accidentally revoke/block an accepted batch?
- Can explicit correction/cancellation still reconcile remote truth?
- Does the UI distinguish saved, admitted, delivered and completed?
- Can reconnect duplicate replies or erase drafts?
- Are local capture limits and publication checks shown at different scopes?

Read [frontend state](../frontend/state-management.md).

Use a concrete race or crash window to verify each concern. Do not add hypothetical frameworks or new Task states to hide missing ownership.
