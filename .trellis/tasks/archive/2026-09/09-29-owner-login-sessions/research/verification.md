# Verification — 2026-09-29

- Local lint/typecheck, 58 tests, protocol generation check, build and native app import passed.
- Linux Node 24.21.0 / PostgreSQL 17.11: all 60 database-entrypoint cases passed
  (59 DB cases plus pure graph validation), including five new access/CLI cases.
- Linux Go race tests and vet passed with regenerated login/Cookie/error schemas.
- Parallel wrong passwords committed exactly five failures; three further attempts
  were rate-limited. New service instances retained the limit, and the next window
  allowed correct login. Rotation/logout/expiry invalidated old sessions.
- HTTP tests checked Secure/HttpOnly/SameSite/host-only Cookie attributes, no token
  in JSON, no-store, cross-origin and missing-Origin write denial, duplicate Cookie
  rejection and continued Bearer behavior. Native bootstrap used synthetic JSON
  stdin, with no password in argv or output.
- No live Owner password, canonical host database or Runtime configuration changed.
  Frontend/configuration and deferred real Runtime gates remain separate work.
