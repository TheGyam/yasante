import type { LucideIcon } from 'lucide-react';
import { Link } from './Link';
import { withMarks } from './Text';
import * as styles from './Chip.css';

export interface ChipProps {
  label: string;
  selected?: boolean;
  icon?: LucideIcon;
  /** A filter that changes the address: a link, so it can be shared and opened in a tab. */
  to?: string;
  onClick?: () => void;
}

/** A filter or a choice. With nothing to do, a plain label. */
export function Chip({ label, selected = false, icon: Icon, to, onClick }: ChipProps) {
  const classes = `${styles.chip} ${selected ? styles.selected : ''}`;
  const inner = (
    <>
      {Icon && <Icon size={15} strokeWidth={2.2} aria-hidden />}
      {withMarks(label)}
    </>
  );
  if (to !== undefined) {
    return (
      <Link to={to} className={classes} aria-current={selected ? 'page' : undefined} replace>
        {inner}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" className={classes} aria-pressed={selected} onClick={onClick}>
        {inner}
      </button>
    );
  }
  return <span className={`${classes} ${styles.inert}`}>{inner}</span>;
}
