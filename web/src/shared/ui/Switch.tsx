import type { InputHTMLAttributes } from 'react';
import * as s from './Switch.css';
export function Switch({
  label,
  hint,
  ...props
}: { label: string; hint?: string } & Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  return (
    <label className={s.row}>
      <span>
        <span>{label}</span>
        {hint && <small className={s.hint}>{hint}</small>}
      </span>
      <input {...props} type="checkbox" role="switch" className={s.control} />
    </label>
  );
}
