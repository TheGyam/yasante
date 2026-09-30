import { ChevronRight } from 'lucide-react';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { Link } from '@/shared/ui/Link';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';
import { formatNumber } from '../../format';
import { staffMessage, useRelated } from '../../hooks';
import * as ui from '../ui.css';
import * as s from './RelatedList.css';

/** Everything that points at this record (a person's bookings, looks, reports), each a click away. */
export function RelatedList({ app, model, id }: { app: string; model: string; id: string }) {
  const query = useRelated(app, model, id);
  if (query.isError) return <InlineAlert message={staffMessage(query.error)} />;
  if (!query.data) return <Skeleton className={s.loading} />;
  if (!query.data.items.length)
    return (
      <Text variant="footnote" tone="secondary">
        Nothing else refers to this record yet.
      </Text>
    );
  return (
    <ul className={s.list}>
      {query.data.items.map(item => (
        <li key={`${item.name}-${item.relation}`}>
          <Link to={item.url} className={s.row}>
            <span className={`${ui.grow} ${ui.truncate}`}>{item.name}</span>
            <span className={ui.count}>{formatNumber(item.count)}</span>
            <ChevronRight size={14} aria-hidden className={s.chevron} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
