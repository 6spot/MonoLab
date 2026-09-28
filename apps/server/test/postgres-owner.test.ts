import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { database, transaction } from '../../../packages/db/src/index.ts';
import type { Database } from '../../../packages/db/src/index.ts';
import { migrate } from '../../../packages/db/src/migrate.ts';
import type { OwnerCommand } from '../../../packages/protocol/src/index.ts';
import { createApp } from '../src/app.ts';
import { BoundaryService } from '../src/service.ts';
import { createAttemptFixture, enrollFixture } from '../src/fixtures.ts';
import { issueAttemptCredential } from '../src/auth.ts';
import { consumeTaskConfirmation, issueOwnerSession, OwnerCommands, prepareTaskProposal, revokeOwnerSession } from '../src/owner-commands.ts';

const signingKey = 'test-only-owner-command-signing-key';
const error = (code: string) => ({ detail: { code } });
describe.skipIf(process.env.MONOLAB_TEST_DATABASE !== '1')('PostgreSQL Owner commands', () => {
  let db: Database; let admin: Database; let commands: OwnerCommands;
  const namespace = `owner_${randomUUID().replaceAll('-', '')}`;
  beforeAll(async () => {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL required');
    admin = database(process.env.DATABASE_URL); await admin.pool.query(`CREATE SCHEMA ${namespace}`);
    const url = new URL(process.env.DATABASE_URL);
    url.searchParams.set('options', `-c search_path=${namespace} -c statement_timeout=10000 -c lock_timeout=8000`);
    db = database(url.toString()); await migrate(db); commands = new OwnerCommands(db);
  });
  afterAll(async () => {
    if (db) await db.pool.end();
    if (admin) { await admin.pool.query(`DROP SCHEMA ${namespace} CASCADE`); await admin.pool.end(); }
  });
  async function fixture() {
    const runner = randomUUID(); const runnerToken = randomUUID(); await enrollFixture(db, runner, runnerToken, 1);
    const launch = await createAttemptFixture(db, { runner_id: runner, attempt_id: randomUUID(), task_id: randomUUID(), kind: 'node', resource_id: 'repo', prompt: 'Owner confirmation test' });
    const session = await issueOwnerSession(db);
    const input = { id: randomUUID(), task_id: launch.task_id, action: 'apply_rework' as const, content: { nodes: [launch.node_id], reason: 'correct result' } };
    const prepared = await transaction(db, (tx) => prepareTaskProposal(tx, input));
    const command: OwnerCommand = { schema_version: 1, request_id: randomUUID(), scope_id: launch.task_id, expected_control_version: 1, name: 'confirm_proposal', payload: { proposal_id: prepared.proposal_id, content_digest: prepared.content_digest } };
    const binding = { scope_id: launch.task_id, action: input.action, content_digest: prepared.content_digest };
    return { launch, session, input, prepared, command, binding, runnerToken };
  }

  it('separates Owner, Runner and Attempt credentials at HTTP boundaries', async () => {
    const f = await fixture(); const app = createApp(new BoundaryService(db, { signingKey }));
    const attempt = issueAttemptCredential({ attempt_id: f.launch.attempt_id, dispatch_id: f.launch.dispatch_id, fencing_generation: 1, expires: Date.now() + 60000 }, signingKey);
    try {
      for (const token of [f.runnerToken, attempt]) {
        for (const method of ['POST', 'GET'] as const) {
          const response = await app.inject({ method, url: method === 'POST' ? '/v1/owner/commands' : `/v1/owner/scopes/${f.command.scope_id}/commands/${f.command.request_id}`, headers: { authorization: `Bearer ${token}` }, ...(method === 'POST' ? { payload: f.command } : {}) });
          expect(response.statusCode).toBe(401);
        }
      }
      for (const url of ['/v1/runner/inventory', `/v1/commands/${f.command.request_id}`]) {
        expect((await app.inject({ method: 'GET', url, headers: { authorization: `Bearer ${f.session.token}` } })).statusCode).toBe(401);
      }
      const response = await app.inject({ method: 'POST', url: '/v1/owner/commands', headers: { authorization: `Bearer ${f.session.token}` }, payload: f.command });
      expect(response.statusCode).toBe(200); expect(response.json().status).toBe('committed');
      const version = await app.inject({ method: 'POST', url: '/v1/owner/commands', headers: { authorization: `Bearer ${f.session.token}` }, payload: { ...f.command, schema_version: 2 } });
      expect(version.json().error.code).toBe('unsupported_version');
    } finally { await app.close(); }
  });

  it('stores only token digests and denies revoked or expired sessions even on replay', async () => {
    const f = await fixture(); await commands.confirm(f.session.token, f.command);
    const stored = (await db.pool.query('SELECT * FROM owner_sessions WHERE id=$1', [f.session.session_id])).rows[0];
    expect(JSON.stringify(stored)).not.toContain(f.session.token); expect(stored.token_digest).toMatch(/^[0-9a-f]{64}$/);
    await revokeOwnerSession(db, f.session.session_id);
    await expect(commands.confirm(f.session.token, f.command)).rejects.toMatchObject(error('unauthorized'));
    await expect(commands.status(f.session.token, f.command.scope_id, f.command.request_id)).rejects.toMatchObject(error('unauthorized'));
    const expired = await issueOwnerSession(db);
    await db.pool.query("UPDATE owner_sessions SET expires_at=now()-interval '1 second' WHERE id=$1", [expired.session_id]);
    await expect(commands.status(expired.token, f.command.scope_id, f.command.request_id)).rejects.toMatchObject(error('unauthorized'));
  });

  it('serializes duplicate confirmations and preserves receipts before stale guards', async () => {
    const f = await fixture();
    const results = await Promise.all(Array.from({ length: 8 }, () => commands.confirm(f.session.token, f.command)));
    expect(results.every((result) => result.confirmation_id === results[0]!.confirmation_id)).toBe(true);
    const other = await commands.confirm(f.session.token, { ...f.command, request_id: randomUUID() });
    expect(other.confirmation_id).toBe(results[0]!.confirmation_id);
    await expect(commands.confirm(f.session.token, { ...f.command, payload: { ...f.command.payload, content_digest: 'a'.repeat(64) } })).rejects.toMatchObject(error('payload_conflict'));
    await db.pool.query('UPDATE tasks SET control_version=control_version+1 WHERE id=$1', [f.command.scope_id]);
    expect(await commands.confirm(f.session.token, f.command)).toEqual(results[0]);
    expect(await commands.status(f.session.token, f.command.scope_id, f.command.request_id)).toEqual(results[0]);
    await expect(commands.confirm(f.session.token, { ...f.command, request_id: randomUUID(), expected_control_version: 2 })).rejects.toMatchObject(error('version_conflict'));
    expect((await db.pool.query('SELECT count(*) FROM authorization_receipts WHERE proposal_id=$1', [f.input.id])).rows[0].count).toBe('1');
  });

  it('keeps proposal identity immutable, including concurrent cross-Task collisions', async () => {
    const f = await fixture(); const g = await fixture();
    expect(await transaction(db, (tx) => prepareTaskProposal(tx, f.input))).toEqual(f.prepared);
    await expect(transaction(db, (tx) => prepareTaskProposal(tx, { ...f.input, content: { changed: true } }))).rejects.toMatchObject(error('payload_conflict'));
    const id = randomUUID();
    const race = await Promise.allSettled([f.input, g.input].map((input) => transaction(db, (tx) => prepareTaskProposal(tx, { ...input, id }))));
    expect(race.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(race.find((result) => result.status === 'rejected')).toMatchObject({ reason: error('payload_conflict') });
  });

  it('rejects wrong proposal scope/digest and revoked or expired proposals', async () => {
    const f = await fixture(); const g = await fixture();
    await expect(commands.confirm(f.session.token, { ...f.command, scope_id: g.command.scope_id })).rejects.toMatchObject(error('denied_scope'));
    await expect(commands.confirm(f.session.token, { ...f.command, payload: { ...f.command.payload, content_digest: '0'.repeat(64) } })).rejects.toMatchObject(error('payload_conflict'));
    for (const change of ["expires_at=now()-interval '1 second'", 'revoked=true']) {
      const h = await fixture(); const confirmed = await commands.confirm(h.session.token, h.command);
      await db.pool.query(`UPDATE task_command_proposals SET ${change} WHERE id=$1`, [h.input.id]);
      expect(await commands.confirm(h.session.token, h.command)).toEqual(confirmed);
      await expect(commands.confirm(h.session.token, { ...h.command, request_id: randomUUID() })).rejects.toMatchObject(error('unmet_precondition'));
      await expect(transaction(db, (tx) => consumeTaskConfirmation(tx, h.session.token, confirmed.confirmation_id!, randomUUID(), h.binding))).rejects.toMatchObject(error('unmet_precondition'));
    }
  });

  it('binds Specification and Plan identities even without a control counter change', async () => {
    for (const [column, table] of [['specification_id', 'specification_revisions'], ['plan_id', 'plan_revisions']]) {
      const f = await fixture(); const confirmation = await commands.confirm(f.session.token, f.command);
      await transaction(db, async (tx) => {
        const id = randomUUID();
        await tx.query(`INSERT INTO ${table}(id,task_id,content) VALUES($1,$2,$3)`, [id, f.command.scope_id, {}]);
        await tx.query(`UPDATE tasks SET ${column}=$2 WHERE id=$1`, [f.command.scope_id, id]);
      });
      await expect(commands.confirm(f.session.token, { ...f.command, request_id: randomUUID() })).rejects.toMatchObject(error('version_conflict'));
      await expect(transaction(db, (tx) => consumeTaskConfirmation(tx, f.session.token, confirmation.confirmation_id!, randomUUID(), f.binding))).rejects.toMatchObject(error('version_conflict'));
      expect(await commands.confirm(f.session.token, f.command)).toEqual(confirmation);
    }
  });

  it('consumes exact authorization atomically with domain changes and rolls back on failure', async () => {
    const f = await fixture(); const confirmed = await commands.confirm(f.session.token, f.command); const requestId = randomUUID();
    for (const [binding, code] of [[{ ...f.binding, action: 'accept_delivery' as const }, 'denied_scope'], [{ ...f.binding, content_digest: '0'.repeat(64) }, 'payload_conflict']] as const) {
      await expect(transaction(db, (tx) => consumeTaskConfirmation(tx, f.session.token, confirmed.confirmation_id!, requestId, binding))).rejects.toMatchObject(error(code));
    }
    await expect(transaction(db, async (tx) => {
      await consumeTaskConfirmation(tx, f.session.token, confirmed.confirmation_id!, requestId, f.binding);
      await tx.query('UPDATE tasks SET control_version=2 WHERE id=$1', [f.command.scope_id]);
      throw new Error('injected transaction failure');
    })).rejects.toThrow('injected transaction failure');
    expect((await db.pool.query('SELECT consumed_by FROM authorization_receipts WHERE id=$1', [confirmed.confirmation_id])).rows[0].consumed_by).toBeNull();
    expect((await db.pool.query('SELECT control_version FROM tasks WHERE id=$1', [f.command.scope_id])).rows[0].control_version).toBe('1');
    await transaction(db, (tx) => consumeTaskConfirmation(tx, f.session.token, confirmed.confirmation_id!, requestId, f.binding));
    await transaction(db, (tx) => consumeTaskConfirmation(tx, f.session.token, confirmed.confirmation_id!, requestId, f.binding));
    await expect(transaction(db, (tx) => consumeTaskConfirmation(tx, f.session.token, confirmed.confirmation_id!, randomUUID(), f.binding))).rejects.toMatchObject(error('payload_conflict'));
  });
});
