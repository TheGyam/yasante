import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Pill } from '@/shared/ui/Pill';
import type { Field } from '../../types';
import * as s from './FieldValue.css';

/** A field's value as text a person reads, using the labels the form offers. */
function display(field: Field): string {
  const label = (value: string) =>
    field.options?.find(option => option.value === value)?.label ?? value;
  const value = field.value;
  if (Array.isArray(value)) {
    if (field.kind === 'datetime') return value.filter(Boolean).join(' at ');
    return value.map(item => label(String(item))).join(', ');
  }
  if (field.kind === 'select' || field.kind === 'relation')
    return value === '' ? '' : label(String(value));
  return String(value ?? '');
}

const COPYABLE = ['email', 'url'];

/**
 * A record read before it's edited: quiet text, never an input you might type into by
 * accident. IDs, emails and links get a copy button.
 */
export function FieldValue({ field }: { field: Field }) {
  const [copied, setCopied] = useState(false);
  if (field.kind === 'hidden' || field.kind === 'password') return null;
  const text = display(field);
  const copyable = !!text && (COPYABLE.includes(field.kind) || / ID$/.test(field.label));
  return (
    <div className={s.field} data-wide={field.kind === 'textarea' || text.length > 80}>
      <span className={s.label}>{field.label}</span>
      <span className={s.value}>
        {field.kind === 'checkbox' ? (
          <Pill tone={field.value ? 'success' : 'neutral'}>{field.value ? 'Yes' : 'No'}</Pill>
        ) : text ? (
          field.kind === 'url' ? (
            <a href={text} target="_blank" rel="noopener noreferrer" className={s.link}>
              {text}
            </a>
          ) : (
            text
          )
        ) : (
          <span className={s.empty}>—</span>
        )}
        {copyable && (
          <button
            type="button"
            className={s.copy}
            aria-label={`Copy ${field.label}`}
            onClick={() =>
              void navigator.clipboard.writeText(text).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              })
            }
          >
            {copied ? <Check size={12} aria-hidden /> : <Copy size={12} aria-hidden />}
          </button>
        )}
      </span>
      {field.help && field.kind === 'readonly' && <span className={s.help}>{field.help}</span>}
    </div>
  );
}
