# monos rename verification

## Result

Product text, bundled CLI, four command directories, package/module namespaces,
configuration prefixes, cookie, schema metadata and deployment scripts use `monos`.
All tracked Markdown documents use current branding; archived narratives carry a
normalization notice. The raw Runtime evidence JSON remains byte-identical.

GitHub repository rename succeeded in place: `6spot/monos`, repository ID
`1390769584`, public visibility and default branch `main` retained. Origin is
`https://github.com/6spot/monos.git`; `git ls-remote --symref origin HEAD` resolves
`main` at `565f1459c285d30c0d61aec23ca6cdf54d1f3855`. Source commits are local on the
existing development branch; no push, merge or history rewrite was performed.

## Checks

| Check | Result |
| --- | --- |
| Frozen pnpm install | Pass; no dependency-version changes |
| Lint and backend/Web typecheck | Pass |
| Local Vitest | 79 pass; 72 DB cases initially skipped and run separately |
| Real PostgreSQL suite | 74 pass on isolated local PostgreSQL 17.10 |
| Real browser/backend/database suite | 6 pass; desktop branding screenshot inspected |
| Python probe regression tests | 31 pass |
| Strict TLS preparation test | Pass |
| Protocol regeneration/drift and root build | Pass |
| Go race tests and vet | Pass on Darwin arm64, Go 1.27.1 |
| Four CGO Go executables and CLI/Runner help | Pass; command is `monos`, Runner default config uses new path |
| Old-brand source/Markdown scan | No occurrences outside the unchanged raw historical evidence attachment |
| Historical evidence SHA256 | Unchanged from pre-rename snapshot |
| Temporary database cleanup | Zero test schemas; temporary server stopped |

The PostgreSQL test tool was downloaded only into a task-specific temporary directory
from `@embedded-postgres/darwin-arm64@17.10.0-beta.17`, with SHA512 integrity verified.
Missing version aliases in that distribution were linked only inside its temporary
library directory. No project dependency or system database service was added.

The previous SSH master had expired and default SSH authentication was unavailable;
Linux/systemd/container/runtime acceptance was not rerun. This is a source and local
integration rename verification, not acceptance of a migrated test-host installation.
No new model invocation or remote service/data migration was performed.

## Credential compatibility finding

A broad text replacement would alter the provider HKDF salt and invalidate existing
GitHub private-key ciphertext despite passing fresh round-trip tests. Preserve the
v1 salt as explicit fixed bytes. A frozen synthetic ciphertext generated from the
original Git source blob now verifies decryption and a valid RSA provider JWT under
the renamed client. Cookie renaming requires browser login again; it does not reset
Owner records or provider keys. Numeric migration lock and SQL checksums are unchanged.

See `docs/12-product-naming-and-upgrades.md` before applying new deployment namespaces
to existing volumes, service accounts or persisted Runner/Git paths. Exact historical
observations stay in Git history and immutable raw JSON, rather than being relabeled
as a fresh Runtime test.

## Checkout move

The local checkout is `/Users/me/IdeaProjects/monos`. Git reports the new worktree
path and canonical origin. Protocol drift and Web typecheck passed again from that
path, confirming workspace links survived the move. The final source audit found
only mechanical naming changes outside the reviewed crypto-compatibility fix and
its new frozen fixture/test. All original raw acceptance evidence hashes match.
