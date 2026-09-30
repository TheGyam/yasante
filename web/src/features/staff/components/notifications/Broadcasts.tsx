import { BellRing, Plus } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { Pill } from '@/shared/ui/Pill';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';
import { formatAgo, formatDateTime, formatNumber } from '../../format';
import { staffMessage, useBroadcasts } from '../../hooks';
import * as ui from '../ui.css';
import { PushHealth } from './PushHealth';
import * as s from './Broadcasts.css';

/** Everything sent to people's phones from here, with how it was delivered. */
export function Broadcasts() {
  const query = useBroadcasts();
  const data = query.data;
  return (
    <div className={ui.page}>
      <header className={ui.header}>
        <div className={ui.heading}>
          <Text variant="title1">Push notifications</Text>
          <Text tone="secondary">
            Messages to people’s phones. News only reaches people who switched it on.
          </Text>
        </div>
        {data?.canSend && (
          <Button label="New notification" icon={Plus} size="sm" to="/notifications/new" />
        )}
      </header>
      {data?.canSend && <PushHealth />}
      {query.isError ? (
        <InlineAlert message={staffMessage(query.error)} />
      ) : !data ? (
        <Skeleton className={s.skeleton} />
      ) : !data.items.length ? (
        <EmptyState
          icon={BellRing}
          title="Nothing sent yet"
          body="Write one, choose who gets it and send yourself a test first."
          action={
            data.canSend ? (
              <Button label="New notification" icon={Plus} size="sm" to="/notifications/new" />
            ) : undefined
          }
        />
      ) : (
        <ul className={s.list}>
          {data.items.map(item => (
            <li key={item.id} className={s.item}>
              <div className={s.main}>
                <div className={ui.row}>
                  <Pill tone={item.kind === 'update' ? 'warning' : 'accent'}>
                    {item.kind === 'update' ? 'Important update' : 'News'}
                  </Pill>
                  <span className={ui.muted}>
                    {item.audience} · {item.sentBy} ·{' '}
                    <time dateTime={item.at} title={formatDateTime(item.at)}>
                      {formatAgo(item.at)}
                    </time>
                  </span>
                </div>
                <Text variant="bodyStrong">{item.title}</Text>
                <Text variant="footnote" tone="secondary">
                  {item.body}
                </Text>
              </div>
              <div className={s.stats}>
                <span className={s.stat}>
                  <strong>{formatNumber(item.delivered)}</strong> of {formatNumber(item.recipients)}{' '}
                  delivered
                </span>
                {item.accepted + item.waiting > 0 && (
                  <span className={s.stat}>
                    {formatNumber(item.accepted + item.waiting)} on their way
                  </span>
                )}
                {item.logged > 0 && (
                  <span className={`${s.stat} ${s.failed}`}>
                    {formatNumber(item.logged)} only logged, not sent
                  </span>
                )}
                {item.failed + item.noDevice > 0 && (
                  <span className={`${s.stat} ${s.failed}`}>
                    {formatNumber(item.failed + item.noDevice)} couldn’t be delivered
                  </span>
                )}
                {item.problem && <span className={s.problem}>{item.problem}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
