import { Button } from '@/shared/ui/Button';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';
import { ArrowLeft } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { staffMessage, useStaffRead } from '../hooks';
import * as s from './RecordHistory.css';
export function RecordHistory({ app, model, id }: { app: string; model: string; id: string }) {
  const [params, setParams] = useSearchParams();
  const query = useStaffRead<{
    name: string;
    page: number;
    pages: number;
    entries: { id: number; at: string; actor: string; message: string }[];
  }>(`history/${app}/${model}/${id}/?${params}`, {});
  if (query.isError) return <InlineAlert message={staffMessage(query.error)} />;
  if (!query.data) return <Skeleton className={s.loadingPanel} />;
  const data = query.data;
  return (
    <>
      <Button
        to={`/records/${app}/${model}/${id}`}
        label="Back to record"
        icon={ArrowLeft}
        variant="secondary"
      />
      <Text variant="title1">History · {data.name}</Text>
      <section className={s.card}>
        {data.entries.map(entry => (
          <div className={s.queue} key={entry.id}>
            <div className={s.grow}>
              <Text variant="body">{entry.message}</Text>
              <Text variant="caption" tone="secondary">
                {entry.actor} · {new Date(entry.at).toLocaleString()}
              </Text>
            </div>
          </div>
        ))}
        {!data.entries.length && <Text>No changes recorded yet.</Text>}
      </section>
      <div className={s.row}>
        <Button
          variant="ghost"
          size="sm"
          disabled={data.page <= 1}
          onClick={() => setParams({ p: String(data.page - 1) })}
          label={<>Previous</>}
        />
        <span>
          Page {data.page} of {data.pages}
        </span>
        <Button
          variant="ghost"
          size="sm"
          disabled={data.page >= data.pages}
          onClick={() => setParams({ p: String(data.page + 1) })}
          label={<>Next</>}
        />
      </div>
    </>
  );
}
