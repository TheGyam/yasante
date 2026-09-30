import { EmptyState } from '@/shared/ui/EmptyState';
import { Link } from '@/shared/ui/Link';
import { Text } from '@/shared/ui/Text';
import { ArrowRight } from 'lucide-react';
import type { Overview as OverviewData } from '../types';
import * as s from './RecentActivity.css';

export function RecentActivity({ audit }: { audit: OverviewData['audit'] }) {
  const dateTime = (value: string) => new Date(value).toLocaleString();
  return (
    <section className={s.card} aria-labelledby="audit-title">
      <div className={s.between}>
        <div className={s.stack}>
          <Text variant="title3" id="audit-title">
            Recent activity
          </Text>
          <Text variant="footnote" tone="secondary">
            Recorded staff changes. Open a record’s history to see its audit trail.
          </Text>
        </div>
        <Link className={s.button} to="/tools">
          Explore all tools
          <ArrowRight size={16} aria-hidden />
        </Link>
      </div>
      {audit.map(item => (
        <div className={s.queue} key={item.id}>
          <span className={s.tag}>{item.action}</span>
          <div className={`${s.grow} ${s.stack}`}>
            {item.url ? (
              <Link to={item.url}>
                <Text variant="callout">{item.object}</Text>
              </Link>
            ) : (
              <Text variant="callout">{item.object}</Text>
            )}
            <Text variant="caption" tone="secondary">
              {item.actor}
            </Text>
          </div>
          <time className={s.muted} dateTime={item.at}>
            {dateTime(item.at)}
          </time>
        </div>
      ))}
      {!audit.length && (
        <EmptyState title="No changes recorded for your accessible areas yet." body="" />
      )}
    </section>
  );
}
