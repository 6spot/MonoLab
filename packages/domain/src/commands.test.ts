import { expect, it } from 'vitest';
import { guardNewCommand } from './commands.ts';
import type { AdmissionBasis } from './commands.ts';
import type { CommandEnvelope } from '../../protocol/src/index.ts';

const basis: AdmissionBasis = { kind: 'node', taskId: 'task', resourceId: 'repo', mutationAllowed: true, processReleased: false, controlVersion: 1, sourceWatermark: 1, connectionAvailable: true };
const command: CommandEnvelope = { schema_version: 1, request_id: 'request', scope_id: 'task', expected_control_version: 1, name: 'open_workspace', payload: { resource_id: 'repo' } };
it('separates Planner repository reads from Node workspace writes', () => {
  expect(() => guardNewCommand(command, { ...basis, kind: 'planner' })).toThrow('not allowed');
  expect(() => guardNewCommand({ ...command, name: 'inspect_repository' }, { ...basis, kind: 'planner' })).not.toThrow();
});
it('rejects revoked, offline, wrong-resource and stale-basis mutations', () => {
  expect(() => guardNewCommand(command, { ...basis, mutationAllowed: false })).toThrow('ended');
  expect(() => guardNewCommand(command, { ...basis, connectionAvailable: false })).toThrow('unavailable');
  expect(() => guardNewCommand(command, { ...basis, resourceId: 'other' })).toThrow('outside');
  expect(() => guardNewCommand(command, { ...basis, controlVersion: 2 })).toThrow('stale');
});
