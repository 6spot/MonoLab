# Product naming and deployment upgrades

The product and bundled Agent CLI are named **monos**. The canonical repository is
[6spot/monos](https://github.com/6spot/monos). Use lowercase `monos` in UI text,
documentation, command examples and executable names.

| Surface | Current name |
| --- | --- |
| Agent command | `monos` |
| Runner and privileged helpers | `monos-runner`, `monos-probe-launch`, `monos-probe-exec` |
| TypeScript workspace packages | `@monos/server`, `@monos/web`, `@monos/protocol`, `@monos/domain`, `@monos/db` |
| Go modules | `monos.local/runner`, `monos.local/protocol` |
| Product environment variables | `MONOS_*`, including `MONOS_SOCKET` |
| Owner session cookie | `__Host-monos` |
| Fresh probe Compose project | `monos-boundary-probe` |
| Fresh probe database/user | `monos` |
| Fresh probe service/config/storage | `monos-probe*`, `/etc/monos-probe`, `/var/lib/monos-probe`, `/run/monos-probe` |

Generic third-party settings such as `DATABASE_URL`, `HOME`, `XDG_*`, `POSTGRES_*`
and `OPENCODE_*` retain their upstream names. This naming change does not change
Tool Protocol command names, schema version, formal states or immutable receipts.
The v1 provider-key derivation salt and numeric migration lock also retain their
exact original bytes/values; stored GitHub credentials remain decryptable.

## Existing deployments

The renamed templates describe a **fresh installation**. Changing the Compose
project name selects a different default volume name; running them beside an older
installation does not migrate its canonical database. The test host's prior
accepted installation and retained evidence were not moved by the source rename.

An existing deployment needs a separate, quiescent migration:

1. Drain new dispatch and reconcile all process/workspace ownership. Record exact
   old unit, account, UID/GID, database volume, configuration and storage identities.
2. Back up PostgreSQL, service configuration and coordinated Runner journal/storage.
   Keep secrets private and preserve previous binaries for rollback.
3. Stop the old backend/Runner. Coordinate the upgrade: host path/unit ownership
   checks and configuration entrypoints use the new namespace. Database migration
   checksums and the migration lock remain unchanged.
4. Explicitly retain/restore the existing database volume and update its configured
   database/user connection details. Configure new environment names together;
   preparation refuses to overwrite old secret directories.
5. Migrate host paths/accounts and persisted path/unit references coherently,
   preserving numeric ownership and immutable request/receipt bytes. Moving a
   directory alone is insufficient for Git worktree links or recorded ownership.
   No automatic in-place host-state migrator is provided.
6. Start compatible services and verify schema checksums, enrollment, inventory,
   existing-result reads and physical ownership before reopening dispatch.

The renamed browser cookie requires signing in again. Owner credentials and stored
records are retained by a proper database migration; the rename does not reset them.
Do not delete a previous volume, journal or workspace because templates use another
name. On failure, restore the coordinated previous installation rather than combine
old data with partially renamed ownership.

## Historical evidence

Markdown reports and examples use current product terminology. Marked historical
reports are not new executions: exact original commands, paths and test repository
names remain in Git history and raw attachments. Machine-readable acceptance JSON
is immutable, including process names, paths, digests and hashes. Renaming must not
alter observations or imply that older Runtime acceptance validates new binaries.
