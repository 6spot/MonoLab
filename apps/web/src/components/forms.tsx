import { useId } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { Button } from './ui/button.tsx';
import type { ConfigurationCommand, ConfigurationResult } from '../../../../packages/protocol/generated/types.ts';

export type Save = (name: ConfigurationCommand['name'], payload: ConfigurationCommand['payload'], basis: number) => Promise<ConfigurationResult | undefined>;
export interface Draft<T> { value: T; basis: number }
export function Field({ label, hint, multiline = false, onChange, ...props }: { label: string; hint?: string; multiline?: boolean; value: string; onChange: (value: string) => void; rows?: number; type?: string; min?: number; max?: number; step?: number; required?: boolean; minLength?: number; maxLength?: number; disabled?: boolean; readOnly?: boolean; placeholder?: string; autoComplete?: string }) {
  const id = useId();
  return <div className="field"><label htmlFor={id}>{label}</label>{multiline ? <textarea id={id} aria-describedby={hint ? `${id}-hint` : undefined} {...props} onChange={(event) => onChange(event.target.value)} /> : <input id={id} aria-describedby={hint ? `${id}-hint` : undefined} {...props} onChange={(event) => onChange(event.target.value)} />}{hint && <p id={`${id}-hint`} className="hint">{hint}</p>}</div>;
}
export function Select({ label, children, ...props }: ComponentProps<'select'> & { label: string; children: ReactNode }) {
  const id = useId(); return <div className="field"><label htmlFor={id}>{label}</label><select id={id} {...props}>{children}</select></div>;
}
export function PageHeading({ eyebrow = 'WORKSPACE SETTINGS', title, description, action }: { eyebrow?: string; title: string; description: string; action?: ReactNode }) {
  return <header className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="lede">{description}</p></div>{action}</header>;
}
export function EditorActions({ dirty, disabled, reload }: { dirty: boolean; disabled: boolean; reload: () => void }) {
  return <div className="editor-actions"><span className="hint">{dirty ? 'Unsaved changes' : 'Saved configuration'}</span><div><Button type="button" variant="outline" disabled={disabled} onClick={reload}>Reload saved version</Button><Button type="submit" disabled={disabled}>Save changes</Button></div></div>;
}
