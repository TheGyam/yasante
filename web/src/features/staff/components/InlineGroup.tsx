import { Button } from '@/shared/ui/Button';
import { Checkbox } from '@/shared/ui/Checkbox';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { Text } from '@/shared/ui/Text';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';
import { useLocation } from 'react-router';
import type { Field, FormSchema } from '../types';
import { FormSection } from './FormSection';
import * as s from './InlineGroup.css';
const valueText = (value: import('../types').Field['value']) =>
  Array.isArray(value) ? value.join(', ') : String(value ?? '');
export function InlineGroup({
  inline,
  inlineIndex,
  schema,
  setDraft,
  relationSource,
  busy,
  base,
  id,
  setDirty,
}: {
  inline: FormSchema['inlines'][number];
  inlineIndex: number;
  schema: FormSchema;
  setDraft: Dispatch<SetStateAction<FormSchema | undefined>>;
  relationSource: (field: Field, inline?: string) => string;
  busy: boolean;
  base: string;
  id?: string;
  setDirty: (value?: boolean) => void;
}) {
  const location = useLocation();
  return (
    <section className={s.card} key={inline.prefix}>
      <div className={s.between}>
        <Text variant="title3">{inline.name}</Text>
        <Text variant="caption" tone="secondary">
          {inline.count} existing · Page {inline.page} of {inline.pages}
        </Text>
      </div>
      {inline.management.map(field => (
        <input
          key={field.name}
          type="hidden"
          name={field.name}
          value={field.name.endsWith('-TOTAL_FORMS') ? inline.forms.length : valueText(field.value)}
        />
      ))}
      {inline.errors.map((message, index) => (
        <InlineAlert key={index} message={message} />
      ))}
      {inline.forms.map((row, index) => (
        <div className={s.inlineRow} key={index}>
          <FormSection
            sections={row.sections}
            source={field => relationSource(field, inline.prefix)}
            disabled={!schema.editable || busy}
          />
          {row.errors.map((message, index) => (
            <InlineAlert key={index} message={message} />
          ))}
          {row.canDelete && (
            <Checkbox
              label="Delete this related record when saving"
              name={`${inline.prefix}-${index}-DELETE`}
              disabled={busy}
            />
          )}
        </div>
      ))}
      {inline.canAdd && inline.forms.length < inline.max && (
        <Button
          variant="ghost"
          size="sm"
          type="button"

          disabled={busy}
          onClick={() => {
            const fields = inline.empty.fields
              .filter(field => !field.name.endsWith('-DELETE'))
              .map(field => ({
                ...field,
                name: field.name.replace('__prefix__', String(inline.forms.length)),
              }));
            setDraft({
              ...schema,
              inlines: schema.inlines.map((item, index) =>
                index === inlineIndex
                  ? {
                      ...item,
                      forms: [
                        ...item.forms,
                        {
                          sections: [{ name: 'New related record', description: '', fields }],
                          id: '',
                          errors: [],
                          canDelete: true,
                        },
                      ],
                    }
                  : item
              ),
            });
            setDirty(true);
          }}
          label={
            <>
              <Plus size={16} aria-hidden />
              Add related record
            </>
          }
        />
      )}
      {inline.pages > 1 && (
        <div className={s.row}>
          {[-1, 1].map(delta => {
            const params = new URLSearchParams(location.search);
            params.set(`inline_${inline.prefix}`, String(inline.page + delta));
            return schema.editable ? (
              <Button
                variant="ghost"
                size="sm"
                type="submit"
                key={delta}
                name="inline-page"
                value={params.toString()}

                disabled={busy || inline.page + delta < 1 || inline.page + delta > inline.pages}
                label={
                  <>
                    {delta < 0 ? (
                      <ChevronLeft size={14} aria-hidden />
                    ) : (
                      <ChevronRight size={14} aria-hidden />
                    )}
                    Save and load {delta < 0 ? 'previous' : 'next'}rows
                  </>
                }
              />
            ) : inline.page + delta < 1 || inline.page + delta > inline.pages ? (
              <Button
                key={delta}
                label={delta < 0 ? 'Previous rows' : 'Next rows'}
                disabled
                variant="secondary"
              />
            ) : (
              <Button
                key={delta}
                to={`${base}/${id}?${params}`}
                label={delta < 0 ? 'Previous rows' : 'Next rows'}
                variant="secondary"
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
