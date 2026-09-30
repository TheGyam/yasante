import { ShieldCheck } from 'lucide-react';
import { Link } from '@/shared/ui/Link';
import { Text } from '@/shared/ui/Text';
import { formatAgo, formatDateTime } from '../../format';
import type { AuditEntry } from '../../types';
import * as ui from '../ui.css';
import * as s from './RecentActivity.css';

/** Who changed what, most recent first. Security events carry a shield. */
export function RecentActivity({ audit }: { audit: AuditEntry[] }) {
  return (
    <section className={ui.card} aria-labelledby="recent-title">
      <div className={ui.cardHeader}>
        <Text variant="title3" id="recent-title">
          Staff activity
        </Text>
        <Link to="/records/admin/logentry" className={ui.link}>
          View all
        </Link>
      </div>
      {audit.length ? (
        <ol className={s.timeline}>
          {audit.slice(0, 8).map(entry => {
            const security = entry.action === 'Security';
            const initials = entry.actor
              .split(/\s+/)
              .map(part => part[0])
              .slice(0, 2)
              .join('');
            return (
              <li key={entry.id} className={s.entry}>
                <span className={s.avatar} data-security={security} aria-hidden>
                  {security ? <ShieldCheck size={14} /> : initials}
                </span>
                <span className={s.body}>
                  <span className={s.line}>
                    <strong>{entry.actor}</strong> {security ? '' : entry.action.toLowerCase()}{' '}
                    {entry.url ? (
                      <Link to={entry.url} className={ui.link}>
                        {entry.object}
                      </Link>
                    ) : (
                      entry.object
                    )}
                  </span>
                  <time dateTime={entry.at} title={formatDateTime(entry.at)} className={s.when}>
                    {formatAgo(entry.at)}
                  </time>
                </span>
              </li>
            );
          })}
        </ol>
      ) : (
        <Text variant="footnote" tone="secondary">
          Nothing recorded yet.
        </Text>
      )}
    </section>
  );
}
