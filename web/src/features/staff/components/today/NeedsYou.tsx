import { ArrowRight, CircleCheck } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Link } from '@/shared/ui/Link';
import { Text } from '@/shared/ui/Text';
import { formatAgo, formatDateTime, hoursSince } from '../../format';
import type { NeedsItem } from '../../types';
import * as ui from '../ui.css';
import * as s from './NeedsYou.css';

/** The oldest things waiting across every queue: open one and decide. */
export function NeedsYou({
  items,
  total,
  reviewUrl,
}: {
  items: NeedsItem[];
  total: number;
  reviewUrl?: string;
}) {
  return (
    <section className={ui.card} aria-labelledby="needs-title">
      <div className={ui.cardHeader}>
        <div className={ui.stack}>
          <Text variant="title3" id="needs-title">
            Needs you
          </Text>
          <Text variant="footnote" tone="secondary">
            {total ? 'Oldest first. Each takes a minute.' : 'Every queue is clear.'}
          </Text>
        </div>
        {total > 0 && reviewUrl && (
          <Button label="Review all" to={reviewUrl} size="sm" trailingIcon={ArrowRight} />
        )}
      </div>
      {items.length ? (
        <ul className={s.list}>
          {items.map(item => {
            const late = hoursSince(item.at) > 24;
            return (
              <li key={`${item.queue}-${item.id}`}>
                <Link to={item.url} className={s.item}>
                  <span className={s.queue}>{item.queue}</span>
                  <span className={s.body}>
                    <span className={`${s.title} ${ui.truncate}`}>{item.title}</span>
                    {item.facts.filter(Boolean).length > 0 && (
                      <span className={`${s.facts} ${ui.truncate}`}>
                        {item.facts.filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </span>
                  <time
                    dateTime={item.at}
                    title={formatDateTime(item.at)}
                    className={s.age}
                    data-late={late}
                  >
                    {formatAgo(item.at)}
                  </time>
                  <ArrowRight size={16} aria-hidden className={s.arrow} />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className={s.clear}>
          <CircleCheck size={28} aria-hidden className={s.clearIcon} />
          <Text variant="bodyStrong">All clear</Text>
          <Text variant="footnote" tone="secondary">
            New reports, checks and reviews will show up here.
          </Text>
        </div>
      )}
    </section>
  );
}
