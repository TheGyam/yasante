import { useState } from 'react';
import { Eye, Lock } from 'lucide-react';
import { toast } from '@/shared/ui/Toast';
import { readStaff } from '../../api';
import { staffMessage } from '../../hooks';
import type { Field } from '../../types';
import { FieldControl } from './FieldControl';
import { FieldValue } from './FieldValue';
import * as s from './MaskedField.css';

/**
 * A home address, postcode, phone number or hair detail: hidden until someone allowed to see it
 * asks. Asking is written to the staff activity trail. Left hidden, it can't be
 * changed, and saving keeps what's stored.
 */
export function MaskedField({
  field,
  reading,
  source,
  disabled,
}: {
  field: Field;
  reading: boolean;
  source: string;
  disabled: boolean;
}) {
  const [value, setValue] = useState<string>();
  const [busy, setBusy] = useState(false);
  const shown = value !== undefined;
  const plain = { ...field, masked: false, value: value ?? '' };

  // Nothing stored means nothing to hide: an empty field is edited like any other.
  if (shown || (!reading && !field.hasValue)) {
    return reading ? (
      <FieldValue field={plain} />
    ) : (
      <FieldControl field={plain} source={source} disabled={disabled} />
    );
  }

  const reveal = async () => {
    setBusy(true);
    try {
      const result = await readStaff<{ value: string }>(
        field.revealPath!,
        new AbortController().signal
      );
      setValue(result.value);
    } catch (error) {
      toast(staffMessage(error), { tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={s.field}>
      <span className={s.label}>{field.label}</span>
      <span className={s.value}>
        {!field.hasValue ? (
          <span className={s.empty}>—</span>
        ) : (
          <>
            <span className={s.dots} aria-label="Hidden">
              ••••••••
            </span>
            {field.canReveal ? (
              <button
                type="button"
                className={s.show}
                onClick={() => void reveal()}
                disabled={busy}
              >
                <Eye size={14} aria-hidden />
                {reading ? 'Show' : 'Show to edit'}
              </button>
            ) : (
              <span className={s.locked}>
                <Lock size={12} aria-hidden /> Hidden for your role
              </span>
            )}
          </>
        )}
      </span>
      {field.hasValue && field.canReveal && (
        <span className={s.help}>Showing it is recorded in staff activity.</span>
      )}
    </div>
  );
}
