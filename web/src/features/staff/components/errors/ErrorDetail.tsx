import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { Link } from '@/shared/ui/Link';
import { Pill } from '@/shared/ui/Pill';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';
import { toast } from '@/shared/ui/Toast';
import { formatAgo, formatDateTime, formatNumber } from '../../format';
import { staffMessage, useErrorIssue, useStaffMutation } from '../../hooks';
import type { ErrorDetail as Detail } from '../../types';
import { BarChart } from '../charts/BarChart';
import * as ui from '../ui.css';
import { platformName } from './platforms';
import * as s from './ErrorDetail.css';

/** Occurrences per day, one bar segment per app version, so a fix shows as a colour ending. */
function byVersion(trend: Detail['trend']) {
  const days = [...new Set(trend.map(row => row.day))].sort();
  const versions = [...new Set(trend.map(row => row.app_version || 'Unknown'))];
  return {
    versions,
    bars: days.map(day => ({
      label: new Date(day).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      values: versions.map(
        version =>
          trend.find(row => row.day === day && (row.app_version || 'Unknown') === version)?.value ??
          0
      ),
    })),
  };
}

export function ErrorDetail({ id, csrf }: { id: string; csrf: string }) {
  const query = useErrorIssue(id);
  const mutate = useStaffMutation();
  const [version, setVersion] = useState('');
  const [busy, setBusy] = useState(false);

  if (query.isError) return <InlineAlert message={staffMessage(query.error)} />;
  if (!query.data) return <Skeleton className={s.skeleton} />;
  const issue = query.data;
  const chart = byVersion(issue.trend);
  const latest = issue.occurrences[0];

  const act = async (status: 'open' | 'resolved' | 'ignored') => {
    const body = new FormData();
    body.set('status', status);
    if (status === 'resolved' && version) body.set('version', version);
    setBusy(true);
    try {
      await mutate(`errors/${id}/action/`, body, csrf);
      toast(
        status === 'resolved'
          ? 'Marked as resolved. You’ll hear if it comes back.'
          : status === 'ignored'
            ? 'Ignored. No more emails about it.'
            : 'Reopened'
      );
    } catch (error) {
      toast(staffMessage(error), { tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={ui.page}>
      <header className={ui.header}>
        <div className={ui.heading}>
          <Link to="/errors" className={s.back}>
            <ArrowLeft size={14} aria-hidden /> Errors
          </Link>
          <Text variant="title2" className={s.title}>
            {issue.title}
          </Text>
          <div className={ui.actions}>
            <Pill>{platformName(issue.platform)}</Pill>
            <Pill
              tone={
                issue.status === 'open'
                  ? 'warning'
                  : issue.status === 'resolved'
                    ? 'success'
                    : 'neutral'
              }
            >
              {issue.status === 'open'
                ? 'Open'
                : issue.status === 'resolved'
                  ? `Resolved${issue.resolvedInVersion ? ` in ${issue.resolvedInVersion}` : ''}`
                  : 'Ignored'}
            </Pill>
            {issue.regressed && <Pill tone="danger">Came back after being resolved</Pill>}
          </div>
        </div>
        {issue.editable && (
          <div className={ui.actions}>
            {issue.status === 'open' ? (
              <>
                <input
                  className={s.version}
                  value={version}
                  onChange={event => setVersion(event.target.value)}
                  placeholder="Fixed in version (optional)"
                  aria-label="Fixed in version"
                  maxLength={40}
                />
                <Button
                  label="Resolve"
                  size="sm"
                  loading={busy}
                  onClick={() => void act('resolved')}
                />
                <Button
                  label="Ignore"
                  size="sm"
                  variant="quiet"
                  disabled={busy}
                  onClick={() => void act('ignored')}
                />
              </>
            ) : (
              <Button
                label="Reopen"
                size="sm"
                variant="secondary"
                loading={busy}
                onClick={() => void act('open')}
              />
            )}
          </div>
        )}
      </header>
      <section className={s.stats} aria-label="Summary">
        {[
          ['Times', formatNumber(issue.count)],
          ['People affected', formatNumber(issue.users)],
          ['First seen', formatAgo(issue.first)],
          ['Last seen', formatAgo(issue.last)],
          ['Latest version', issue.version || '—'],
        ].map(([label, value]) => (
          <div key={label} className={s.stat}>
            <span className={s.statLabel}>{label}</span>
            <span className={s.statValue}>{value}</span>
          </div>
        ))}
      </section>
      {chart.bars.length > 0 && (
        <section className={ui.card}>
          <Text variant="title3">Last 14 days, by version</Text>
          <BarChart
            bars={chart.bars}
            series={chart.versions}
            stacked
            label="Occurrences per day by app version"
          />
        </section>
      )}
      {latest && (
        <section className={ui.card}>
          <div className={ui.cardHeader}>
            <Text variant="title3">Latest stack trace</Text>
            <Text variant="caption" tone="tertiary">
              {formatDateTime(latest.at)}
            </Text>
          </div>
          <pre className={s.stack}>{latest.stack || 'No stack trace was sent.'}</pre>
        </section>
      )}
      <section className={ui.card}>
        <Text variant="title3">Recent occurrences</Text>
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th scope="col">When</th>
                <th scope="col">Who</th>
                <th scope="col">Where</th>
                <th scope="col">Device</th>
                <th scope="col">Version</th>
              </tr>
            </thead>
            <tbody>
              {issue.occurrences.map(row => (
                <tr key={row.id}>
                  <td title={formatDateTime(row.at)}>{formatAgo(row.at)}</td>
                  <td>
                    {row.userUrl ? (
                      <Link to={row.userUrl} className={ui.link}>
                        {row.user}
                      </Link>
                    ) : (
                      row.user
                    )}
                  </td>
                  <td className={s.mono} title={row.path}>
                    {row.path || '—'}
                  </td>
                  <td title={[row.device, row.os].filter(Boolean).join(' · ')}>
                    {[row.device, row.os].filter(Boolean).join(' · ') || '—'}
                  </td>
                  <td>{row.version || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
