import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Link } from './Link';
import { Text } from './Text';
import styles from './ListRow.module.css';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  /** On the right: a price, a count. */
  value?: string;
  icon?: LucideIcon;
  iconTone?: 'accent' | 'neutral' | 'success';
  /** Something to the left instead of an icon, such as an avatar. */
  leading?: ReactNode;
  to?: string;
  preload?: () => void;
}

export function ListRow({
  title,
  subtitle,
  value,
  icon: Icon,
  iconTone = 'accent',
  leading,
  to,
  preload,
}: ListRowProps) {
  const inner = (
    <>
      {leading ??
        (Icon && (
          <span className={`${styles.icon} ${styles[iconTone]}`}>
            <Icon size={17} strokeWidth={2.1} aria-hidden />
          </span>
        ))}
      <span className={styles.text}>
        <Text variant="callout">{title}</Text>
        {subtitle && (
          <Text variant="footnote" tone="secondary">
            {subtitle}
          </Text>
        )}
      </span>
      {value && (
        <Text variant="bodyStrong" className={styles.value} tabular>
          {value}
        </Text>
      )}
    </>
  );
  return to ? (
    <Link to={to} preload={preload} className={styles.row}>
      {inner}
    </Link>
  ) : (
    <div className={styles.row}>{inner}</div>
  );
}
