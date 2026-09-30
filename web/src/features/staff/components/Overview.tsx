import { Button } from '@/shared/ui/Button';
import { Link } from '@/shared/ui/Link';
import { Text } from '@/shared/ui/Text';
import { ArrowUpRight, Clock3, RefreshCw } from 'lucide-react';
import type { Overview as OverviewData } from '../types';
import { MetricTiles } from './MetricTiles';
import * as s from './Overview.css';
import { RecentActivity } from './RecentActivity';
import { TrendChart } from './TrendChart';
import { WorkQueues } from './WorkQueues';
const dateTime = (value: string) => new Date(value).toLocaleString();
export function Overview({
  data,
  refreshing,
  refresh,
}: {
  data: OverviewData;
  refreshing: boolean;
  refresh: () => void;
}) {
  return (
    <>
      <div className={s.between}>
        <div className={s.stack}>
          <span className={s.eyebrow}>The whole picture, in one place</span>
          <Text variant="display">Yasante, at a glance.</Text>
          <Text tone="secondary">
            Welcome, {data.user.name.split(' ')[0]}. Here’s what’s happening on Yasante.
          </Text>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={refresh}
          disabled={refreshing}
          label={
            <>
              <RefreshCw size={16} aria-hidden />
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </>
          }
        />
      </div>
      <MetricTiles metrics={data.metrics} />
      <div className={s.split}>
        <section className={s.card} aria-labelledby="activity-title">
          <div className={s.between}>
            <div className={s.stack}>
              <Text variant="title3" id="activity-title">
                Community momentum
              </Text>
              <Text variant="footnote" tone="secondary">
                Daily activity over the last 14 days
              </Text>
            </div>
            <span className={s.tag}>
              <Clock3 size={14} aria-hidden />
              14 days
            </span>
          </div>
          <TrendChart trend={data.trend} />
        </section>
        <WorkQueues queues={data.queues} />
      </div>
      <RecentActivity audit={data.audit} />
      <div className={s.between}>
        <span className={s.muted}>
          Updated {dateTime(data.generatedAt)} · Refreshes every minute while this tab is visible
        </span>
        {data.user.superuser && (
          <Link className={s.button} to="/metrics">
            Weekly business metrics
            <ArrowUpRight size={16} aria-hidden />
          </Link>
        )}
      </div>
    </>
  );
}
