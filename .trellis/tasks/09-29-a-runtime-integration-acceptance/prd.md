# Production Runtime integration acceptance

## Goal

Verify the complete production Runtime integration before its parent package is accepted.

## Dependencies

Follow the target scheduling, Runner/log and Stop/recovery leaves. This task checks their combined behavior and owns any integration fixes that cannot be assigned to an earlier leaf.

## Requirements

- Verify the real installed CLI, native `monos` commands, two shared slots, queue visibility, ordered output, scoped command recovery and whole-tree Stop using production service entrypoints.
- Exercise backend/Runner restart and a controlled host restart under the accepted host profile; preserve exact process/operation lineage and no stale writer.
- Record source versions, host/runtime/model facts, successful and failed trials, and limits. Verify model availability and zero price before any new model invocation.

## Acceptance criteria

- [ ] Integrated local and real-host cases pass with retained evidence, including queue saturation, missing formal completion, Stop and restart.
- [ ] No leftover process, unreleased Attempt or test resource remains after controlled validation.
- [ ] Parent Runtime-integration acceptance is updated only from this evidence; full Stage A/V1 is not claimed here.

## Out of scope

Task conversation, second real CLI/fallback, delivery and full Stage A/V1 acceptance.
