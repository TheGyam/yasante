import { useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  MoreHorizontal,
  Pencil,
  Plus,
  SearchX,
} from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { Menu } from '@/shared/ui/Menu';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Tabs } from '@/shared/ui/Tabs';
import { Text } from '@/shared/ui/Text';
import { toast } from '@/shared/ui/Toast';
import { formatNumber } from '../../format';
import { staffMessage, useShortcuts, useStaffMutation, useStaffRead } from '../../hooks';
import type { ActionPreview, Records } from '../../types';
import { ActionReview } from '../ActionReview';
import * as ui from '../ui.css';
import { FilterBar } from './FilterBar';
import { RecordPanel } from './RecordPanel';
import { RecordTable } from './RecordTable';
import { SelectionBar } from './SelectionBar';
import * as s from './RecordList.css';

/** Params that belong to this screen, never sent to the server's list. */
const LOCAL = ['open'];
const serverParams = (params: URLSearchParams) => {
  const next = new URLSearchParams(params);
  LOCAL.forEach(key => next.delete(key));
  return next;
};
const same = (a: URLSearchParams, b: URLSearchParams) => {
  const clean = (p: URLSearchParams) =>
    [...p.entries()]
      .filter(([key]) => !['p', 'o', 'q'].includes(key))
      .map(pair => pair.join('='))
      .sort()
      .join('&');
  return clean(a) === clean(b);
};

export function RecordList({ app, model, csrf }: { app: string; model: string; csrf: string }) {
  const navigate = useNavigate();
  const mutate = useStaffMutation();
  const [params, setParams] = useSearchParams();
  const query = serverParams(params);
  const list = useStaffRead<Records>(`records/${app}/${model}/?${query}`, { keepPrevious: true });
  const [selected, setSelected] = useState<string[]>([]);
  const [across, setAcross] = useState(false);
  const [active, setActive] = useState(-1);
  const [action, setAction] = useState('');
  const [preview, setPreview] = useState<ActionPreview>();
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const confirm = useRef<HTMLDialogElement>(null);
  const data = list.data;
  const open = params.get('open');

  const apply = (next: URLSearchParams) => {
    setSelected([]);
    setAcross(false);
    setActive(-1);
    setParams(next);
  };
  const openRow = (row: Records['rows'][number], newTab = false) => {
    if (newTab) window.open(row.url, '_blank', 'noopener');
    else setParams(current => ({ ...Object.fromEntries(current), open: row.id }));
  };
  const page = (to: number) => {
    const next = new URLSearchParams(query);
    next.set('p', String(to));
    apply(next);
  };

  async function run(key: string, apply = false) {
    setBusy(true);
    setActionError('');
    const body = new FormData();
    body.set('action', key);
    selected.forEach(id => body.append('ids', id));
    if (across) body.set('all', 'yes');
    if (apply) {
      body.set('confirm', 'yes');
      body.set('token', preview?.token ?? '');
    }
    try {
      const result = await mutate<ActionPreview>(`actions/${app}/${model}/?${query}`, body, csrf);
      if (result.done) {
        confirm.current?.close();
        setSelected([]);
        setAcross(false);
        toast(
          result.messages?.map(item => item.message).join(' ') ||
            `Done for ${formatNumber(result.count)} records.`
        );
      } else {
        setAction(key);
        setPreview(result);
        confirm.current?.showModal();
      }
    } catch (error) {
      if (apply) setActionError(staffMessage(error));
      else toast(staffMessage(error), { tone: 'danger' });
    } finally {
      setBusy(false);
    }
  }

  useShortcuts(
    data
      ? {
          j: () => setActive(current => Math.min(data.rows.length - 1, current + 1)),
          k: () => setActive(current => Math.max(0, current - 1)),
          Enter: () => data.rows[active] && openRow(data.rows[active]),
          x: () =>
            data.rows[active] &&
            setSelected(current =>
              current.includes(data.rows[active].id)
                ? current.filter(id => id !== data.rows[active].id)
                : [...current, data.rows[active].id]
            ),
          ArrowLeft: () => data.page > 1 && page(data.page - 1),
          ArrowRight: () => data.page < data.pages && page(data.page + 1),
        }
      : {},
    !open
  );

  if (list.isError)
    return (
      <div className={ui.page}>
        <InlineAlert message={staffMessage(list.error)} />
        <div className={ui.actions}>
          <Button label="Try again" onClick={() => void list.refetch()} />
          <Button
            label="Clear filters"
            variant="secondary"
            onClick={() => apply(new URLSearchParams())}
          />
        </div>
      </div>
    );
  if (!data)
    return (
      <div className={ui.page}>
        <Skeleton className={s.titleSkeleton} />
        <Skeleton className={s.tableSkeleton} />
      </div>
    );

  const first = (data.page - 1) * 25 + 1;
  const view = data.views.find(item => same(new URLSearchParams(item.query), query));
  const pageSelected = data.rows.length > 0 && data.rows.every(row => selected.includes(row.id));
  const menu = [
    ...(data.quickEditable
      ? [
          {
            label: 'Quick edit this page',
            icon: Pencil,
            to: `/records/${app}/${model}/quick-edit?${query}`,
          },
        ]
      : []),
    {
      label: data.count > 5000 ? 'Export (narrow to 5,000 first)' : 'Export as CSV',
      icon: Download,
      href: `/data/export/${app}/${model}/?${query}`,
      disabled: data.count > 5000,
    },
  ];

  return (
    <div className={ui.page}>
      <header className={ui.header}>
        <div className={ui.heading}>
          <Text variant="title1">{data.name}</Text>
          <Text tone="secondary">
            {data.description ? `${data.description} · ` : ''}
            {formatNumber(data.count)} {data.count === 1 ? 'record' : 'records'}
          </Text>
        </div>
        <div className={ui.actions}>
          <Menu
            label="More"
            iconOnly
            icon={MoreHorizontal}
            align="end"
            items={menu.filter(item => !item.disabled)}
          />
          {data.addUrl && (
            <Button label={`New ${data.singular}`} icon={Plus} size="sm" to={data.addUrl} />
          )}
        </div>
      </header>
      {data.views.length > 1 && (
        <Tabs
          label="Views"
          value={view?.name ?? ''}
          onChange={name =>
            apply(new URLSearchParams(data.views.find(item => item.name === name)?.query ?? ''))
          }
          items={data.views.map(item => ({ value: item.name, label: item.name }))}
        />
      )}
      <FilterBar key={query.get('q') ?? ''} data={data} params={query} apply={apply} />
      <div className={s.results} data-loading={list.isPlaceholderData || list.isFetching}>
        {data.rows.length ? (
          <RecordTable
            data={data}
            selected={selected}
            active={active}
            sort={column => {
              const next = new URLSearchParams(query);
              next.set('o', column.direction === 'asc' ? `-${column.sort}` : String(column.sort));
              next.delete('p');
              apply(next);
            }}
            onToggle={id => {
              setAcross(false);
              setSelected(current =>
                current.includes(id) ? current.filter(item => item !== id) : [...current, id]
              );
            }}
            onToggleAll={() => {
              setAcross(false);
              setSelected(pageSelected ? [] : data.rows.map(row => row.id));
            }}
            onOpen={openRow}
          />
        ) : (
          <EmptyState
            icon={SearchX}
            title={
              query.size ? 'No results for these filters' : `No ${data.name.toLowerCase()} yet`
            }
            body={query.size ? 'Try a different search, or clear the filters.' : data.description}
            action={
              query.size ? (
                <Button
                  label="Clear filters"
                  variant="secondary"
                  size="sm"
                  onClick={() => apply(new URLSearchParams())}
                />
              ) : data.addUrl ? (
                <Button label={`New ${data.singular}`} icon={Plus} size="sm" to={data.addUrl} />
              ) : undefined
            }
          />
        )}
      </div>
      {data.pages > 1 && (
        <nav className={s.pager} aria-label="Pages">
          <span className={ui.muted}>
            {formatNumber(first)}–{formatNumber(first + data.rows.length - 1)} of{' '}
            {formatNumber(data.count)}
          </span>
          <Button
            label=""
            aria-label="Previous page"
            icon={ChevronLeft}
            size="sm"
            variant="quiet"
            disabled={data.page <= 1}
            onClick={() => page(data.page - 1)}
          />
          <Button
            label=""
            aria-label="Next page"
            icon={ChevronRight}
            size="sm"
            variant="quiet"
            disabled={data.page >= data.pages}
            onClick={() => page(data.page + 1)}
          />
        </nav>
      )}
      {selected.length > 0 && (
        <SelectionBar
          data={data}
          count={selected.length}
          across={across}
          pageSelected={pageSelected}
          busy={busy}
          onAcross={() => setAcross(true)}
          onAction={key => void run(key)}
          onClear={() => {
            setSelected([]);
            setAcross(false);
          }}
        />
      )}
      <ActionReview
        confirm={confirm}
        preview={preview}
        busy={busy}
        actionError={actionError}
        runAction={apply => run(action, apply)}
      />
      {open && (
        <RecordPanel
          app={app}
          model={model}
          id={open}
          csrf={csrf}
          onClose={() =>
            setParams(current => {
              const next = new URLSearchParams(current);
              next.delete('open');
              return next;
            })
          }
          onFullPage={() => navigate(`/records/${app}/${model}/${encodeURIComponent(open)}`)}
        />
      )}
    </div>
  );
}
