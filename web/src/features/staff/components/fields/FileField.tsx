import { Checkbox } from '@/shared/ui/Checkbox';
import { Input } from '@/shared/ui/Input';
import { Text } from '@/shared/ui/Text';
import type { FieldCommon } from '../../types';
import * as s from './FileField.css';

import type { Field } from '../../types';
const valueText = (value: Field['value']) =>
  Array.isArray(value) ? value.join(', ') : String(value ?? '');
export function FileField({ field, common }: { field: Field; common: FieldCommon }) {
  return (
    <div className={s.field}>
      <Input {...common} type="file" />
      {!!field.value && <Text variant="caption">Current file: {valueText(field.value)}</Text>}
      {field.clearable && !!field.value && (
        <Checkbox
          label="Remove current file"
          name={`${field.name}-clear`}
          disabled={common.disabled}
        />
      )}
    </div>
  );
}
