import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { database } from '../../../packages/db/src/index.ts';
import type { Database } from '../../../packages/db/src/index.ts';
import { migrate } from '../../../packages/db/src/migrate.ts';
import { createAttemptFixture, enrollFixture, revokeFixture } from '../src/fixtures.ts';
import type { AttemptFixture } from '../src/fixtures.ts';
import { BoundaryService } from '../src/service.ts';
import { Worker } from './fixtures/process-worker.ts';

describe.skipIf(process.env.MONOLAB_TEST_DATABASE !== '1')('independent PostgreSQL claim workers', () => {
  let db: Database;
  let admin: Database;
  let url: string;
  const namespace = `probe_claim_${randomUUID().replaceAll('-', '')}`;
  const workers: Worker[] = [];
  beforeAll(async () => {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL required');
    admin = database(process.env.DATABASE_URL);
    await admin.pool.query(`CREATE SCHEMA ${namespace}`);
    const parsed = new URL(process.env.DATABASE_URL);
    parsed.searchParams.set('options', `-c search_path=${namespace} -c statement_timeout=10000 -c lock_timeout=8000`);
    url = parsed.toString(); db = database(url); await migrate(db);
  });
  afterEach(async () => { await Promise.all(workers.splice(0).map((worker) => worker.stop())); });
  afterAll(async () => {
    await Promise.all(workers.splice(0).map((worker) => worker.stop()));
    if (db) await db.pool.end();
    if (admin) { await admin.pool.query(`DROP SCHEMA ${namespace} CASCADE`); await admin.pool.end(); }
  });
  async function worker() {
    const value = new Worker(url); workers.push(value);
    const ready = await value.next('ready');
    return { value, pid: ready.pid! };
  }
  async function runner(capacity = 2) {
    const id = randomUUID(); await enrollFixture(db, id, randomUUID(), capacity); return id;
  }
  function input(runnerId: string): AttemptFixture {
    return { runner_id: runnerId, attempt_id: randomUUID(), task_id: randomUUID(), kind: 'node', resource_id: 'repo', prompt: 'independent claim test' };
  }
  async function blocked(pids: number[]) {
    // Poll an objective lock observation; elapsed time never counts as overlap.
    for (let count = 0; count < 500; count++) {
      const result = await admin.pool.query<{ count: string }>("SELECT count(*) FROM pg_stat_activity WHERE pid=ANY($1::int[]) AND wait_event_type='Lock'", [pids]);
      if (Number(result.rows[0]!.count) === pids.length) return;
      await delay(10);
    }
    throw new Error('Workers never simultaneously waited on database locks');
  }
  async function race(inputs: AttemptFixture[]) {
    const group = await Promise.all(inputs.map(() => worker()));
    expect(new Set(group.map((item) => item.pid)).size).toBe(inputs.length);
    const barrier = await db.pool.connect();
    try {
      await barrier.query('BEGIN');
      for (const id of [...new Set(inputs.map((item) => item.runner_id))].sort()) await barrier.query('SELECT id FROM runners WHERE id=$1 FOR UPDATE', [id]);
      group.forEach((item, index) => item.value.run(inputs[index]!));
      await blocked(group.map((item) => item.pid));
      await barrier.query('COMMIT');
      return await Promise.all(group.map((item) => item.value.next('result', 'rejected')));
    } finally { await barrier.query('ROLLBACK'); barrier.release(); }
  }
  async function count(table: string, where: string, values: string[]) {
    return Number((await db.pool.query<{ count: string }>(`SELECT count(*) FROM ${table} WHERE ${where}`, values)).rows[0]!.count);
  }

  it('replays one Attempt across processes with one durable dispatch', async () => {
    const request = input(await runner(1));
    const results = await race([request, request]);
    expect(results.map((item) => item.type)).toEqual(['result', 'result']);
    expect(results[0]!.dispatch).toEqual(results[1]!.dispatch);
    expect(await count('attempts', 'id=$1', [request.attempt_id])).toBe(1);
    expect(await count('outbox', "attempt_id=$1 AND kind='start'", [request.attempt_id])).toBe(1);
  }, 20000);

  it('keeps one owner across different Runner locks', async () => {
    const first = input(await runner());
    const second = { ...first, runner_id: await runner(), attempt_id: randomUUID() };
    const results = await race([first, second]);
    expect(results.filter((item) => item.type === 'result')).toHaveLength(1);
    expect(results.filter((item) => item.code === '23505')).toHaveLength(1);
    expect(await count('attempts', 'task_id=$1 AND NOT process_released', [first.task_id])).toBe(1);
    expect(await count('outbox', 'attempt_id IN (SELECT id FROM attempts WHERE task_id=$1)', [first.task_id])).toBe(1);
  }, 20000);

  it('respects capacity and rolls back losing task/dispatch records', async () => {
    const runnerId = await runner(2);
    const requests = Array.from({ length: 4 }, () => input(runnerId));
    const results = await race(requests);
    expect(results.filter((item) => item.type === 'result')).toHaveLength(2);
    expect(results.filter((item) => item.code === 'unmet_precondition')).toHaveLength(2);
    expect(await count('attempts', 'runner_id=$1 AND NOT process_released', [runnerId])).toBe(2);
    for (let index = 0; index < requests.length; index++) {
      const expected = results[index]!.type === 'result' ? 1 : 0;
      expect(await count('tasks', 'id=$1', [requests[index]!.task_id])).toBe(expected);
      expect(await count('nodes', 'task_id=$1', [requests[index]!.task_id])).toBe(expected);
      expect(await count('outbox', 'attempt_id=$1', [requests[index]!.attempt_id])).toBe(expected);
    }
  }, 20000);

  it('rolls back a killed lock holder before the surviving claimant proceeds', async () => {
    const runnerId = await runner(1); const request = input(runnerId);
    const holder = await worker(); holder.value.run(request, true); await holder.value.next('held');
    const survivor = await worker(); survivor.value.run(request); await blocked([survivor.pid]);
    await holder.value.stop();
    expect((await survivor.value.next('result', 'rejected')).type).toBe('result');
    expect((await db.pool.query('SELECT capacity FROM runners WHERE id=$1', [runnerId])).rows[0].capacity).toBe(1);
    expect(await count('outbox', 'attempt_id=$1', [request.attempt_id])).toBe(1);
  }, 20000);

  it('retains committed claims and start intent after worker death', async () => {
    const request = input(await runner(1)); const first = await worker(); first.value.run(request);
    const committed = await first.value.next('result'); await first.value.stop();
    const second = await worker(); second.value.run(request);
    expect((await second.value.next('result')).dispatch).toEqual(committed.dispatch);
    expect(await count('attempts', 'id=$1 AND NOT process_released', [request.attempt_id])).toBe(1);
    expect(await count('outbox', "attempt_id=$1 AND kind='start' AND NOT done", [request.attempt_id])).toBe(1);
  }, 20000);

  it('keeps revoked capacity despite old connection events and heartbeat age', async () => {
    const runnerId = await runner(1); const request = input(runnerId);
    const launch = await createAttemptFixture(db, request);
    const service = new BoundaryService(db, { signingKey: 'test-only-independent-worker-signing-key' });
    const old = await service.connect(runnerId, 'boot'); await service.touch(runnerId, old, true);
    await revokeFixture(db, request.attempt_id);
    await db.pool.query("UPDATE runners SET last_seen=now()-interval '1 day' WHERE id=$1", [runnerId]);
    const current = await service.connect(runnerId, 'boot'); await service.touch(runnerId, current, true);
    await expect(service.event(runnerId, old, { attempt_id: launch.attempt_id, dispatch_id: launch.dispatch_id, stream_id: 'runtime', sequence: 1, kind: 'process_absent', text: 'stale' })).rejects.toThrow();
    expect(await service.authorize(runnerId, current, launch.dispatch_id)).toBeNull();
    const next = input(runnerId); const claimant = await worker(); claimant.value.run(next);
    expect((await claimant.value.next('rejected')).code).toBe('unmet_precondition');
    const stop = (await service.inventory(runnerId)).operations[0]!;
    await service.finishOperation(runnerId, current, { attempt_id: launch.attempt_id, operation_id: stop.operation_id, success: true, result: { writer_absent: true } });
    const replacement = await worker(); replacement.value.run(next);
    expect((await replacement.value.next('result')).dispatch!.attempt_id).toBe(next.attempt_id);
  }, 20000);
});
