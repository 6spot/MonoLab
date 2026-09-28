import type { Transaction } from '../../../packages/db/src/index.ts';
import { CommandError } from '../../../packages/domain/src/commands.ts';

// Acquire before Runner/Task locks in consumers. Writers hold this exclusively
// while checking references, so a new Plan/workspace cannot race a removal.
export async function lockConfiguration(tx: Transaction, write = false): Promise<number> {
  const row = (await tx.query<{ version: string }>(`SELECT version FROM configuration_control FOR ${write ? 'UPDATE' : 'SHARE'}`)).rows[0]!;
  return Number(row.version);
}

export async function assertActiveProject(tx: Transaction, projectId: string): Promise<void> {
  if (!(await tx.query('SELECT id FROM projects WHERE id=$1 AND NOT archived', [projectId])).rowCount) throw new CommandError('unmet_precondition', 'An active Project is required');
}

export async function assertProjectRoles(tx: Transaction, projectId: string, roleIds: string[]): Promise<void> {
  const selected = (await tx.query<{ role_id: string }>('SELECT role_id FROM project_roles WHERE project_id=$1', [projectId])).rows;
  if (roleIds.some((id) => !selected.some((row) => row.role_id === id))) throw new CommandError('unmet_precondition', 'Plan Role is not selected for this Project');
}
