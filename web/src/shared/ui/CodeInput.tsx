import * as styles from './CodeInput.css';

export interface CodeInputProps {
  value: string;
  onChange: (code: string) => void;
  /** Called once all the digits are in. */
  onComplete?: (code: string) => void;
  length?: number;
  invalid?: boolean;
  label: string;
  disabled?: boolean;
}

/**
 * A one-time code. One field rather than a box per digit: pasting, the phone's
 * "from Messages/Mail" suggestion and screen readers all just work.
 */
export function CodeInput({
  value,
  onChange,
  onComplete,
  length = 6,
  invalid,
  label,
  disabled,
}: CodeInputProps) {
  return (
    <input
      className={`${styles.code} ${invalid ? styles.invalid : ''}`}
      aria-label={label}
      aria-invalid={invalid || undefined}
      inputMode="numeric"
      autoComplete="one-time-code"
      placeholder={'·'.repeat(length)}
      maxLength={length}
      value={value}
      disabled={disabled}
      autoFocus
      onChange={event => {
        const digits = event.target.value.replace(/\D/g, '').slice(0, length);
        onChange(digits);
        if (digits.length === length) onComplete?.(digits);
      }}
    />
  );
}
