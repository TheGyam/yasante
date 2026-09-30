import { EmptyState } from '@/shared/ui/EmptyState';
import { Link } from '@/shared/ui/Link';
import { Text } from '@/shared/ui/Text';
import { ChevronRight, CircleCheck } from 'lucide-react';
import type { Overview as OverviewData } from '../types';
import * as s from './WorkQueues.css';

export function WorkQueues({ queues }: { queues: OverviewData['queues'] }) {
  const number = new Intl.NumberFormat();
  const pending = queues.reduce((sum, item) => sum + item.count, 0);
  return (
    <section className={s.card} aria-labelledby="queue-title">
      <div className={s.between}>
        <div className={s.stack}>
          <Text variant="title3" id="queue-title">
            Needs your attention
          </Text>
          <Text variant="footnote" tone="secondary">
            Your moderation and verification queues
          </Text>
        </div>
        <span className={s.tag}>{number.format(pending)} pending</span>
      </div>
      {queues.map(item => (
        <Link className={s.queue} to={item.url} key={item.label}>
          <span className={s.count}>
            {item.count ? (
              number.format(item.count)
            ) : (
              <CircleCheck size={18} aria-label="No pending items" />
            )}
          </span>
          <div className={`${s.grow} ${s.stack}`}>
            <Text variant="callout">{item.label}</Text>
            <Text variant="caption" tone="secondary">
              {item.hint}
            </Text>
          </div>
          <ChevronRight size={16} aria-hidden />
        </Link>
      ))}
      {!queues.length && <EmptyState title="No review queues are assigned to your role." body="" />}
    </section>
  );
}
