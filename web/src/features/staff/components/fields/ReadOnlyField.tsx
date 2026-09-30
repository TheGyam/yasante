import { Text } from '@/shared/ui/Text';
import type { FieldCommon } from '../../types';
import * as s from './ReadOnlyField.css';

import type { Field } from '../../types';
const valueText = (value: Field['value']) =>
  Array.isArray(value) ? value.join(', ') : String(value ?? '');
export function ReadOnlyField({ field }: { field: Field; common: FieldCommon }) {
  return (
    <div className={s.field}>
      <Text variant="callout" tone="secondary">
        {field.label}
      </Text>
      <Text variant="subhead">{valueText(field.value) || '—'}</Text>
      {field.help && (
        <Text variant="caption" tone="secondary">
          {field.help}
        </Text>
      )}
    </div>
  );
}
