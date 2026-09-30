import { Pill } from '@/shared/ui/Pill';
import { formatAgo, formatDate, formatDateTime, formatNumber } from '../../format';
import type { CellKind } from '../../types';
import * as ui from '../ui.css';

const GOOD = [
  'verified',
  'confirmed',
  'completed',
  'live',
  'published',
  'approved',
  'paid',
  'resolved',
  'active',
];
const WAITING = ['open', 'pending', 'requested', 'flagged', 'proposed'];
const BAD = [
  'rejected',
  'declined',
  'removed',
  'hidden',
  'cancelled',
  'no_show',
  'expired',
  'failed',
  'ignored',
];

export function statusTone(value: string) {
  const key = value.toLowerCase();
  return GOOD.includes(key)
    ? 'success'
    : WAITING.includes(key)
      ? 'warning'
      : BAD.includes(key)
        ? 'danger'
        : 'neutral';
}

/** One table cell, drawn by what it holds: a pill for a status, "3 d ago" for a time. */
export function Cell({
  kind,
  value,
  text,
}: {
  kind: CellKind;
  value: string | number | boolean | null;
  text: string;
}) {
  if (value === null || value === '' || text === '—') return <span className={ui.muted}>—</span>;
  if (kind === 'bool')
    return <Pill tone={value ? 'success' : 'neutral'}>{value ? 'Yes' : 'No'}</Pill>;
  if (kind === 'status') return <Pill tone={statusTone(String(value))}>{text}</Pill>;
  if (kind === 'number' && typeof value === 'number')
    return <span className={ui.tabular}>{formatNumber(value)}</span>;
  if (kind === 'datetime' && typeof value === 'string') {
    const dateOnly = !value.includes('T');
    return (
      <time
        dateTime={value}
        title={dateOnly ? undefined : formatDateTime(value)}
        className={ui.tabular}
      >
        {dateOnly ? formatDate(value) : formatAgo(value)}
      </time>
    );
  }
  return <>{text}</>;
}
