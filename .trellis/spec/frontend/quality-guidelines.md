# Frontend Quality Gate

Sources: [UI contract](../../../docs/07-owner-review-and-ui.md), [Stage A](../../../docs/09-first-executable-slice.md), [technology](../../../docs/11-technology-and-deployment.md).

## Current status

The repository has no Web package, lint configuration or UI tests. Vitest and Playwright are the selected tools. Scaffolding establishes runnable scripts and reference tests; this file does not claim they exist.

## Required interaction evidence

- Capture/open a Todo without an AI call.
- Switch Todos and retain per-Todo drafts and unread state.
- Reconnect without duplicated committed replies or lost previews.
- Confirm one preview from two clients and show the same Task.
- Show queued Runtime work as normal waiting.
- Accept exact content; render admitted delivery separately from completion.
- Later chat does not block accepted delivery or Retry.
- Show local hard-limit failure at Node scope and publication findings in REVIEW.
- Correct/withdraw/dismiss through their explicit commands without implicit resume.
- Preserve terminal history and report partial delivery honestly.

Test the user-visible behavior introduced by a change. Prefer focused interaction/integration tests to markup snapshots or tests that mirror private state.

## Component and dependency checks

Use shadcn Base UI consistently. Check keyboard/focus, labels, error association, responsive layout and reduced motion. Review generated component imports and lockfile changes; do not add Radix, another UI suite or unused components. Check actual bundle impact before making size claims.

## Reporting

Run affected lint/type/unit/browser checks after scaffolding makes them available. Distinguish mocked UI results from real CLI/GitHub evidence. Documentation-only changes use links, consistency and formatting checks.
