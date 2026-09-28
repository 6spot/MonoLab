# Cross-Language Protocol

Status: accepted contract guidance; `packages/protocol` and generated types are not yet scaffolded.

## Pre-Development Checklist

Read [command contracts](commands.md), [schema generation](schema-generation.md), [Tool Protocol](../../../docs/05-tool-protocol.md) and [technology](../../../docs/11-technology-and-deployment.md). Changes to delivery/input also require [acceptance contracts](../backend/delivery-contracts.md).

## Quality Check

One versioned JSON Schema authority generates TS/Go transport types. Authenticate scopes server-side. Keep request replay, operation admission and result completion distinct. Check both producer and consumer fixtures, compatibility and generation drift once tooling exists. Add no new transport/validation framework without a concrete need.
