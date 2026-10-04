import { Text } from '@/shared/ui/Text';
import { formatDateLong, greeting, plural } from '../../format';
import type { Overview } from '../../types';
import * as ui from '../ui.css';
import { ActivityCard } from './ActivityCard';
import { KeyNumbers } from './KeyNumbers';
import { NeedsYou } from './NeedsYou';
import { Queues } from './Queues';
import { RecentActivity } from './RecentActivity';
import * as s from './Today.css';

const NOUNS: Record<string, [string, string]> = {
  reports: ['report', 'reports'],
  'review-reports': ['reported review', 'reported reviews'],
  appeals: ['appeal', 'appeals'],
  'stylist-checks': ['stylist check', 'stylist checks'],
  reviews: ['review to publish', 'reviews to publish'],
  photos: ['flagged photo', 'flagged photos'],
  products: ['product to approve', 'products to approve'],
};

const list = (parts: string[]) =>
  parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0];

/** One sentence that says what the day holds, from real numbers only. */
function summary(data: Overview) {
  const waiting = data.queues.filter(queue => queue.count);
  const total = waiting.reduce((sum, queue) => sum + queue.count, 0);
  const work = waiting.length
    ? `${list(
        waiting.map(queue => {
          const [one, many] = NOUNS[queue.key] ?? [
            queue.label.toLowerCase(),
            queue.label.toLowerCase(),
          ];
          return plural(queue.count, one, many);
        })
      )} ${total === 1 ? 'needs' : 'need'} you.`
    : 'Nothing is waiting for you.';
  const bookings = data.metrics.find(metric => metric.label === 'Booking requests');
  const trend =
    bookings && bookings.change !== null && bookings.change !== 0
      ? ` Booking requests are ${bookings.change > 0 ? 'up' : 'down'} ${Math.abs(bookings.change)}% on last week.`
      : '';
  const errors = data.errors.new ? ` ${plural(data.errors.new, 'new error')} since yesterday.` : '';
  return work + trend + errors;
}

export function Today({ data }: { data: Overview }) {
  const first = data.user.name.split(/\s+/)[0];
  return (
    <div className={ui.page}>
      <header className={s.hero}>
        <Text variant="footnote" tone="tertiary">
          {formatDateLong(new Date())}
        </Text>
        <Text variant="display">
          {greeting()}, {first}.
        </Text>
        <Text tone="secondary" className={s.summary}>
          {summary(data)}
        </Text>
      </header>
      <div className={s.top}>
        <NeedsYou
          items={data.needs}
          total={data.totalOpen}
          reviewUrl={(data.queues.find(queue => queue.count) ?? data.queues[0])?.url}
        />
        <Queues queues={data.queues} errors={data.errors} />
      </div>
      {data.metrics.length > 0 && <KeyNumbers metrics={data.metrics} />}
      <div className={s.bottom}>
        {data.trend.series.length > 0 && <ActivityCard trend={data.trend} />}
        <RecentActivity audit={data.audit} />
      </div>
    </div>
  );
}
