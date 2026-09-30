import { Text } from '@/shared/ui/Text';
import type { Field, Section } from '../types';
import { FieldControl } from './fields/FieldControl';
import * as s from './FormSection.css';
export function FormSection({
  sections,
  source,
  disabled,
}: {
  sections: Section[];
  source: (field: Field) => string;
  disabled: boolean;
}) {
  return (
    <>
      {sections.map((section, index) => (
        <section key={index} className={section.name ? s.card : undefined}>
          {section.name && <Text variant="title3">{section.name}</Text>}
          {section.description && (
            <Text variant="subhead" tone="secondary">
              {section.description}
            </Text>
          )}
          <div className={section.name ? s.fields : undefined}>
            {section.fields.map(field => (
              <FieldControl
                key={field.name}
                field={field}
                source={source(field)}
                disabled={disabled}
              />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
