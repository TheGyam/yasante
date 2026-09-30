import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { CircleCheck } from 'lucide-react';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { Link } from '@/shared/ui/Link';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';
import { toast } from '@/shared/ui/Toast';
import { formatAgo, hoursSince } from '../../format';
import { staffMessage, useReviewQueue, useShortcuts, useStaffMutation } from '../../hooks';
import type { Decision, Overview, ReviewItem } from '../../types';
import * as ui from '../ui.css';
import { ReviewDetail } from './ReviewDetail';
import * as s from './ReviewScreen.css';

const DONE: Record<string, string> = {
  Hide: 'Hidden',
  Remove: 'Removed',
  Dismiss: 'Dismissed',
  Approve: 'Approved',
  Reject: 'Rejected',
  Uphold: 'Kept',
  Overturn: 'Overturned',
  Publish: 'Published',
  'Delete permanently': 'Deleted',
};

/**
 * Work through a queue: the list on the left, the item in full on the right. A decision
 * takes effect at once, the next item slides in, and Undo is on the toast.
 */
export function ReviewScreen({ queue, data }: { queue: string; data: Overview }) {
  const [params, setParams] = useSearchParams();
  const mutate = useStaffMutation();
  const query = useReviewQueue(queue);
  const [decided, setDecided] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const items = (query.data?.items ?? []).filter(item => !decided.includes(item.id));
  const selected = items.find(item => item.id === params.get('item')) ?? items[0];
  const index = selected ? items.indexOf(selected) : -1;
  const select = (item: ReviewItem | undefined) =>
    item &&
    setParams(current => ({ ...Object.fromEntries(current), item: item.id }), { replace: true });

  useShortcuts({
    j: () => select(items[index + 1]),
    k: () => select(items[index - 1]),
  });

  async function decide(action: string, note: string, confirmed = false) {
    if (!selected || busy) return;
    const body = new FormData();
    body.set('action', action);
    if (note) body.set('note', note);
    if (confirmed) body.set('confirmed', 'yes');
    setBusy(true);
    const next = items[index + 1] ?? items[index - 1];
    try {
      const result = await mutate<Decision>(
        `review/${queue}/${encodeURIComponent(selected.id)}/decide/`,
        body,
        data.csrfToken
      );
      setDecided(current => [...current, selected.id]);
      select(next);
      const undo = result.undo;
      toast(`${DONE[result.label] ?? result.label} · ${selected.title}`, {
        action: undo
          ? {
              label: 'Undo',
              run: async () => {
                const form = new FormData();
                form.set('token', undo);
                await mutate('undo/', form, data.csrfToken);
                setDecided(current => current.filter(id => id !== selected.id));
                toast('Undone');
              },
            }
          : undefined,
      });
    } catch (error) {
      toast(staffMessage(error), { tone: 'danger' });
      void query.refetch();
    } finally {
      setBusy(false);
    }
  }

  const other = data.queues.find(item => item.key !== queue && item.count);
  return (
    <div className={s.screen}>
      <nav className={s.queues} aria-label="Queues">
        {data.queues.map(item => (
          <Link
            key={item.key}
            to={item.url}
            className={s.queueChip}
            aria-current={item.key === queue ? 'page' : undefined}
          >
            {item.label}
            <span className={`${ui.count} ${item.count ? ui.urgent : ''}`}>{item.count}</span>
          </Link>
        ))}
      </nav>
      {query.isError ? (
        <InlineAlert message={staffMessage(query.error)} />
      ) : !query.data ? (
        <div className={s.layout}>
          <Skeleton className={s.listSkeleton} />
          <Skeleton className={s.detailSkeleton} />
        </div>
      ) : !items.length ? (
        <div className={`${ui.card} ${s.done}`}>
          <CircleCheck size={40} aria-hidden className={s.doneIcon} />
          <Text variant="title2">All clear. Nice work.</Text>
          <Text tone="secondary">Nothing is waiting in {query.data.name.toLowerCase()}.</Text>
          {other ? (
            <Link to={other.url} className={ui.link}>
              Next: {other.label} ({other.count})
            </Link>
          ) : (
            <Link to="/" className={ui.link}>
              Back to Today
            </Link>
          )}
        </div>
      ) : (
        <div className={s.layout}>
          <ol className={s.list} aria-label={query.data.name}>
            {items.map(item => (
              <li key={item.id}>
                <button
                  type="button"
                  className={s.listItem}
                  aria-current={item.id === selected?.id ? 'true' : undefined}
                  onClick={() => select(item)}
                >
                  <span className={`${s.listTitle} ${ui.truncate}`}>{item.title}</span>
                  <span className={`${s.listMeta} ${ui.truncate}`}>
                    <span data-late={hoursSince(item.at) > 24} className={s.age}>
                      {formatAgo(item.at)}
                    </span>
                    {item.facts.filter(Boolean)[0] && ` · ${item.facts.filter(Boolean)[0]}`}
                  </span>
                </button>
              </li>
            ))}
            {query.data.next && (
              <li className={s.more}>
                <Text variant="footnote" tone="tertiary">
                  More waiting: the next 20 appear as you work through these.
                </Text>
              </li>
            )}
          </ol>
          {selected && (
            <ReviewDetail
              key={selected.id}
              item={selected}
              actions={query.data.actions}
              position={`${index + 1} of ${items.length}${query.data.next ? '+' : ''}`}
              busy={busy}
              onDecide={decide}
              onPrevious={items[index - 1] ? () => select(items[index - 1]) : undefined}
              onNext={items[index + 1] ? () => select(items[index + 1]) : undefined}
            />
          )}
        </div>
      )}
    </div>
  );
}
