# Backend Development

Status: architecture-backed baseline; no product backend exists yet. See [root](../index.md) and [technology](../../../docs/11-technology-and-deployment.md).

## Pre-Development Checklist

- Read [directory structure](directory-structure.md) for ownership.
- For commands/persistence, read [database](database-guidelines.md), [errors](error-handling.md) and [protocol](../protocol/commands.md).
- For acceptance/messages/provider effects, read [delivery contracts](delivery-contracts.md).
- Read [logging](logging-guidelines.md) and [quality](quality-guidelines.md) before workers.
- Linux effects require [Runner](../runner/index.md); UI requires [Frontend](../frontend/index.md).

## Quality Check

- State, receipts and outbox commit atomically; external effects run outside transactions.
- Database and host/provider ownership prevent duplicate effects.
- Later chat cannot block a frozen accepted delivery batch.
- Rejected commands, admitted recovery and objective Runtime failures remain distinct.
- Run established affected checks and report unverified external assumptions.
