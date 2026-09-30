import { ApiError } from '@/shared/lib/api/client';
import { Button } from '@/shared/ui/Button';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';
import { ChevronLeft, ChevronRight, Plus, RefreshCw } from 'lucide-react';
import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { staffMessage, useStaffMutation, useStaffRead } from '../hooks';
import type { ActionPreview, Records } from '../types';
import { ActionReview } from './ActionReview';
import { BulkActions } from './BulkActions';
import { RecordFilters } from './RecordFilters';
import * as s from './RecordList.css';
import { RecordTable } from './RecordTable';
const number = new Intl.NumberFormat();
export function RecordList({ app, model, csrf }: { app: string; model: string; csrf: string }) {
  const mutateStaff = useStaffMutation();
  const [params, setParams] = useSearchParams();
  const query = useStaffRead<Records>(
    `records/${encodeURIComponent(app)}/${encodeURIComponent(model)}/?${params}`,
    {}
  );
  const [selected, setSelected] = useState<string[]>([]);
  const [across, setAcross] = useState(false);
  const [action, setAction] = useState('');
  const [preview, setPreview] = useState<ActionPreview>();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');
  const confirm = useRef<HTMLDialogElement>(null);
  async function runAction(apply = false) {
    setBusy(true);
    setActionError('');
    const body = new FormData();
    body.set('action', action);
    selected.forEach(id => body.append('ids', id));
    if (across) body.set('all', 'yes');
    if (apply) {
      body.set('confirm', 'yes');
      body.set('token', preview?.token ?? '');
    }
    try {
      const result = await mutateStaff<ActionPreview>(
        `actions/${app}/${model}/?${params}`,
        body,
        csrf
      );
      if (result.done) {
        confirm.current?.close();
        setSelected([]);
        setAcross(false);
        setAction('');
        setNotice(
          result.messages?.map(item => item.message).join(' ') ||
            `Action completed for ${result.count} records.`
        );
      } else {
        setPreview(result);
        confirm.current?.showModal();
      }
    } catch (error) {
      setActionError(staffMessage(error));
    } finally {
      setBusy(false);
    }
  }
  if (query.isError)
    return (
      <div className={s.stack}>
        <InlineAlert
          message={
            query.error instanceof ApiError && typeof query.error.data?.message === 'string'
              ? query.error.data.message
              : 'We couldn’t load these records. Try again.'
          }
        />
        <div className={s.row}>
          <Button label="Try again" onClick={() => void query.refetch()} />
          <Button variant="secondary" label="Reset filters" onClick={() => setParams({})} />
        </div>
      </div>
    );
  if (!query.data)
    return (
      <div role="status" className={s.card}>
        <Skeleton className={s.loadingPanel} />
      </div>
    );
  const data = query.data;
  const changePage = (page: number) => {
    const next = new URLSearchParams(params);
    next.set('p', String(page));
    setParams(next);
  };
  return (
    <>
      <div className={s.between}>
        <div className={s.stack}>
          <span className={s.eyebrow}>Record workspace</span>
          <Text variant="display">{data.name}</Text>
          <Text tone="secondary">
            {number.format(data.count)} matching records · Open any record to view or edit its
            details.
          </Text>
        </div>
        <div className={s.row}>
          <Button
            variant="ghost"
            size="sm"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
            label={
              <>
                <RefreshCw size={16} aria-hidden />
                Refresh
              </>
            }
          />
          {data.addUrl && <Button to={data.addUrl} label="Add record" size="md" icon={Plus} />}
          {data.quickEditable && (
            <Button
              to={`/records/${app}/${model}/quick-edit?${params}`}
              label="Quick edit this page"
              size="md"
              variant="secondary"
            />
          )}
        </div>
      </div>
      {notice && <InlineAlert tone="success" message={notice} />}
      {actionError && <InlineAlert message={actionError} />}
      <RecordFilters data={data} params={params} setParams={setParams} />
      {!!selected.length && (
        <BulkActions
          data={data}
          params={params}
          setParams={setParams}
          selected={selected}
          setSelected={setSelected}
          across={across}
          setAcross={setAcross}
          busy={busy}
          action={action}
          setAction={setAction}
          runAction={runAction}
        />
      )}
      <RecordTable
        data={data}
        params={params}
        setParams={setParams}
        selected={selected}
        setSelected={setSelected}
        across={across}
        setAcross={setAcross}
        busy={busy}
      />
      <div className={s.between}>
        <span className={s.muted}>
          Page {data.page} of {data.pages} · Up to 25 records per page
        </span>
        <div className={s.row}>
          <Button
            variant="ghost"
            size="sm"
            disabled={data.page <= 1}
            onClick={() => changePage(data.page - 1)}
            label={
              <>
                <ChevronLeft size={16} aria-hidden />
                Previous
              </>
            }
          />
          <Button
            variant="ghost"
            size="sm"
            disabled={data.page >= data.pages}
            onClick={() => changePage(data.page + 1)}
            label={
              <>
                Next
                <ChevronRight size={16} aria-hidden />
              </>
            }
          />
        </div>
      </div>
      <ActionReview
        confirm={confirm}
        preview={preview}
        busy={busy}
        actionError={actionError}
        runAction={runAction}
      />
    </>
  );
}
