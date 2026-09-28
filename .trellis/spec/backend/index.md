# Backend Development

Status: Stage A boundary-probe backend is implemented in `apps/server` with PostgreSQL migrations and shared protocol packages. This is not the full Task/Plan/delivery product. See [root](../index.md), [quality evidence](quality-guidelines.md) and [technology](../../../docs/11-technology-and-deployment.md).

## Pre-Development Checklist

- Read [directory structure](directory-structure.md) for ownership.
- For selected Attempt queue/promotion, read [dispatch queue](dispatch-queue.md).
- For revision/activation publication, read [Task records](task-records.md).
- For Owner sessions/proposal consumption, read [Owner commands](owner-commands.md).
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
