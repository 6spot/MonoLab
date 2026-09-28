// Test-only independent database process. Credentials arrive via environment,
// never IPC results or argv. Kept alive after a result for crash-after-commit tests.
import { database } from '../../../../packages/db/src/index.ts';
import { createAttemptFixture } from '../../src/fixtures.ts';
import type { AttemptFixture } from '../../src/fixtures.ts';

const db = database(process.env.DATABASE_URL!);
const pid = (await db.pool.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')).rows[0]!.pid;
process.send!({ type: 'ready', pid });
process.once('message', async (message: { input: AttemptFixture; hold?: boolean }) => {
  try {
    if (message.hold) {
      const tx = await db.pool.connect();
      await tx.query('BEGIN');
      await tx.query('SELECT id FROM runners WHERE id=$1 FOR UPDATE', [message.input.runner_id]);
      await tx.query('UPDATE runners SET capacity=capacity+1 WHERE id=$1', [message.input.runner_id]);
      process.send!({ type: 'held' });
      return; // Parent deliberately kills this process with the transaction open.
    }
    const dispatch = await createAttemptFixture(db, message.input);
    process.send!({ type: 'result', dispatch });
  } catch (error) {
    const value = error as { code?: string; detail?: { code?: string } };
    process.send!({ type: 'rejected', code: value.detail?.code ?? value.code ?? 'worker_error' });
  }
});
