# Owner login and session lifecycle

## Goal

Let the single Owner sign in and use protected APIs without manually issuing a
database session. Bootstrap credentials through a local management command.

## Requirements and scope

- Local stdin-only bootstrap creates one salted password hash; explicit rotation
  revokes all old sessions. No unauthenticated setup/registration endpoint.
- Login verifies the password, issues an independent Owner session and a Secure,
  HttpOnly, SameSite=Strict host-only cookie. Passwords/tokens are never logged.
- Login/logout/session-status APIs plus cookie support for existing Owner routes.
  Cookie writes require same-origin requests; explicit Bearer automation remains.
- Persist bounded failed-login throttling across backend restart. Expired/revoked
  sessions cannot read or mutate; logout revokes the current session.
- Document bootstrap using secret stdin, never command-line arguments.

## Acceptance

- [x] Correct login works; wrong/uninitialized credentials fail without issuing sessions.
- [x] Cookie flags, origin checks, logout, expiry and rotation enforce session boundaries.
- [x] Throttle/credential/session facts survive restart; tests use synthetic passwords.
- [x] Runner/Attempt credentials remain separate and all previous suites pass.

## Status and limits

Implementation authorized by the Owner's autonomous sequential-development request.
No account taxonomy, public signup, frontend screens or provider login automation.
No live deployment credential will be generated or changed by tests.
