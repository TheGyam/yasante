import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Tabs } from '@/shared/ui/Tabs';
import { Text } from '@/shared/ui/Text';
import { formatNumber } from '../../format';
import type { Overview } from '../../types';
import { TimeChart } from '../charts/TimeChart';
import * as ui from '../ui.css';

/** The last fortnight, one measure at a time; a day opens what happened on it. */
export function ActivityCard({ trend }: { trend: Overview['trend'] }) {
  const navigate = useNavigate();
  const [chosen, setChosen] = useState(trend.series[0]?.label ?? '');
  const series = trend.series.find(item => item.label === chosen) ?? trend.series[0];
  const total = series.values.reduce((sum, value) => sum + value, 0);
  return (
    <section className={ui.card} aria-labelledby="activity-title">
      <div className={ui.cardHeader}>
        <div className={ui.stack}>
          <Text variant="title3" id="activity-title">
            Last 14 days
          </Text>
          <Text variant="footnote" tone="secondary">
            {formatNumber(total)} {series.label.toLowerCase()} in total
          </Text>
        </div>
        {trend.series.length > 1 && (
          <Tabs
            label="Measure"
            value={series.label}
            onChange={setChosen}
            items={trend.series.map(item => ({
              value: item.label,
              label: item.label.replace(/^New (.)/, (_, first: string) => first.toUpperCase()),
            }))}
          />
        )}
      </div>
      <TimeChart
        labels={trend.dates}
        series={[{ name: series.label, values: series.values }]}
        area
        height={220}
        label={`${series.label} per day over the last 14 days`}
        onSelect={index => navigate(`${series.url}?created_at__date=${trend.dates[index]}`)}
      />
    </section>
  );
}
