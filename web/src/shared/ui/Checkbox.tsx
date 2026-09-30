import type { ReactNode } from 'react';
import * as styles from './Checkbox.css';

export interface CheckboxProps {
  checked?: boolean;
  defaultChecked?: boolean;
  name?: string;
  disabled?: boolean;
  'aria-label'?: string;
  label?: string;
  onChange?: (checked: boolean) => void;
  invalid?: boolean;
  /** The label. Links inside it work without ticking the box. */
  children?: ReactNode;
}

export function Checkbox({
  checked,
  defaultChecked,
  name,
  disabled,
  'aria-label': ariaLabel,
  label,
  onChange,
  invalid,
  children,
}: CheckboxProps) {
  return (
    <label className={styles.row}>
      <input
        type="checkbox"
        className={`${styles.box} ${invalid ? styles.invalid : ''}`}
        checked={checked}
        defaultChecked={defaultChecked}
        name={name}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        onChange={event => onChange?.(event.target.checked)}
      />
      <span>{children ?? label}</span>
    </label>
  );
}
