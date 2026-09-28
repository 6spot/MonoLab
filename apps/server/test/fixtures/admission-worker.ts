import { database } from '../../../../packages/db/src/index.ts';
import { submission } from '../../../../packages/protocol/src/index.ts';
import type { CommandEnvelope, Dispatch } from '../../../../packages/protocol/src/index.ts';
import { BoundaryService } from '../../src/service.ts';

const db = database(process.env.DATABASE_URL!);
process.send!({ type: 'ready' });
process.once('message', async (input: { launch: Dispatch; command: CommandEnvelope; crash: 'before' | 'after' }) => {
  try {
    const die = () => { process.kill(process.pid, 'SIGKILL'); };
    const service = new BoundaryService(db, {
      signingKey: 'test-only-admission-worker-signing-key',
      ...(input.crash === 'before' ? { beforeAdmissionCommit: die } : { afterAdmissionCommit: die }),
    });
    const incarnation = await service.connect(input.launch.runner_id, 'test-boot');
    await service.touch(input.launch.runner_id, incarnation, true);
    const grant = await service.authorize(input.launch.runner_id, incarnation, input.launch.dispatch_id);
    if (!grant) throw new Error('No test grant');
    await service.admit(grant.credential, submission(input.command));
    process.send!({ type: 'unexpected-survival' });
  } catch (error) {
    const value = error as { code?: string; detail?: { code?: string } };
    process.send!({ type: 'worker-error', code: value.detail?.code ?? value.code ?? 'worker_error' });
    process.exitCode = 1;
    await db.pool.end();
    process.disconnect();
  }
});
