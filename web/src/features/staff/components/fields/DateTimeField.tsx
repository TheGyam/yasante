import { Input } from '@/shared/ui/Input';
import type { FieldCommon } from '../../types';
import * as s from './DateTimeField.css';

import type { Field } from '../../types';
export function DateTimeField({ field, common }: { field: Field; common: FieldCommon }) {
  const parts = Array.isArray(field.value) ? field.value : ['', ''];
  return (
    <div className={s.field}>
      <Input {...common} type="date" name={`${field.name}_0`} defaultValue={parts[0]} />
      <Input
        {...common}
        label={`${field.label} — time`}
        hint={undefined}
        error={undefined}
        type="time"
        step="1"
        name={`${field.name}_1`}
        defaultValue={parts[1]}
      />
    </div>
  );
}
