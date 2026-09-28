import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ConfigurationCommand, ConfigurationResult } from '../../../../packages/protocol/generated/types.ts';
import { APIError, recover, submit, UncertainError } from './api.ts';

export function useCommand(onUnauthorized: () => void) {
  const client = useQueryClient();
  const executing = useRef(false);
  const [pending, setPending] = useState<ConfigurationCommand>();
  const [busy, setBusy] = useState(false);
  const [committed, setCommitted] = useState<ConfigurationResult>();
  const [notice, setNotice] = useState<{ kind: 'success' | 'error' | 'uncertain'; text: string }>();
  async function execute(command: ConfigurationCommand, retry = false): Promise<ConfigurationResult | undefined> {
    if (executing.current || (pending && !retry)) return;
    executing.current = true;
    setBusy(true); setPending(command); setNotice(undefined);
    let result: ConfigurationResult;
    try { result = retry ? await recover(command) : await submit(command); }
    catch (error) {
      if (error instanceof UncertainError || (retry && error instanceof APIError && error.code === 'unavailable')) setNotice({ kind: 'uncertain', text: 'Save result is not yet confirmed. Keep this tab open and check the result; your original request is retained.' });
      else {
        setPending(undefined);
        if (error instanceof APIError && error.code === 'unauthorized') onUnauthorized();
        if (error instanceof APIError && error.code === 'version_conflict') await client.invalidateQueries({ queryKey: ['configuration'] });
        setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Save failed. Your draft has been kept.' });
      }
      setBusy(false); executing.current = false; return;
    }
    setPending(undefined);
    await client.invalidateQueries({ queryKey: ['configuration'] });
    setCommitted(result);
    setNotice({ kind: 'success', text: 'Changes saved.' }); setBusy(false); executing.current = false;
    return result;
  }
  return { busy, pending, committed, notice, execute, recover: () => pending ? execute(pending, true) : Promise.resolve(undefined), dismiss: () => setNotice(undefined) };
}
