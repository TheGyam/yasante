import { Text } from '@/shared/ui/Text';
import type { Field, Section } from '../types';
import { FieldControl } from './fields/FieldControl';
import { FieldValue } from './fields/FieldValue';
import * as s from './FormSection.css';

/** The admin's fieldsets as cards: read as text, or edited as a form. */
export function FormSection({
  sections,
  source,
  disabled,
  reading = false,
}: {
  sections: Section[];
  source: (field: Field) => string;
  disabled: boolean;
  reading?: boolean;
}) {
  return (
    <>
      {sections.map((section, index) => {
        const visible = section.fields.filter(field => field.kind !== 'hidden');
        return (
          <section key={index} className={section.name ? s.card : undefined}>
            {section.name && visible.length > 0 && <Text variant="title3">{section.name}</Text>}
            {section.description && (
              <Text variant="subhead" tone="secondary">
                {section.description}
              </Text>
            )}
            <div className={section.name ? s.fields : undefined}>
              {section.fields.map(field =>
                reading ? (
                  field.kind === 'hidden' ? (
                    <FieldControl key={field.name} field={field} />
                  ) : (
                    <FieldValue key={field.name} field={field} />
                  )
                ) : (
                  <FieldControl
                    key={field.name}
                    field={field}
                    source={source(field)}
                    disabled={disabled}
                  />
                )
              )}
            </div>
          </section>
        );
      })}
    </>
  );
}
