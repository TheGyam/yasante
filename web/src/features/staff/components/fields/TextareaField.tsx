import { TextArea } from '@/shared/ui/Input';
import type { FieldCommon } from '../../types';
import * as s from './TextareaField.css';

import type { Field } from '../../types';
const valueText = (value: Field['value']) =>
  Array.isArray(value) ? value.join(', ') : String(value ?? '');
export function TextareaField({ field, common }: { field: Field; common: FieldCommon }) {
  return (
    <div className={s.fullField}>
      <TextArea
        {...common}
        defaultValue={valueText(field.value)}
        maxLength={field.maxLength}
        rows={5}
      />
    </div>
  );
}
