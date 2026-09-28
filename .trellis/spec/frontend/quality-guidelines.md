# Frontend Quality Gate

Sources: [UI contract](../../../docs/07-owner-review-and-ui.md), [Stage A](../../../docs/09-first-executable-slice.md), [technology](../../../docs/11-technology-and-deployment.md).

## Current status

`apps/web` uses root lint, a separate TypeScript check, Vite production build,
Vitest API-boundary tests and Playwright interaction tests. Run `pnpm lint`,
`pnpm typecheck`, `pnpm test`, `pnpm protocol:check`, `pnpm build` and
`pnpm --filter @monolab/web test:e2e` with `MONOLAB_TEST_WEB_DATABASE_URL` set privately.
The browser fixture migrates a unique test schema, uses synthetic credentials,
serves the built SPA from the actual backend and drops only its own schema.
See `apps/web/README.md`; screenshots/traces are ignored test artifacts.

Implemented evidence covers login/logout/revocation, Role/Project/policy/provider
persistence, record/view drafts, two-tab version conflict, repeated submit,
interrupted write/receipt recovery, keyboard navigation and mobile overflow.
Provider repository responses are explicit fixtures, not live GitHub evidence.
The following Todo/Task matrix remains for future packages.

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


## Browser fixture shutdown

Configure Playwright webServer.gracefulShutdown with SIGTERM and a bounded deadline.
Without it Playwright kills the fixture directly and skips the schema cleanup handler.
After fixture lifecycle changes, check that a full browser run leaves zero new test
schemas. Never clean arbitrary prefix matches without proving fixture ownership.
