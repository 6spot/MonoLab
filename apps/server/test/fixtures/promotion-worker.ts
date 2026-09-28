import { database } from '../../../../packages/db/src/index.ts';
import { DispatchQueue } from '../../src/dispatch-queue.ts';

const db = database(process.env.DATABASE_URL!);
process.send!({ type: 'ready' });
process.once('message', async (input: { runner: string; instance: string; incarnation: number; crash: 'before' | 'after' }) => {
  const die = () => { process.kill(process.pid, 'SIGKILL'); };
  try {
    const queue = new DispatchQueue(db, input.crash === 'before' ? { beforeCommit: die } : { afterCommit: die });
    await queue.promoteNext(input.runner, input.instance, input.incarnation);
    process.send!({ type: 'unexpected-survival' });
  } catch {
    process.send!({ type: 'worker-error' });
    process.exitCode = 1;
  } finally { await db.pool.end(); process.disconnect(); }
});
