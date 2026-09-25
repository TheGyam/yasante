import { useId, type InputHTMLAttributes, type SelectHTMLAttributes } from 'react';
import styles from './Input.module.css';

interface FieldProps {
  label: string;
  hint?: string;
}

export function Input({
  label,
  hint,
  ...rest
}: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <input
        id={id}
        className={styles.control}
        aria-describedby={hint ? `${id}-hint` : undefined}
        {...rest}
      />
      {hint && (
        <span id={`${id}-hint`} className={styles.hint}>
          {hint}
        </span>
      )}
    </div>
  );
}

export function Select({
  label,
  hint,
  children,
  ...rest
}: FieldProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <select id={id} className={styles.control} {...rest}>
        {children}
      </select>
      {hint && <span className={styles.hint}>{hint}</span>}
    </div>
  );
}
