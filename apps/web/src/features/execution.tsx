import { useEffect, useState } from 'react';
import type { ConfigurationResult, ConfigurationSnapshot, InfrastructureSnapshot, PolicyConfiguration } from '../../../../packages/protocol/generated/types.ts';
import { Button } from '../components/ui/button.tsx';
import { EditorActions, PageHeading } from '../components/forms.tsx';
import type { Draft, Save } from '../components/forms.tsx';
import { emptyPolicy, PolicyEditor } from './policy-editor.tsx';

export function Execution({ snapshot, infrastructure, infrastructureError, refresh, save, disabled, committed }: { snapshot: ConfigurationSnapshot; infrastructure?: InfrastructureSnapshot; infrastructureError?: Error | null; refresh: () => void; save: Save; disabled: boolean; committed?: ConfigurationResult }) {
  const [local, setLocal] = useState<Draft<PolicyConfiguration>>();
  useEffect(() => { if (committed?.entity_id === 'save_policies') setLocal(undefined); }, [committed]);
  const draft = local ?? { value: snapshot.policies, basis: snapshot.control_version };
  function update(value: PolicyConfiguration) { setLocal({ value, basis: draft.basis }); }
  return <><PageHeading title="Execution" description="Choose how future work runs and inspect your connected Runners." />
    <section className="card runner-section"><div className="section-label"><h2>Runners & installed tools</h2><Button variant="outline" onClick={refresh}>Refresh status</Button></div>
      {infrastructureError && <p role="alert">{infrastructureError.message}</p>}
      {!infrastructure && !infrastructureError && <p>Loading Runner status…</p>}
      {infrastructure?.runners.length === 0 && <p className="inline-note">No Runner enrolled yet. Complete the host setup to connect an execution machine.</p>}
      {infrastructure?.runners.map((runner) => <article className="runner" key={runner.runner_id}><div className="section-label"><strong>{runner.runner_id}</strong><span className={runner.online ? 'tag positive' : 'tag'}>{runner.online ? 'Online' : 'Offline'}</span></div><p className="hint">{runner.capacity} execution slots</p>{!runner.runtimes.length && <p>No installation report received.</p>}{runner.runtimes.map(({ installation, observed_at, current }) => <div className="runtime-row" key={installation.runtime_id}><div><strong>{installation.runtime_id}</strong><span>{installation.version ?? 'Version unavailable'}</span></div><div><span className="tag">{installation.availability === 'detected' ? 'Installation detected' : installation.availability === 'not_found' ? 'Not found' : 'Unavailable'}</span><small>{current ? 'Observed' : 'Previous connection'} · {new Date(observed_at).toLocaleString()}</small></div></div>)}</article>)}
      <p className="hint">Installation checks do not verify CLI login or model access. Install and sign in to coding tools on the Runner yourself.</p>
    </section>
    <form className="card editor" onSubmit={async (event) => { event.preventDefault(); if (await save('save_policies', draft.value, draft.basis)) setLocal(undefined); }}><fieldset disabled={disabled}><h2>Execution policies</h2><p className="hint">A one-off choice takes priority, then the Role or Planner policy, then the global default. Changes apply to future executions.</p>
      {(['global', 'planner'] as const).map((scope) => <section className="subsection" key={scope}><label className="checkbox"><input type="checkbox" checked={!!draft.value[scope]} onChange={(event) => { const value = { ...draft.value }; if (event.target.checked) value[scope] = emptyPolicy(); else delete value[scope]; update(value); }} />{scope === 'global' ? 'Set a global default policy' : 'Set a Planner policy'}</label>{draft.value[scope] && <PolicyEditor value={draft.value[scope]} infrastructure={infrastructure} onChange={(value) => update({ ...draft.value, [scope]: value })} />}</section>)}
      <EditorActions dirty={!!local} disabled={disabled} reload={() => setLocal(undefined)} />
    </fieldset></form>
  </>;
}
