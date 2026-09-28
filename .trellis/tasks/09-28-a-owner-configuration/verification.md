# Integrated Owner configuration acceptance — 2026-09-29

The four leaves completed in dependency order, one at a time without sub-agents:

| Leaf | Work commit | Evidence |
| --- | --- | --- |
| Owner login/session lifecycle | 4155e22 | 60 DB-entrypoint cases; salted password, bounded native stdin bootstrap, revocation/throttle/cookie/origin checks |
| Project and Role configuration | edb8fd5 | 69 DB-entrypoint cases; immutable receipts, concurrent versions, stable/in-use resource guards |
| Runtime and provider configuration | e8ed99b | 74 DB-entrypoint cases; encrypted write-only App key, safe metadata, manual policy targets, fenced installation observations |
| Protected configuration UI | d5e3761 | Six real-backend browser scenarios; same-origin production image, desktop/mobile review, all earlier regressions |

Final validation: 75 local tests, 74 Linux DB-entrypoint cases (72 database and two
pure cases), six browser tests, lint, backend/Web typecheck, schema generation,
build, native/compiled imports and Linux Go race/vet passed. Production image shell,
assets and unauthenticated API boundaries also passed with network disabled.
Detailed per-leaf reports remain under the archived tasks.

## Acceptance mapping

1. Protected UI/API: one locally initialized Owner, hashed/revocable sessions,
   HttpOnly Secure cookie, same-origin writes, no browser persistent credentials.
   Existing Runner enrollment/authentication remains an independent administrative
   credential path; Owner/Runner/Attempt tokens cannot substitute for each other.
2. The Owner can create/edit Projects/repositories and reusable Roles, store complete
   execution targets/manual models, inspect actual reported CLI installations, and
   configure a write-only GitHub App key through the UI/API without direct database
   edits. OpenCode 1.18.30 was actually discovered as the non-root execution account.
   Version conflicts, uncertain saves, duplicate submission and session revocation
   preserve backend authority and safe UI behavior.

## Explicit scope limits

No new one-use Runner enrollment UX, production policy resolution, automatic CLI
installation/login or live Runtime readiness. GitHub configuration/browser tests use
synthetic RSA keys and injected repository responses; existing GitHub feasibility
experiments remain separate evidence. No live Owner/provider credentials were set
and no running services or installed binaries were replaced. These limits do not
prevent configuration acceptance and do prevent a full Stage A/V1 success claim.

## Next dependency

Production Runtime integration requires the existing Runtime feasibility gate.
The Owner explicitly deferred real model/tool/Stop/reboot acceptance in the recovered
session, selecting LongCat for future required free-model trials. That gate remains
open. Capture/Discussion additionally requires Production Runtime integration, so it
must not start ahead of this evidence. Preserve the deferral and recorded model
selection; recheck zero-price eligibility when the real trials resume.
