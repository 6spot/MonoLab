# monos rename design

## Boundary

The behavior gap is a single product using its previous name across UI, CLI, package
names and deployment entrypoints. Names live in each owning manifest/schema/template;
change producers and consumers together. Do not add an alias framework or change
Tool Protocol semantics, state transitions, request digest inputs or schema version.

## Names

Use `monos` for text and executable names, `MONOS` for uppercase constants,
`@monos/*` for workspace packages, `monos.local/*` for Go modules/schema namespace,
`__Host-monos` for the Owner cookie, and `monos-probe*` for fresh probe resources.
Regenerate protocol outputs from schema/generator and refresh pnpm workspace links.
Rename the four `runner/cmd` directories. Keep dependencies/version pins unchanged.

The v1 provider encryption salt is a fixed binary storage contract, preserved as
explicit hex bytes. A frozen pre-rename synthetic ciphertext verifies compatibility;
fresh round-trip tests alone would miss a renamed salt that breaks old credentials.

## Historical records and upgrade

Do not edit archived raw JSON evidence: embedded Git/receipt digests, cgroup identity,
installed file paths and repository IDs describe actual past executions. Archived
Markdown can adopt current branding with a clear normalization notice pointing to
original Git history and raw attachments. This is not a rerun under the new names.
A source rename is not an in-place storage migration. Existing deployments must drain
and checkpoint before moving service/config/storage identities; never start a new
Compose project against an empty new volume and claim old data was migrated. Browser
users authenticate again under the renamed cookie. Document these contracts.

## Repository operations

Complete and validate code first, then rename the existing GitHub repository via
its admin API and verify same numeric ID/visibility/default branch. Update `origin`;
no new remote repository or history rewrite. After validation and remote rename, move the local directory and explicitly run
remaining commit/archive/journal tools from the new cwd. Verify package links and
Git there before closing the task.

## Rollback

The work is one reversible rename commit plus task records. If validation fails,
repair naming at the owning layer before external rename. Existing host services,
credentials, data and evidence are not moved. A GitHub rename can be reversed using
the same repository ID; verify remote state after an uncertain API response.
