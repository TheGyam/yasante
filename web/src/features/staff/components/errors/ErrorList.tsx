import { useSearchParams } from 'react-router';
import { Bug, ChevronLeft, ChevronRight, CircleCheck } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { Link } from '@/shared/ui/Link';
import { Pill } from '@/shared/ui/Pill';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Tabs } from '@/shared/ui/Tabs';
import { Text } from '@/shared/ui/Text';
import { formatAgo, formatDateTime, formatNumber } from '../../format';
import { staffMessage, useErrorIssues } from '../../hooks';
import { Sparkline } from '../charts/Sparkline';
import * as ui from '../ui.css';
import { PLATFORMS, platformName } from './platforms';
import * as s from './ErrorList.css';

const STATUSES = [
  { value: 'open', label: 'Open' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'ignored', label: 'Ignored' },
  { value: '', label: 'All' },
];

/** Every failure, grouped: one row per problem, however many times it happened. */
export function ErrorList() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? 'open';
  const platform = params.get('platform') ?? '';
  const query = new URLSearchParams({
    ...(status && { status }),
    ...(platform && { platform }),
    p: params.get('p') ?? '1',
  });
  const issues = useErrorIssues(query.toString());
  const set = (key: string, value: string) =>
    setParams(current => {
      const next = new URLSearchParams(current);
      if (value) next.set(key, value);
      else next.set(key, '');
      next.delete('p');
      return next;
    });

  return (
    <div className={ui.page}>
      <header className={ui.header}>
        <div className={ui.heading}>
          <Text variant="title1">Errors</Text>
          <Text tone="secondary">
            Crashes and failures from the app, the website, the staff workspace and the server,
            grouped by cause.
          </Text>
        </div>
      </header>
      <div className={s.filters}>
        <Tabs
          label="Status"
          value={status}
          onChange={value => set('status', value)}
          items={STATUSES}
        />
        <Tabs
          label="Where"
          value={platform}
          onChange={value => set('platform', value)}
          items={[{ value: '', label: 'Everywhere' }, ...PLATFORMS]}
        />
      </div>
      {issues.isError ? (
        <InlineAlert message={staffMessage(issues.error)} />
      ) : !issues.data ? (
        <Skeleton className={s.skeleton} />
      ) : !issues.data.items.length ? (
        <EmptyState
          icon={status === 'open' ? CircleCheck : Bug}
          title={status === 'open' ? 'No open errors' : 'Nothing here'}
          body={
            status === 'open'
              ? 'Everything reported so far has been dealt with. New problems appear here, and superusers get an email.'
              : 'Try another filter.'
          }
        />
      ) : (
        <>
          <ul className={s.list}>
            {issues.data.items.map(issue => (
              <li key={issue.id}>
                <Link to={`/errors/${issue.id}`} className={s.row}>
                  <span className={s.where}>{platformName(issue.platform)}</span>
                  <span className={s.main}>
                    <span className={`${s.title} ${ui.truncate}`}>{issue.title}</span>
                    <span className={s.meta}>
                      {formatNumber(issue.count)} {issue.count === 1 ? 'time' : 'times'}
                      {issue.users > 0 &&
                        ` · ${formatNumber(issue.users)} ${issue.users === 1 ? 'person' : 'people'}`}
                      {issue.version && ` · ${issue.version}`}
                    </span>
                  </span>
                  <span className={s.pills}>
                    {issue.regressed && <Pill tone="danger">Back again</Pill>}
                    {issue.status !== 'open' && (
                      <Pill tone={issue.status === 'resolved' ? 'success' : 'neutral'}>
                        {issue.status === 'resolved' ? 'Resolved' : 'Ignored'}
                      </Pill>
                    )}
                  </span>
                  <span className={s.trend}>
                    {issue.sparkline && (
                      <Sparkline values={issue.sparkline} width={96} height={28} />
                    )}
                  </span>
                  <time dateTime={issue.last} title={formatDateTime(issue.last)} className={s.when}>
                    {formatAgo(issue.last)}
                  </time>
                </Link>
              </li>
            ))}
          </ul>
          {issues.data.count > 25 && (
            <nav className={s.pager} aria-label="Pages">
              <Button
                label=""
                aria-label="Previous page"
                icon={ChevronLeft}
                variant="quiet"
                size="sm"
                disabled={issues.data.page <= 1}
                onClick={() =>
                  setParams(current => ({
                    ...Object.fromEntries(current),
                    p: String(issues.data.page - 1),
                  }))
                }
              />
              <Text variant="caption" tone="tertiary">
                Page {issues.data.page} of {Math.ceil(issues.data.count / 25)}
              </Text>
              <Button
                label=""
                aria-label="Next page"
                icon={ChevronRight}
                variant="quiet"
                size="sm"
                disabled={issues.data.page * 25 >= issues.data.count}
                onClick={() =>
                  setParams(current => ({
                    ...Object.fromEntries(current),
                    p: String(issues.data.page + 1),
                  }))
                }
              />
            </nav>
          )}
        </>
      )}
    </div>
  );
}
