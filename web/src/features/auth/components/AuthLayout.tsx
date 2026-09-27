import type { ReactNode } from 'react';
import { Glass } from '@/shared/ui/Glass';
import { Page } from '@/shared/ui/Page';
import { Rise } from '@/shared/ui/Rise';
import { Text } from '@/shared/ui/Text';
import * as styles from './AuthLayout.css';

export interface AuthLayoutProps {
  title: string;
  subtitle?: ReactNode;
  /** Under the card: "Already have an account? Sign in". */
  footer?: ReactNode;
  children: ReactNode;
}

/** The frame for signing up, signing in and confirming an email: one narrow card. */
export function AuthLayout({ title, subtitle, footer, children }: AuthLayoutProps) {
  return (
    <Page title={title}>
      <Rise className={styles.column}>
        <div className={styles.heading}>
          <Text variant="title1">{title}</Text>
          {subtitle && (
            <Text variant="body" tone="secondary">
              {subtitle}
            </Text>
          )}
        </div>
        <Glass padded radius="xl">
          {children}
        </Glass>
        {footer && <div className={styles.footer}>{footer}</div>}
      </Rise>
    </Page>
  );
}
