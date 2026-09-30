import { Select } from '@/shared/ui/Input';
import type { FieldCommon } from '../../types';

import type { Field } from '../../types';
const valueText = (value: Field['value']) =>
  Array.isArray(value) ? value.join(', ') : String(value ?? '');
export function SelectField({ field, common }: { field: Field; common: FieldCommon }) {
  return (
    <Select
      {...common}
      multiple={field.multiple}
      size={field.multiple ? 5 : undefined}
      defaultValue={
        field.multiple ? (Array.isArray(field.value) ? field.value : []) : valueText(field.value)
      }
    >
      {field.options?.map(option => (
        <option key={option.value} value={option.value}>
          {option.label || 'Choose an option'}
        </option>
      ))}
    </Select>
  );
}
