# Project and Role configuration

## Goal
Owner can persist Project context, Git resources and reusable Roles through authenticated versioned APIs without database edits.

## Requirements
- Projects have name, Owner-authored context, active/archive state, Git resources and directly selected Role IDs. Roles have name, description, behavioral instructions and hide/restore state.
- Resources support remote URL, default ref/branch and delivery preferences. IDs cannot be repointed or transferred. Reject local paths, embedded credentials and duplicate repository aliases. Retain removed records for identity/history.
- Reject removal of resources with workspace admission on unfinished Tasks, and deselection of Roles referenced in their effective Plans. Hidden Roles retain history and existing selection but cannot be newly selected.
- Use authenticated Tool Protocol commands, exact request replay, stale-version conflict and atomic persistence. Reads survive service reconstruction. No natural-language state changes.
- Preserve probe fixtures; canonical Tasks can associate with active Projects and initial Plan publication validates the selected Role set.

## Acceptance
- [x] Authenticated create/edit/archive/restore and reusable Role selection survive restart; unauthorized scopes cannot read or write.
- [x] Concurrent edits and duplicate requests result in one coherent configuration and immutable receipt; stale/conflicting requests fail without partial writes.
- [x] Resource identity/alias and in-use removal guards, Role references and Plan validation enforce the architecture.
- [x] Migration, protocol, local and real PostgreSQL regression checks pass.

## Scope and authority
Owner explicitly authorized autonomous sequential work without sub-agents. This leaf owns configuration storage, APIs and guards. Runtime/provider configuration and UI follow as separate leaves; Task scheduling/context assembly and live Runtime acceptance remain later work. No permanent deletion, team layer, Role types or Task resource binding.
