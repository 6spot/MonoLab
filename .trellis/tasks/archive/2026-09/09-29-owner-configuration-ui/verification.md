# Owner configuration UI verification — 2026-09-29

> Product terminology and command/path examples were normalized to `monos` on
> 2026-09-29. Exact historical names and observations remain in the original Git
> revisions and unchanged raw JSON attachments; this edit is not a new test run.

## Result

All three leaf acceptance criteria passed. Implemented the protected React/Vite
configuration client and same-origin production serving. Work ran sequentially in
the main session under Owner authorization; no sub-agents or permission prompts.

## Evidence

| Check | Result |
| --- | --- |
| Root lint and backend/Web typecheck | Passed |
| Local Vitest | 75 passed; 72 DB-gated cases intentionally skipped locally |
| Protocol generation drift | Current |
| Native TypeScript and compiled backend imports | Passed |
| Real PostgreSQL test entrypoint on Linux | 74 passed across 10 files (72 DB + two pure cases) |
| Playwright against actual backend + isolated PostgreSQL | 6 passed; final cleanup-verification run 16.8 seconds |
| Linux Go tests with race detector and vet | Passed |
| Vite production build | JS 468.53 kB / 141.96 kB gzip; CSS 25.60 kB / 6.54 kB gzip |
| Production Docker target | Built as monos-owner-ui-validation |
| Network-disabled production image smoke | Shell 200/no-store, built JS 200/immutable, protected API 401 |
| Context manifests and diff whitespace | Passed |

Browser scenarios: wrong and correct login; Role/Project/repository creation;
manual-model policy and write-only GitHub key persistence; reload; record/view draft
retention; two-client stale edit and explicit reload; lost POST reply followed by
malformed receipt lookup and successful recovery with one write; same-tick duplicate
submit; transient session-check outage; revoked-session editor/secret clearing;
keyboard skip focus; mobile overflow and logout. Desktop 1440×1000 and mobile
390×844 full-page screenshots were visually inspected. Generated screenshots and
traces remain ignored under `apps/web/test-results/` and regenerate with the suite.

Browser PostgreSQL traveled through a loopback-only SSH tunnel to the authorized
Linux host. The database URL was captured only in process memory and passed in a
child environment. Each fixture created/dropped its own random schema, never the
canonical database. Synthetic Owner password, service signing key and RSA App key
were used. GitHub repository reads were explicitly mocked: no live provider
credentials, publication, model invocation or Runtime readiness claim.

## Review fixes and contracts

- Receipt parse/network errors retain the immutable pending command. Successful
  recovery clears the same draft/secret as immediate acknowledgement.
- In-flight ref closes the same-tick double-submit window; server receipts remain
  the authority. Draft control versions do not change under background refresh.
- Logout updates the existing session observer before removing private queries.
  Clearing the entire query cache first had left the mounted UI on stale data.
- Temporary session revalidation failures retain drafts. Authoritative revocation
  clears private queries and unmounts all editors. No browser persistent storage.
- Hash clicks synchronously select the view; history remains supported. Skip link
  moves focus without replacing the current settings view.
- Static plugin denials preserve their 4xx class; source/API paths never get the SPA.
- Browser validation imports AJV/JSON only; Node crypto stays out of Web. Base UI
  preset is explicit, dependencies pinned, no Radix family or unused CLI/font package.

## Limits and reproduction

See `apps/web/README.md` for commands and test prerequisites. The localhost browser
fixture uses Chromium's secure-context exception; public production access requires
HTTPS. Development proxy config was type/build checked; the browser suite exercises
the compiled SPA served by the real backend. Existing Fastify disableRequestLogging
deprecation is unchanged. No running production service or installed binary replaced.

The earlier Owner-deferred real Runtime model/tool/Stop/reboot acceptance is still
open. This leaf does not establish production policy resolution, enrollment UX,
GitHub push/merge readiness, Capture/Discussion or the full Stage A/V1 product gate.


## Fixture lifecycle follow-up

Post-run inspection found six earlier fixture schemas retained because Playwright
had used its default hard kill. Added explicit SIGTERM graceful shutdown with a
15-second deadline. Verified each residual schema against the synthetic fixture
password hash before dropping it; no other schema was touched. Re-ran all six
browser cases successfully and confirmed zero remaining web_test schemas. Closed
the task-owned SSH tunnel. Lint and Web typecheck passed for this correction.
