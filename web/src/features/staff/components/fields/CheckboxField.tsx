import { Checkbox } from '@/shared/ui/Checkbox';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { Text } from '@/shared/ui/Text';
import type { FieldCommon } from '../../types';
import * as s from './CheckboxField.css';

import type { Field } from '../../types';
export function CheckboxField({ field, common }: { field: Field; common: FieldCommon }) {
  const error = field.errors.join(' ');
  return (
    <div className={s.field}>
      <Checkbox
        label={field.label}
        name={field.name}
        defaultChecked={!!field.value}
        disabled={common.disabled}
      />
      {field.help && (
        <Text variant="caption" tone="secondary">
          {field.help}
        </Text>
      )}
      {error && <InlineAlert message={error} />}
    </div>
  );
}
