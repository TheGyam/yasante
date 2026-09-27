import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import * as styles from './Input.css';

interface FieldProps {
  label: string;
  hint?: string;
  /** What's wrong with it, in words. Replaces the hint while it's shown. */
  error?: string;
}

/** The label, the control, and the hint or error under it, wired for screen readers. */
function Field({
  id,
  label,
  hint,
  error,
  children,
}: FieldProps & { id: string; children: ReactNode }) {
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {children}
      {error ? (
        <span id={`${id}-note`} className={styles.error} role="alert">
          {error}
        </span>
      ) : (
        hint && (
          <span id={`${id}-note`} className={styles.hint}>
            {hint}
          </span>
        )
      )}
    </div>
  );
}

const described = (id: string, { hint, error }: FieldProps) =>
  hint || error ? { 'aria-describedby': `${id}-note` } : {};

export const Input = forwardRef<
  HTMLInputElement,
  FieldProps & InputHTMLAttributes<HTMLInputElement>
>(function Input({ label, hint, error, ...rest }, ref) {
  const id = useId();
  return (
    <Field id={id} label={label} hint={hint} error={error}>
      <input
        ref={ref}
        id={id}
        className={`${styles.control} ${error ? styles.invalid : ''}`}
        aria-invalid={error ? true : undefined}
        {...described(id, { label, hint, error })}
        {...rest}
      />
    </Field>
  );
});

export function TextArea({
  label,
  hint,
  error,
  ...rest
}: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <Field id={id} label={label} hint={hint} error={error}>
      <textarea
        id={id}
        className={`${styles.control} ${styles.textarea} ${error ? styles.invalid : ''}`}
        aria-invalid={error ? true : undefined}
        {...described(id, { label, hint, error })}
        {...rest}
      />
    </Field>
  );
}

export function Select({
  label,
  hint,
  error,
  children,
  ...rest
}: FieldProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <Field id={id} label={label} hint={hint} error={error}>
      <select
        id={id}
        className={styles.select}
        {...described(id, { label, hint, error })}
        {...rest}
      >
        {children}
      </select>
    </Field>
  );
}
