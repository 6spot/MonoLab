# Runtime target selection and shared slots: verification

## Result

The backend now exposes `RuntimeScheduling.selectAndEnqueue` for a later authenticated Task/Todo control command to select an installed Stage A Runtime and commit a canonical queued Attempt in its own admission transaction. It records the exact policy source/target and current installation observation, gives factual unavailable results, and never substitutes another model. The existing Runner path still runs only the Owner-approved LongCat free model; this task made no model invocation.

Queue promotion prioritizes Planner work, retains physical capacity and owner fences, preserves queued work on Runner disconnect, and cancels a selected target only after a complete current report proves the Runtime unavailable. Auto placement is serialized against Runner eligibility changes. A bounded retry removes stale queue heads without holding multiple Task locks in one transaction. Migration 10 is additive and leaves probe dispatches valid.

## Checks

| Check | Result |
| --- | --- |
| `pnpm lint`, `pnpm typecheck`, `pnpm protocol:check`, `pnpm build` | Pass |
| `pnpm test` | 79 pass |
| `pnpm test:db` against isolated PostgreSQL 17.10 | 11 files, 81 pass; includes seven selected-path tests and existing independent-process queue recovery tests |
| Native module import and `git diff --check` | Pass |
| Real model/host trial | Outside this leaf; no new call or installation |

The selected-path tests cover policy precedence, exact replay, unsupported target settings, pins, reconnect reports, two shared slots, Auto eligibility serialization and stale-head cleanup. Existing `postgres-dispatch.test.ts` independently covers the underlying queue's multi-worker promotion and restart replay. This is composed coverage for selected-path restart and cross-process races, not a new end-to-end product execution claim.

The isolated database was downloaded into a task-specific temporary directory and ran only on a local Unix socket. The failed initial run without `DATABASE_URL` and sandbox-denied socket/shared-memory attempts did not create any project database state. The temporary instance is stopped after verification. No project dependency was added.

## Limits and follow-on ownership

Task/Todo semantic commands do not call the new API yet; they belong to their roadmap packages. The current adapter rejects other models and thinking settings explicitly, and ordered second-CLI fallback remains Stage B. Production Runner enrollment, real CLI launch/log streaming, Stop UI and host restart acceptance belong to the following Runtime leaves. Go race/vet were unavailable locally because no Go toolchain is installed; this leaf changes no Go source or wire schema.

The build gate also exposed stale generated `dist/*/node_modules` links left by the prior checkout rename. The build script now repairs only dangling generated links and preserves real directories.
