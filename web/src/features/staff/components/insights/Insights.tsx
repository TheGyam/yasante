import { useSearchParams } from 'react-router';
import { Download } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Switch } from '@/shared/ui/Switch';
import { Tabs } from '@/shared/ui/Tabs';
import { Text } from '@/shared/ui/Text';
import { staffMessage, useInsight } from '../../hooks';
import { download, toCsv } from '../charts/scale';
import * as ui from '../ui.css';
import { InsightChart } from './InsightChart';
import { takeaway } from './takeaway';
import * as s from './Insights.css';

const RANGES = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: '365', label: '12 months' },
];

// `money`: superusers only. `noExport`: no CSV until a partner is agreed.
const CHARTS: {
  name: string;
  heading: string;
  money?: boolean;
  wide?: boolean;
  noExport?: boolean;
}[] = [
  { name: 'money', heading: 'Money', money: true, wide: true },
  { name: 'funnel', heading: 'From request to appointment' },
  { name: 'growth', heading: 'People joining' },
  { name: 'booking-times', heading: 'When people book', wide: true },
  { name: 'areas', heading: 'Demand and supply by area' },
  { name: 'empty-searches', heading: 'Searches that found nothing' },
  { name: 'area-suggestions', heading: 'Area suggestions' },
  { name: 'retention', heading: 'People coming back', wide: true },
  { name: 'top-stylists', heading: 'Top stylists', money: true },
  { name: 'community', heading: 'Community health' },
  { name: 'app-health', heading: 'App health', wide: true },
  { name: 'hair-trends', heading: 'Hair trends', money: true, wide: true, noExport: true },
];

const iso = (date: Date) => date.toISOString().slice(0, 10);

/** The business at a glance: each chart titled by what it shows, all on one date range. */
export function Insights({ superuser }: { superuser: boolean }) {
  const [params, setParams] = useSearchParams();
  const range = params.get('range') ?? '30';
  const compare = params.get('compare') === '1';
  const to = new Date();
  const from = new Date(to.getTime() - (Number(range) - 1) * 86_400_000);
  const query = `from=${iso(from)}&to=${iso(to)}${compare ? '&compare=1' : ''}`;
  const set = (key: string, value: string) =>
    setParams(current => ({ ...Object.fromEntries(current), [key]: value }));
  return (
    <div className={ui.page}>
      <header className={ui.header}>
        <div className={ui.heading}>
          <Text variant="title1">Insights</Text>
          <Text tone="secondary">Click any bar, point or step to see the records behind it.</Text>
        </div>
        <div className={ui.actions}>
          <Tabs
            label="Period"
            value={range}
            onChange={value => set('range', value)}
            items={RANGES}
          />
          <Switch
            label="Compare"
            checked={compare}
            onChange={event => set('compare', event.target.checked ? '1' : '0')}
          />
        </div>
      </header>
      <div className={s.grid}>
        {CHARTS.filter(chart => superuser || !chart.money).map(chart => (
          <InsightCard
            key={chart.name}
            name={chart.name}
            heading={chart.heading}
            wide={chart.wide}
            noExport={chart.noExport}
            query={query}
          />
        ))}
      </div>
    </div>
  );
}

function InsightCard({
  name,
  heading,
  wide,
  noExport,
  query,
}: {
  name: string;
  heading: string;
  wide?: boolean;
  noExport?: boolean;
  query: string;
}) {
  const insight = useInsight(name, query);
  const data = insight.data;
  return (
    <section className={`${ui.card} ${wide ? s.wide : ''}`} aria-label={heading}>
      <div className={ui.cardHeader}>
        <div className={ui.stack}>
          <Text variant="overline" tone="tertiary">
            {heading}
          </Text>
          <Text variant="title3">{data ? takeaway(data) : ' '}</Text>
        </div>
        {data && data.rows.length > 0 && !noExport && (
          <Button
            label=""
            aria-label={`Download ${heading} as CSV`}
            title="Download as CSV"
            icon={Download}
            variant="quiet"
            size="sm"
            onClick={() =>
              download(
                name,
                toCsv(
                  ['Label', ...data.labels],
                  data.rows.map(row => [row.label, ...row.values])
                )
              )
            }
          />
        )}
      </div>
      {insight.isError ? (
        <InlineAlert message={staffMessage(insight.error)} />
      ) : !data ? (
        <Skeleton className={s.skeleton} />
      ) : data.rows.length ? (
        <>
          <InsightChart insight={data} />
          <details className={s.table}>
            <summary>View as table</summary>
            <table>
              <thead>
                <tr>
                  <th scope="col">Label</th>
                  {data.labels.map(label => (
                    <th key={label} scope="col">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map(row => (
                  <tr key={row.label}>
                    <td>{row.label}</td>
                    {row.values.map((value, index) => (
                      <td key={index}>{value}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      ) : (
        <Text variant="footnote" tone="secondary">
          Nothing to show for this period yet.
        </Text>
      )}
    </section>
  );
}
