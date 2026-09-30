import { useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';
import { formatAgo, formatDateTime } from '../format';
import { staffMessage, useStaffRead } from '../hooks';
import * as ui from './ui.css';
import * as s from './RecordHistory.css';

interface History {
  name: string;
  page: number;
  pages: number;
  entries: { id: number; at: string; actor: string; message: string }[];
}

/** Who changed this record and what they changed, newest first. */
export function RecordHistory({
  app,
  model,
  id,
  standalone = false,
}: {
  app: string;
  model: string;
  id: string;
  standalone?: boolean;
}) {
  const [page, setPage] = useState(1);
  const query = useStaffRead<History>(
    `history/${app}/${model}/${encodeURIComponent(id)}/?p=${page}`,
    { keepPrevious: true }
  );
  if (query.isError) return <InlineAlert message={staffMessage(query.error)} />;
  if (!query.data) return <Skeleton className={s.loading} />;
  const data = query.data;
  return (
    <div className={ui.stack}>
      {standalone && (
        <>
          <Button
            to={`/records/${app}/${model}/${encodeURIComponent(id)}`}
            label="Back to the record"
            icon={ArrowLeft}
            variant="quiet"
            size="sm"
          />
          <Text variant="title1">History of {data.name}</Text>
        </>
      )}
      {data.entries.length ? (
        <ol className={s.timeline}>
          {data.entries.map(entry => (
            <li key={entry.id} className={s.entry}>
              <span className={s.dot} aria-hidden />
              <div className={ui.stack}>
                <Text variant="subhead">{entry.message || 'Changed'}</Text>
                <Text variant="caption" tone="tertiary">
                  {entry.actor} ·{' '}
                  <time dateTime={entry.at} title={formatDateTime(entry.at)}>
                    {formatAgo(entry.at)}
                  </time>
                </Text>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <Text variant="footnote" tone="secondary">
          No changes have been recorded for this record.
        </Text>
      )}
      {data.pages > 1 && (
        <div className={ui.actions}>
          <Button
            label=""
            aria-label="Newer changes"
            icon={ChevronLeft}
            variant="quiet"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          />
          <Text variant="caption" tone="tertiary">
            Page {data.page} of {data.pages}
          </Text>
          <Button
            label=""
            aria-label="Older changes"
            icon={ChevronRight}
            variant="quiet"
            size="sm"
            disabled={page >= data.pages}
            onClick={() => setPage(page + 1)}
          />
        </div>
      )}
    </div>
  );
}
