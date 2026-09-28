import { afterEach, expect, it, vi } from 'vitest';
import { APIError, recover, request, submit, UncertainError } from './api.ts';
import type { ConfigurationCommand } from '../../../../packages/protocol/generated/types.ts';

afterEach(() => vi.unstubAllGlobals());
const command: ConfigurationCommand = { schema_version: 1, request_id: 'original-request', expected_control_version: 4, name: 'save_role', payload: { id: 'role', name: 'Test', description: '', instructions: '', archived: false } };
it('rejects malformed read responses at the browser boundary', async () => {
  vi.stubGlobal('fetch', async () => Response.json({ schema_version: 1, authenticated: 'yes' }));
  await expect(request('/v1/owner/session', 'OwnerSessionStatus')).rejects.toBeInstanceOf(APIError);
});
it('preserves a definitive stale-version error and treats interrupted writes as uncertain', async () => {
  vi.stubGlobal('fetch', async () => Response.json({ schema_version: 1, status: 'error', error: { code: 'version_conflict', message: 'Review newer settings' } }, { status: 409 }));
  await expect(submit(command)).rejects.toMatchObject({ code: 'version_conflict' });
  vi.stubGlobal('fetch', async () => { throw new Error('offline'); }); await expect(submit(command)).rejects.toBeInstanceOf(UncertainError);
});
it('queries receipt first and replays the exact original command only if unknown', async () => {
  const calls: { path: string; body?: string }[] = [];
  vi.stubGlobal('fetch', async (path: string, init: RequestInit) => { calls.push({ path, body: init.body?.toString() }); return Response.json(init.body ? { schema_version: 1, request_id: command.request_id, status: 'committed', control_version: 5, entity_id: 'role' } : { schema_version: 1, request_id: command.request_id, status: 'unknown' }); });
  expect((await recover(command)).status).toBe('committed'); expect(calls[0]?.path).toContain(command.request_id); expect(calls[1]?.body).toBe(JSON.stringify(command));
});
it('retains uncertainty when receipt lookup is malformed or unavailable, without replay', async () => {
  const fetch = vi.fn(async () => Response.json({ request_id: command.request_id }));
  vi.stubGlobal('fetch', fetch);
  await expect(recover(command)).rejects.toBeInstanceOf(UncertainError);
  expect(fetch).toHaveBeenCalledTimes(1);
  fetch.mockRejectedValueOnce(new Error('offline'));
  await expect(recover(command)).rejects.toBeInstanceOf(UncertainError);
  expect(fetch).toHaveBeenCalledTimes(2);
});
