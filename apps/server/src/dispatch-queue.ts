import { randomUUID } from 'node:crypto';
import { transaction } from '../../../packages/db/src/index.ts';
import type { Database, Transaction } from '../../../packages/db/src/index.ts';
import { CommandError } from '../../../packages/domain/src/commands.ts';
import { canonicalJSON, digest, validate } from '../../../packages/protocol/src/index.ts';
import type { Dispatch } from '../../../packages/protocol/src/index.ts';
import { assertCurrentNode } from './task-records.ts';
import type { ControlBasis } from './task-records.ts';

export interface QueueInput {
  attempt_id: string; runner_id: string; task_id: string; node_id?: string;
  kind: 'node' | 'planner'; expected: ControlBasis; resource_id: string;
  runtime_id: Dispatch['runtime_id']; model: Dispatch['model']; prompt: string; source_watermark: number;
}
interface Queued { id: string; task_id: string; node_id: string | null; owner_key: string; state: string; launch: Dispatch; specification_id: string; plan_id: string | null }

export class DispatchQueue {
  readonly db: Database;
  readonly hooks: { beforeCommit?: () => void; afterCommit?: () => void };
  constructor(db: Database, hooks: { beforeCommit?: () => void; afterCommit?: () => void } = {}) { this.db = db; this.hooks = hooks; }

  // The owning command authenticates and writes its receipt with this durable
  // selected Attempt. This method does not select a model or initiate a process.
  async enqueue(tx: Transaction, input: QueueInput): Promise<string> {
    for (const id of [input.attempt_id, input.runner_id, input.task_id]) validate('Id', id);
    const hash = digest(canonicalJSON(input));
    const runner = await tx.query('SELECT id FROM runners WHERE id=$1 FOR UPDATE', [input.runner_id]);
    if (!runner.rowCount) throw new CommandError('denied_scope', 'Unknown Runner');
    const task = (await tx.query<{ state: string; control_version: string; specification_id: string; plan_id: string | null }>('SELECT state,control_version,specification_id,plan_id FROM tasks WHERE id=$1 FOR UPDATE', [input.task_id])).rows[0];
    if (!task) throw new CommandError('denied_scope', 'Unknown Task');
    const existing = (await tx.query<{ queue_digest: string; dispatch_id: string }>('SELECT queue_digest,dispatch_id FROM attempts WHERE id=$1', [input.attempt_id])).rows[0];
    if (existing) {
      if (existing.queue_digest !== hash) throw new CommandError('payload_conflict', 'Queued Attempt identity has different content');
      return existing.dispatch_id;
    }
    if (task.state !== 'RUNNING') throw new CommandError('unmet_precondition', 'Task is not executing');
    if (Number(task.control_version) !== input.expected.control_version || task.specification_id !== input.expected.specification_id || task.plan_id !== input.expected.plan_id) throw new CommandError('version_conflict', 'Queue input revision basis changed');
    await this.checkLocality(tx, input.task_id, input.runner_id);
    let activation = 0;
    if (input.kind === 'node') {
      if (!input.node_id) throw new CommandError('invalid_input', 'Node owner required');
      const node = (await tx.query<{ activation: string }>('SELECT activation FROM nodes WHERE id=$1 AND task_id=$2', [input.node_id, input.task_id])).rows[0];
      if (!node) throw new CommandError('denied_scope', 'Node belongs to another Task');
      activation = Number(node.activation);
      if ((await assertCurrentNode(tx, { task_id: input.task_id, node_id: input.node_id, node_activation: activation })).state !== 'PENDING') throw new CommandError('unmet_precondition', 'Node is not pending');
      if (!(await this.dependenciesReady(tx, input.expected.plan_id!, input.node_id))) throw new CommandError('unmet_precondition', 'Upstream results are not current');
    } else if (input.node_id) throw new CommandError('invalid_input', 'Planner is not a Node');
    const owner = input.kind === 'node' ? `node:${input.node_id}` : `planner:${input.task_id}`;
    if ((await tx.query("SELECT id FROM attempts WHERE owner_key=$1 AND state='QUEUED'", [owner])).rowCount) throw new CommandError('unmet_precondition', 'Owner already has selected queued work');
    const launch: Dispatch = {
      dispatch_id: randomUUID(), attempt_id: input.attempt_id, runner_id: input.runner_id,
      task_id: input.task_id, ...(input.node_id ? { node_id: input.node_id } : {}), kind: input.kind,
      fencing_generation: 1, node_activation: activation, control_version: input.expected.control_version,
      resource_id: input.resource_id, runtime_id: input.runtime_id, model: input.model,
      prompt: input.prompt, source_watermark: input.source_watermark,
      mutation_allowed: false, process_released: true,
    };
    validate('Dispatch', launch);
    await tx.query(`INSERT INTO attempts(id,runner_id,task_id,node_id,owner_key,dispatch_id,kind,fencing_generation,node_activation,
      launch,mutation_allowed,process_released,state,queue_digest,specification_id,plan_id)
      VALUES($1,$2,$3,$4,$5,$6,$7,1,$8,$9,false,true,'QUEUED',$10,$11,$12)`,
    [input.attempt_id, input.runner_id, input.task_id, input.node_id ?? null, owner, launch.dispatch_id, input.kind, activation, launch, hash, task.specification_id, task.plan_id]);
    return launch.dispatch_id;
  }

  private async checkLocality(tx: Transaction, taskId: string, runnerId: string) {
    if ((await tx.query(`SELECT runner_id FROM task_runner_locality WHERE task_id=$1 AND runner_id<>$2
      UNION SELECT runner_id FROM attempts a WHERE task_id=$1 AND runner_id<>$2
        AND (queue_digest IS NULL OR EXISTS (SELECT 1 FROM outbox o WHERE o.attempt_id=a.id AND o.kind='start'))`, [taskId, runnerId])).rowCount) throw new CommandError('unmet_precondition', 'Task workspace belongs to another Runner; transfer is unsupported');
  }

  private async dependenciesReady(tx: Transaction, planId: string, nodeId: string): Promise<boolean> {
    const missing = await tx.query(`SELECT dependency FROM plan_nodes pn,
      jsonb_array_elements_text(pn.definition->'dependencies') dependency
      WHERE pn.plan_id=$1 AND pn.node_id=$2 AND NOT EXISTS (
        SELECT 1 FROM nodes n JOIN node_completions c ON c.node_id=n.id AND c.activation=n.activation
        JOIN plan_nodes member ON member.plan_id=pn.plan_id AND member.node_id=n.id
        WHERE n.id=dependency AND n.state='COMPLETED')`, [planId, nodeId]);
    return !missing.rowCount;
  }

  async promoteNext(runnerId: string, connectionInstance: string, incarnation: number): Promise<Dispatch | null> {
    const result = await transaction(this.db, async (tx) => {
      const runner = (await tx.query<{ capacity: number; available: boolean }>("SELECT capacity,(connected AND ready AND connection_instance=$2 AND incarnation=$3 AND last_seen>now()-interval '15 seconds') AS available FROM runners WHERE id=$1 FOR UPDATE", [runnerId, connectionInstance, incarnation])).rows[0];
      if (!runner?.available) return null;
      const count = (await tx.query<{ count: string }>('SELECT count(*) FROM attempts WHERE runner_id=$1 AND NOT process_released', [runnerId])).rows[0]!;
      if (Number(count.count) >= runner.capacity) return null;
      // Filter unresolved owners before LIMIT. Hold at most one Task lock in this
      // transaction, avoiding cross-Runner lock inversion while skipping waiters.
      // Stage A serializes Node writers for a Task until parallel worktrees exist.
      const candidates = (await tx.query<Queued>(`SELECT q.* FROM attempts q WHERE q.runner_id=$1 AND q.state='QUEUED'
        AND NOT EXISTS (SELECT 1 FROM attempts a WHERE a.id<>q.id
          AND (a.owner_key=q.owner_key OR (a.task_id=q.task_id AND a.kind='node' AND q.kind='node'))
          AND (NOT a.process_released OR EXISTS (SELECT 1 FROM operations o WHERE o.attempt_id=a.id AND o.state<>'succeeded')))
        ORDER BY q.created_at,q.id LIMIT 1`, [runnerId])).rows;
      for (const candidate of candidates) {
        const task = (await tx.query<{ state: string; control_version: string; specification_id: string; plan_id: string | null }>('SELECT state,control_version,specification_id,plan_id FROM tasks WHERE id=$1 FOR UPDATE', [candidate.task_id])).rows[0]!;
        const row = (await tx.query<Queued>('SELECT * FROM attempts WHERE id=$1 FOR UPDATE', [candidate.id])).rows[0]!;
        if (row.state !== 'QUEUED') continue;
        let current = task.state === 'RUNNING' && Number(task.control_version) === row.launch.control_version && task.specification_id === row.specification_id && task.plan_id === row.plan_id;
        if (current && row.node_id) {
          try { current = (await assertCurrentNode(tx, { task_id: row.task_id, node_id: row.node_id, node_activation: row.launch.node_activation })).state === 'PENDING' && await this.dependenciesReady(tx, row.plan_id!, row.node_id); }
          catch (error) { if (!(error instanceof CommandError)) throw error; current = false; }
        }
        if (!current) { await tx.query("UPDATE attempts SET state='CANCELLED',end_reason='stale_queue_basis' WHERE id=$1", [row.id]); continue; }
        const owner = await tx.query(`SELECT a.id FROM attempts a WHERE a.owner_key=$1 AND a.id<>$2 AND
          (NOT a.process_released OR EXISTS (SELECT 1 FROM operations o WHERE o.attempt_id=a.id AND o.state<>'succeeded'))`, [row.owner_key, row.id]);
        if (owner.rowCount) continue;
        try { await this.checkLocality(tx, row.task_id, runnerId); }
        catch (error) {
          if (!(error instanceof CommandError)) throw error;
          await tx.query("UPDATE attempts SET state='CANCELLED',end_reason='unsupported_runner_transfer' WHERE id=$1", [row.id]);
          continue;
        }
        await tx.query('INSERT INTO task_runner_locality(task_id,runner_id) VALUES($1,$2) ON CONFLICT DO NOTHING', [row.task_id, runnerId]);
        const fence = (await tx.query<{ generation: string }>("SELECT COALESCE(max(fencing_generation),0)+1 AS generation FROM attempts WHERE owner_key=$1 AND state<>'QUEUED'", [row.owner_key])).rows[0]!;
        const launch = { ...row.launch, fencing_generation: Number(fence.generation), mutation_allowed: true, process_released: false };
        validate('Dispatch', launch);
        await tx.query("UPDATE attempts SET state='RUNNING',mutation_allowed=true,process_released=false,fencing_generation=$2,launch=$3 WHERE id=$1", [row.id, launch.fencing_generation, launch]);
        if (row.node_id) await tx.query("UPDATE nodes SET state='RUNNING' WHERE id=$1", [row.node_id]);
        await tx.query("INSERT INTO outbox(id,runner_id,attempt_id,kind) VALUES($1,$2,$3,'start')", [randomUUID(), runnerId, row.id]);
        this.hooks.beforeCommit?.();
        return launch;
      }
      return null;
    });
    this.hooks.afterCommit?.();
    return result;
  }
}
