import { InlineAlert } from '@/shared/ui/InlineAlert';
import { Switch } from '@/shared/ui/Switch';
import type { Field, FieldCommon } from '../../types';
import * as s from './CheckboxField.css';

/** On or off, as a switch on its own row with its explanation beside it. */
export function CheckboxField({ field, common }: { field: Field; common: FieldCommon }) {
  const error = field.errors.join(' ');
  return (
    <div className={s.field}>
      <Switch
        label={field.label}
        hint={field.help}
        name={field.name}
        defaultChecked={!!field.value}
        disabled={common.disabled}
      />
      {error && <InlineAlert message={error} />}
    </div>
  );
}
