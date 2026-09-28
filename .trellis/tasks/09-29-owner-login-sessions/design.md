# Single-Owner password and browser session access

Migration 7 adds one Owner access record: random salt, scrypt-derived password hash
and failed-login window/count. Use Node crypto scrypt with fixed N=32768/r=8/p=1,
64-byte key, random 32-byte salt and constant-time comparison. Password input is
at least 12 characters and at most 1024 UTF-8 bytes; the local bootstrap command reads one bounded JSON object from
stdin. Existing setup refuses replacement unless explicit rotation is selected;
rotation revokes sessions atomically. No secret is printed.

Login holds the access row lock while reserving/verifying a bounded attempt. Wrong
passwords commit their failure counter before returning unauthorized. Five failed
attempts per minute produce a deterministic rate-limited result. Successful login
resets failures and creates the opaque Owner session in the same transaction.
Session issuance reuses the existing hashed-token primitive through a transaction
variant. The login response contains only expiry/authenticated state; token goes
into __Host-monolab Cookie (Secure, HttpOnly, SameSite=Strict, Path=/, no Domain).

Owner routes accept explicit Bearer first, otherwise this one cookie. Duplicate
cookie names are invalid. Cookie-authenticated writes and login require Origin to
match the request's actual HTTP(S) origin; no forwarded headers are trusted by
default. Logout is idempotent revocation and clears the cookie. All Owner responses
are no-store. No CORS is enabled; frontend will be same-origin.

GET session status revalidates session expiry/revocation; POST login/logout are
versioned strict-schema APIs. Add generated protocol definitions/OpenAPI and a
rate_limited code mapped to HTTP 429 with Retry-After. Existing scripts can keep
Bearer auth. Production startup stays Node-native erasable TypeScript.

Tests cover real DB bootstrap, failure accounting, rotation/session rollback and
HTTP cookie/origin isolation. No user password or live host state is touched.
