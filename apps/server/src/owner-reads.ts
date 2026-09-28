import { transaction } from '../../../packages/db/src/index.ts';
import type { Database, Transaction } from '../../../packages/db/src/index.ts';
import { CommandError } from '../../../packages/domain/src/commands.ts';
import { canonicalJSON, MAX_BODY_BYTES, validate } from '../../../packages/protocol/src/index.ts';
import type { FormalTaskEvent, NodeCounts, TaskEventPage, TaskOverview } from '../../../packages/protocol/src/index.ts';
import { authenticateOwner } from './owner-commands.ts';

interface TaskRow { id: string; control_version: string; state: TaskOverview['state']; specification_id: string; plan_id: string | null; event_sequence: string }

export function taskEventCursor(taskId: string, after: number): string {
  validate('Id', taskId); validate('Counter', after);
  return Buffer.from(canonicalJSON({ version: 1, task_id: taskId, after })).toString('base64url');
}

function readCursor(taskId: string, cursor?: string): number {
  if (cursor === undefined) return 0;
  let value: { version: number; task_id: string; after: number };
  try {
    validate('TaskEventCursor', cursor);
    const bytes = Buffer.from(cursor, 'base64url');
    if (bytes.toString('base64url') !== cursor) throw new Error('Noncanonical base64');
    value = JSON.parse(bytes.toString('utf8'));
    if (!value || Object.keys(value).sort().join(',') !== 'after,task_id,version' || value.version !== 1) throw new Error('Invalid cursor');
    if (taskEventCursor(value.task_id, value.after) !== cursor) throw new Error('Noncanonical cursor');
  } catch { throw new CommandError('invalid_input', 'Invalid Task event cursor'); }
  if (value.task_id !== taskId) throw new CommandError('denied_scope', 'Cursor belongs to another Task');
  return value.after;
}

async function readTask(tx: Transaction, token: string, taskId: string): Promise<TaskRow> {
  validate('Id', taskId); await authenticateOwner(tx, token);
  const task = (await tx.query<TaskRow>('SELECT id,control_version,state,specification_id,plan_id,event_sequence FROM tasks WHERE id=$1 FOR SHARE', [taskId])).rows[0];
  if (!task) throw new CommandError('denied_scope', 'Unknown Task');
  return task;
}

export class OwnerReads {
  readonly db: Database;
  constructor(db: Database) { this.db = db; }

  async overview(token: string, taskId: string): Promise<TaskOverview> {
    return transaction(this.db, async (tx) => {
      const task = await readTask(tx, token, taskId);
      const rows = (await tx.query<{ state: string; count: string }>('SELECT n.state,count(*) FROM nodes n JOIN plan_nodes pn ON pn.node_id=n.id WHERE pn.plan_id=$1 GROUP BY n.state', [task.plan_id])).rows;
      const nodes: NodeCounts = { pending: 0, running: 0, blocked: 0, completed: 0, cancelled: 0 };
      for (const row of rows) nodes[row.state.toLowerCase() as keyof NodeCounts] = Number(row.count);
      const attempts = (await tx.query<{ queued: string; held: string }>("SELECT count(*) FILTER(WHERE state='QUEUED') AS queued,count(*) FILTER(WHERE NOT process_released) AS held FROM attempts WHERE task_id=$1", [taskId])).rows[0]!;
      const operations = (await tx.query<{ count: string }>("SELECT count(*) FROM operations o JOIN attempts a ON a.id=o.attempt_id WHERE a.task_id=$1 AND o.state<>'succeeded'", [taskId])).rows[0]!;
      return validate<TaskOverview>('TaskOverview', {
        schema_version: 1, task_id: taskId, control_version: Number(task.control_version), state: task.state,
        specification_id: task.specification_id, ...(task.plan_id ? { plan_id: task.plan_id } : {}), nodes,
        queued_attempts: Number(attempts.queued), held_attempts: Number(attempts.held), open_operations: Number(operations.count),
        event_cursor: taskEventCursor(taskId, Number(task.event_sequence)),
      });
    });
  }

  async events(token: string, taskId: string, cursor?: string): Promise<TaskEventPage> {
    return transaction(this.db, async (tx) => {
      const task = await readTask(tx, token, taskId);
      const after = readCursor(taskId, cursor); const cutoff = Number(task.event_sequence);
      const reset = (): TaskEventPage => ({ schema_version: 1, task_id: taskId, events: [], cursor: taskEventCursor(taskId, cutoff), has_more: false, reset_required: true });
      if (after > cutoff) return reset();
      const rows = (await tx.query<{ sequence: string; kind: string; attempt_id: string | null; operation_id: string | null; body: Record<string, unknown> }>('SELECT sequence,kind,attempt_id,operation_id,body FROM task_events WHERE task_id=$1 AND sequence>$2 AND sequence<=$3 ORDER BY sequence LIMIT 65', [taskId, after, cutoff])).rows;
      const events: FormalTaskEvent[] = []; let last = after; let bytes = 1024;
      for (const row of rows) {
        if (events.length === 64) break;
        if (Number(row.sequence) !== last + 1) return reset();
        const event = validate<FormalTaskEvent>('FormalTaskEvent', { sequence: Number(row.sequence), kind: row.kind, ...(row.attempt_id ? { attempt_id: row.attempt_id } : {}), ...(row.operation_id ? { operation_id: row.operation_id } : {}), body: row.body });
        const size = Buffer.byteLength(JSON.stringify(event)) + 1;
        if (bytes + size > MAX_BODY_BYTES) {
          if (!events.length) throw new CommandError('unmet_precondition', 'Formal event exceeds page limit; managed content is required');
          break;
        }
        events.push(event); bytes += size; last = event.sequence;
      }
      if (last < cutoff && events.length === rows.length) return reset();
      return validate<TaskEventPage>('TaskEventPage', { schema_version: 1, task_id: taskId, events, cursor: taskEventCursor(taskId, last), has_more: last < cutoff, reset_required: false });
    });
  }
}
