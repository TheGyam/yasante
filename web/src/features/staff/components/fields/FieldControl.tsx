import { Input } from '@/shared/ui/Input';
import type { Field } from '../../types';
import { ArrayChoices } from '../ArrayChoices';
import { RelationPicker } from '../RelationPicker';
import { CheckboxField } from './CheckboxField';
import { DateTimeField } from './DateTimeField';
import { FileField } from './FileField';
import { ReadOnlyField } from './ReadOnlyField';
import { SelectField } from './SelectField';
import { TextareaField } from './TextareaField';
const valueText = (value: Field['value']) =>
  Array.isArray(value) ? value.join(', ') : String(value ?? '');
export function FieldControl({
  field,
  source = '',
  disabled = false,
}: {
  field: Field;
  source?: string;
  disabled?: boolean;
}) {
  const error = field.errors?.join(' ');
  const common = {
    name: field.name,
    label: field.label,
    hint: field.help,
    error,
    disabled: disabled || field.disabled,
    required: field.required,
  };
  if (field.kind === 'hidden')
    return <input type="hidden" name={field.name} value={valueText(field.value)} />;
  if (field.kind === 'readonly') return <ReadOnlyField field={field} common={common} />;
  if (field.kind === 'relation')
    return <RelationPicker field={field} source={source} disabled={!!common.disabled} />;
  if (field.kind === 'array') return <ArrayChoices field={field} disabled={!!common.disabled} />;
  if (field.kind === 'checkbox') return <CheckboxField field={field} common={common} />;
  if (field.kind === 'datetime') return <DateTimeField field={field} common={common} />;
  if (field.kind === 'file') return <FileField field={field} common={common} />;
  if (field.kind === 'textarea') return <TextareaField field={field} common={common} />;
  if (field.kind === 'select') return <SelectField field={field} common={common} />;
  return (
    <Input
      {...common}
      type={field.kind}
      defaultValue={field.kind === 'password' ? '' : valueText(field.value)}
      min={field.min}
      max={field.max}
      step={field.step}
      maxLength={field.maxLength}
      autoComplete={
        field.kind === 'password'
          ? field.name === 'old_password'
            ? 'current-password'
            : 'new-password'
          : undefined
      }
    />
  );
}
