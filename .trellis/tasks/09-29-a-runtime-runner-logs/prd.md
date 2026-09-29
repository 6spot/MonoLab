# Production Runner dispatch and execution logs

## Goal

Connect product-selected Attempts to the verified Runner/CLI path and make ordered execution output available to the Owner.

## Dependencies

Follow `09-29-a-runtime-target-scheduling`. Reuse the accepted boundary probe and its immutable dispatch/command protocol.

## Requirements

- Product control invokes the Runner through durable dispatch, with the exact Attempt, fencing generation, context and scoped `monos` command authority.
- Normalize and persist ordered execution output separately from formal Task Events; reconnect can resume from a cursor without duplicating or skipping acknowledged entries.
- Expose factual running, queued and output progress to canonical Owner reads. The Runner does not decide Task/Node meaning or write domain tables.
- A Runtime process exit without the required formal completion cannot make a Node successful.

## Acceptance criteria

- [ ] A product-selected Planner and Node Attempt each launch through the installed CLI path and use scoped formal commands.
- [ ] Ordered output survives duplicate/reordered delivery, backend restart and browser reconnect, without being mistaken for formal lifecycle history.
- [ ] Missing `complete_node` leaves the Node recoverably blocked, with no false completion.

## Out of scope

Stop/restart settlement and full host acceptance are separate leaves. Task conversation, capture and delivery remain their owning packages.
