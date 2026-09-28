import type { ExecutionPolicy, ExecutionTarget, InfrastructureSnapshot } from '../../../../packages/protocol/generated/types.ts';
import { Button } from '../components/ui/button.tsx';
import { Field, Select } from '../components/forms.tsx';

export const emptyPolicy = (): ExecutionPolicy => ({ default_target: { runtime_id: 'opencode' }, fallback_targets: [] });
export function PolicyEditor({ value, onChange, infrastructure }: { value: ExecutionPolicy; onChange: (policy: ExecutionPolicy) => void; infrastructure?: InfrastructureSnapshot }) {
  function targetEditor(target: ExecutionTarget, change: (value: ExecutionTarget) => void, label: string) {
    const runtimes = [...new Set(['opencode', target.runtime_id, ...(infrastructure?.runners.flatMap((runner) => runner.runtimes.map((r) => r.installation.runtime_id)) ?? [])])];
    const support = infrastructure?.runners.flatMap((r) => r.runtimes).find((r) => r.installation.runtime_id === target.runtime_id)?.installation;
    return <div className="target-fields"><h4>{label}</h4><div className="field-grid">
      <Select label={`${label} Runtime`} value={target.runtime_id} onChange={(event) => change({ runtime_id: event.target.value })}>{runtimes.map((id) => <option key={id}>{id}</option>)}</Select>
      <Select label={`${label} Runner`} value={target.runner_id ?? ''} onChange={(event) => { const rest = { ...target }; delete rest.runner_id; change(event.target.value ? { ...rest, runner_id: event.target.value } : rest); }}><option value="">Auto placement</option>{[...new Set([...(target.runner_id ? [target.runner_id] : []), ...(infrastructure?.runners.map((r) => r.runner_id) ?? [])])].map((id) => <option key={id}>{id}</option>)}</Select>
      {(target.runtime_id === 'opencode' || support?.supports_model) && <Field label={`${label} model`} value={target.model_id ?? ''} maxLength={256} placeholder="Use CLI default" hint="You can enter a new model identifier directly." onChange={(model) => { const rest = { ...target }; delete rest.model_id; change(model ? { ...rest, model_id: model } : rest); }} />}
      {support?.supports_thinking && <Field label={`${label} thinking level`} value={target.thinking_level ?? ''} maxLength={64} placeholder="Use CLI default" onChange={(thinking) => { const rest = { ...target }; delete rest.thinking_level; change(thinking ? { ...rest, thinking_level: thinking } : rest); }} />}
    </div></div>;
  }
  return <div className="policy-editor">
    {targetEditor(value.default_target, (target) => onChange({ ...value, default_target: target }), 'Default')}
    {value.fallback_targets.map((target, index) => <div className="fallback" key={index}>{targetEditor(target, (updated) => onChange({ ...value, fallback_targets: value.fallback_targets.map((row, i) => i === index ? updated : row) }), `Fallback ${index + 1}`)}<Button type="button" variant="ghost" onClick={() => onChange({ ...value, fallback_targets: value.fallback_targets.filter((_, i) => i !== index) })}>Remove fallback {index + 1}</Button></div>)}
    <Button type="button" variant="outline" disabled={value.fallback_targets.length >= 16} onClick={() => onChange({ ...value, fallback_targets: [...value.fallback_targets, { runtime_id: 'opencode' }] })}>Add fallback target</Button>
    <Field type="number" min={1} max={604800} step={1} label="Attention after (seconds)" value={value.duration_budget?.toString() ?? ''} placeholder="No threshold" hint="Raises attention only. It never stops work or triggers a fallback." onChange={(text) => { const rest = { ...value }; delete rest.duration_budget; onChange(text ? { ...rest, duration_budget: Number(text) } : rest); }} />
  </div>;
}
