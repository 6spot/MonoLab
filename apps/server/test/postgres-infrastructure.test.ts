import { generateKeyPairSync, randomUUID, verify } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { database } from '../../../packages/db/src/index.ts';
import type { Database } from '../../../packages/db/src/index.ts';
import { migrate } from '../../../packages/db/src/migrate.ts';
import type { ConfigurationCommand, ExecutionPolicy, RuntimeInstallation } from '../../../packages/protocol/src/index.ts';
import { Configuration } from '../src/configuration.ts';
import { GitHub } from '../src/github.ts';
import { issueOwnerSession } from '../src/owner-commands.ts';
import { enrollFixture } from '../src/fixtures.ts';
import { BoundaryService } from '../src/service.ts';

const signingKey = 'synthetic-infrastructure-signing-key-only';
const fault = (code: string) => ({ detail: { code } });
const keys = generateKeyPairSync('rsa', { modulusLength: 2048 });
const pem = keys.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
const installed: RuntimeInstallation = { runtime_id: 'opencode', executable: '/opt/owner/bin/opencode', availability: 'detected', version: '1.18.30', supports_model: true, supports_thinking: false, model_ids: [] };
const policy: ExecutionPolicy = { default_target: { runtime_id: 'opencode', model_id: 'provider/new-manual-model', runner_id: 'pinned-runner' }, fallback_targets: [{ runtime_id: 'opencode', model_id: 'another/model' }], duration_budget: 600 };

describe.skipIf(process.env.MONOS_TEST_DATABASE !== '1')('Runtime and GitHub configuration', () => {
  let db: Database; let admin: Database; let token: string; let configuration: Configuration;
  const namespace = `infrastructure_${randomUUID().replaceAll('-', '')}`;
  const requests: { url: string; init: RequestInit }[] = [];
  let providerFailure: 'none' | 'denied' | 'oversized' | 'bad_repo' = 'none';
  const fetcher: typeof fetch = async (url, init) => {
    requests.push({ url: String(url), init: init! });
    if (providerFailure === 'denied') return new Response('sensitive-provider-error synthetic-token', { status: 403 });
    if (providerFailure === 'oversized') return new Response('x'.repeat(1024 * 1024 + 1));
    if (String(url).endsWith('/access_tokens')) return Response.json({ token: 'synthetic-installation-token', expires_at: new Date(Date.now() + 3600000).toISOString() });
    return Response.json({ repositories: [{ id: 42, full_name: 'example/repository', clone_url: providerFailure === 'bad_repo' ? 'https://attacker.test/repo' : 'https://github.com/example/repository.git', default_branch: 'main', private: true }] });
  };
  beforeAll(async () => {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL required');
    admin = database(process.env.DATABASE_URL); await admin.pool.query(`CREATE SCHEMA ${namespace}`);
    const url = new URL(process.env.DATABASE_URL); url.searchParams.set('options', `-c search_path=${namespace} -c statement_timeout=10000`);
    db = database(url.toString()); await migrate(db); token = (await issueOwnerSession(db)).token;
    configuration = new Configuration(db, new GitHub(signingKey, fetcher));
  });
  afterAll(async () => { if (db) await db.pool.end(); if (admin) { await admin.pool.query(`DROP SCHEMA ${namespace} CASCADE`); await admin.pool.end(); } });
  async function command(name: ConfigurationCommand['name'], payload: ConfigurationCommand['payload']): Promise<ConfigurationCommand> {
    return { schema_version: 1, request_id: randomUUID(), expected_control_version: (await configuration.read(token)).control_version, name, payload };
  }

  it('persists complete Global/Planner/Role policies and manual models without rewriting launches', async () => {
    const c = await command('save_policies', { global: policy, planner: { ...policy, fallback_targets: [] } });
    const result = await configuration.save(token, c);
    expect((await new Configuration(db).read(token)).policies.global).toEqual(policy);
    expect(await configuration.save(token, c)).toEqual(result);
    const r = { id: randomUUID(), name: 'Custom behavior', description: '', instructions: 'Verify outputs', archived: false, execution_policy: policy };
    await configuration.save(token, await command('save_role', r));
    expect((await configuration.read(token)).roles.find((row) => row.id === r.id)?.execution_policy).toEqual(policy);
    await expect(configuration.save(token, { ...await command('save_policies', {}), payload: { global: { ...policy, fallback_targets: ['opencode'] } } })).rejects.toThrow();
    expect((await db.pool.query('SELECT id FROM attempts')).rowCount).toBe(0);
    await configuration.save(token, await command('save_policies', {}));
    expect((await configuration.read(token)).policies).toEqual({});
  });

  it('encrypts private keys and excludes secrets from configuration snapshots and receipts', async () => {
    const c = await command('save_github', { app_id: '123', installation_id: '456', private_key: pem });
    const result = await configuration.save(token, c);
    const row = (await db.pool.query('SELECT * FROM github_configuration')).rows[0];
    const snapshot = await configuration.read(token); const receipts = (await db.pool.query('SELECT * FROM configuration_receipts')).rows;
    expect(snapshot.github).toMatchObject({ app_id: '123', installation_id: '456' });
    expect(snapshot.github?.key_fingerprint).toMatch(/^[0-9a-f]{64}$/);
    for (const value of [row, snapshot, receipts, result]) { expect(JSON.stringify(value)).not.toContain('PRIVATE KEY'); expect(JSON.stringify(value)).not.toContain(pem); }
    expect(row.encrypted_key.split('.')).toHaveLength(3);
    expect(await configuration.save(token, c)).toEqual(result);
    await configuration.save(token, await command('save_github', { app_id: '123', installation_id: '789' }));
    expect((await configuration.read(token)).github?.key_fingerprint).toBe(snapshot.github?.key_fingerprint);
    await expect(configuration.save(token, await command('save_github', { app_id: '321', installation_id: '789' }))).rejects.toMatchObject(fault('invalid_input'));
  });

  it('uses an App JWT and short-lived read-only installation token for a bounded repository page', async () => {
    requests.length = 0;
    const page = await configuration.repositories(token, 2);
    expect(page.repositories).toEqual([{ provider_repo_id: '42', full_name: 'example/repository', remote_url: 'https://github.com/example/repository.git', default_branch: 'main', private: true }]);
    expect(JSON.stringify(page)).not.toContain('token');
    expect(requests.map((r) => r.url)).toEqual(['https://api.github.com/app/installations/789/access_tokens', 'https://api.github.com/installation/repositories?per_page=100&page=2']);
    expect(JSON.parse(String(requests[0]!.init.body))).toEqual({ permissions: { contents: 'read', metadata: 'read' } });
    const auth = new Headers(requests[0]!.init.headers).get('Authorization')!.slice(7); const [header, payload, signature] = auth.split('.');
    expect(verify('RSA-SHA256', Buffer.from(`${header}.${payload}`), keys.publicKey, Buffer.from(signature!, 'base64url'))).toBe(true);
    expect(JSON.parse(Buffer.from(payload!, 'base64url').toString()).iss).toBe('123');
    expect(new Headers(requests[1]!.init.headers).get('Authorization')).toBe('Bearer synthetic-installation-token');
    expect(requests.every((r) => r.init.redirect === 'error' && r.init.signal)).toBe(true);
    await expect(configuration.repositories(token, 0)).rejects.toMatchObject(fault('invalid_input'));
    const before = requests.length; await expect(configuration.repositories('runner-token', 1)).rejects.toMatchObject(fault('unauthorized')); expect(requests).toHaveLength(before);
  });

  it('rejects malformed keys, rotated encryption secrets and provider failure responses without leaking data', async () => {
    const before = await configuration.read(token); const c = await command('save_github', { app_id: '123', installation_id: '789', private_key: 'not-a-key-sensitive' });
    await expect(configuration.save(token, c)).rejects.toMatchObject(fault('invalid_input')); expect(await configuration.read(token)).toEqual(before);
    await expect(new Configuration(db, new GitHub('another-synthetic-service-key-for-rotation', fetcher)).repositories(token, 1)).rejects.toMatchObject(fault('unmet_precondition'));
    for (const failure of ['denied', 'oversized', 'bad_repo'] as const) {
      providerFailure = failure;
      try { await configuration.repositories(token, 1); throw new Error('Expected provider failure'); }
      catch (error) { expect(error).toMatchObject(fault('unmet_precondition')); expect(String(error)).not.toContain('sensitive'); expect(String(error)).not.toContain('synthetic-token'); }
    }
    providerFailure = 'none';
  });

  it('persists Runner-scoped reports and fences prior channels, backend instances and missing reports', async () => {
    const runner = randomUUID(); await enrollFixture(db, runner, randomUUID());
    const service = new BoundaryService(db, { signingKey }); const incarnation = await service.connect(runner, 'boot');
    await service.touch(runner, incarnation, true, [installed]);
    let row = (await configuration.infrastructure(token, service.instanceId)).runners.find((r) => r.runner_id === runner)!;
    expect(row.online).toBe(true); expect(row.runtimes[0]).toMatchObject({ installation: installed, current: true });
    const restarted = new BoundaryService(db, { signingKey });
    expect((await configuration.infrastructure(token, restarted.instanceId)).runners.find((r) => r.runner_id === runner)!.online).toBe(false);
    await expect(restarted.touch(runner, incarnation, true, [])).rejects.toMatchObject(fault('stale_execution'));
    const next = await restarted.connect(runner, 'next-boot');
    await expect(service.touch(runner, incarnation, true, [])).rejects.toMatchObject(fault('stale_execution'));
    await restarted.touch(runner, next, true); // Older client has no discovery report.
    row = (await configuration.infrastructure(token, restarted.instanceId)).runners.find((r) => r.runner_id === runner)!;
    expect(row.online).toBe(true); expect(row.runtimes[0]!.current).toBe(false);
    await expect(restarted.touch(runner, next, true, [installed, installed])).rejects.toMatchObject(fault('invalid_input'));
    await restarted.touch(runner, next, true, [{ ...installed, availability: 'unavailable' }]);
    await restarted.disconnect(runner, next);
    row = (await configuration.infrastructure(token, restarted.instanceId)).runners.find((r) => r.runner_id === runner)!;
    expect(row.online).toBe(false); expect(row.runtimes[0]!.installation.availability).toBe('unavailable');
  });
});
