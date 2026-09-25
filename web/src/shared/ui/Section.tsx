import type { ReactNode } from 'react';
import { Glass } from './Glass';
import { Text } from './Text';
import styles from './Section.module.css';

export interface SectionProps {
  title?: string;
  footer?: string;
  children: ReactNode;
}

/** A group of rows on one glass card, as the app's grouped lists. */
export function Section({ title, footer, children }: SectionProps) {
  return (
    <section className={styles.section}>
      {title && (
        <Text variant="overline" tone="tertiary" as="h2" className={styles.title}>
          {title}
        </Text>
      )}
      <Glass radius="lg" className={styles.rows}>
        {children}
      </Glass>
      {footer && (
        <Text variant="footnote" tone="tertiary" as="p" className={styles.footer}>
          {footer}
        </Text>
      )}
    </section>
  );
}
