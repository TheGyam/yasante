import { Checkbox } from '@/shared/ui/Checkbox';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { Text } from '@/shared/ui/Text';
import { useState } from 'react';
import type { Field } from '../types';
import * as s from './ArrayChoices.css';
export function ArrayChoices({ field, disabled }: { field: Field; disabled: boolean }) {
  const [selected, setSelected] = useState(Array.isArray(field.value) ? field.value : []);
  return (
    <fieldset className={s.field}>
      <legend>{field.label}</legend>
      <input type="hidden" name={field.name} value={selected.join(field.delimiter ?? ',')} />
      {field.options?.map(option => (
        <div className={s.row} key={option.value}>
          <Checkbox
            checked={selected.includes(option.value)}
            disabled={disabled}
            onChange={checked =>
              setSelected(
                checked
                  ? [...selected, option.value]
                  : selected.filter(value => value !== option.value)
              )
            }
            children={option.label}
          />
        </div>
      ))}
      {field.help && (
        <Text variant="caption" tone="secondary">
          {field.help}
        </Text>
      )}
      {!!field.errors.length && <InlineAlert message={field.errors.join(' ')} />}
    </fieldset>
  );
}
