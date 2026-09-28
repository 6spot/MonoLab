import { readFileSync } from 'node:fs';
import { database } from '../../../packages/db/src/index.ts';
import { migrate } from '../../../packages/db/src/migrate.ts';
import { createAttemptFixture, enrollFixture, retryOperationFixture, revokeFixture, safeFixtureResult } from './fixtures.ts';
import type { AttemptFixture } from './fixtures.ts';

// Local administrative surface only. Secrets arrive through stdin, never argv.
const databaseURL = process.env.MONOLAB_DATABASE_URL_FILE ? readFileSync(process.env.MONOLAB_DATABASE_URL_FILE, 'utf8').trim() : process.env.DATABASE_URL;
if (!databaseURL) throw new Error('DATABASE_URL or MONOLAB_DATABASE_URL_FILE is required');
const input = JSON.parse(readFileSync(0, 'utf8')) as AttemptFixture & { action: string; credential: string; capacity?: number; operation_id: string };
const db = database(databaseURL);
try {
  await migrate(db);
  switch (input.action) {
    case 'enroll': await enrollFixture(db, input.runner_id, input.credential, input.capacity); break;
    case 'attempt': process.stdout.write(`${safeFixtureResult(await createAttemptFixture(db, input))}\n`); break;
    case 'revoke': await revokeFixture(db, input.attempt_id); break;
    case 'retry_operation': await retryOperationFixture(db, input.operation_id); break;
    default: throw new Error('Unknown local fixture action');
  }
} finally { await db.pool.end(); }
