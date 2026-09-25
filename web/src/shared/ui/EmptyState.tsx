import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Text } from './Text';
import styles from './EmptyState.module.css';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  body?: string;
  action?: ReactNode;
  /** Headline level, so the page keeps one h1. */
  as?: 'h1' | 'h2';
}

/** Nothing here yet, a page that isn't there, or one that didn't load — said plainly. */
export function EmptyState({ icon: Icon, title, body, action, as = 'h2' }: EmptyStateProps) {
  return (
    <div className={styles.empty}>
      {Icon && (
        <span className={styles.icon}>
          <Icon size={26} strokeWidth={2} aria-hidden />
        </span>
      )}
      <Text variant="title3" as={as}>
        {title}
      </Text>
      {body && (
        <Text variant="subhead" tone="secondary" as="p" className={styles.body}>
          {body}
        </Text>
      )}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
