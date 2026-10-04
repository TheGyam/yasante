import { InlineAlert } from '@/shared/ui/InlineAlert';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';
import { formatDate } from '../format';
import { staffMessage, useStaffRead } from '../hooks';
import type { Metrics } from '../types';
import { Sparkline } from './charts/Sparkline';
import * as ui from './ui.css';
import * as s from './BusinessMetrics.css';

const MEASURES: [string, string][] = [
  ['wau', 'Weekly active people'],
  ['bio_clicks', 'Bio link visits'],
  ['waitlist', 'Waitlist sign-ups'],
  ['looks', 'Looks posted'],
  ['comments_per_look', 'Comments per look'],
  ['requests', 'Booking requests'],
  ['confirm_rate', 'Confirmed'],
  ['deposit_rate', 'With a deposit'],
  ['no_show_rate', 'No-shows'],
  ['reports', 'Reports'],
  ['open_reports', 'Still open'],
  ['time_to_resolve', 'Median time to resolve'],
];

/** "45%", "3.2", "12h" or "–" as a number for the trend line. */
const numeric = (value: string | number) =>
  typeof value === 'number' ? value : Number.parseFloat(value) || 0;

/** Eight weeks, one row per measure, oldest to newest, with the trend drawn beside it. */
export function BusinessMetrics() {
  const query = useStaffRead<Metrics>('metrics/');
  if (query.isError) return <InlineAlert message={staffMessage(query.error)} />;
  if (!query.data) return <Skeleton className={s.loading} />;
  const data = query.data;
  const weeks = [...data.weeks].reverse();
  return (
    <div className={ui.page}>
      <header className={ui.heading}>
        <Text variant="title1">Business metrics</Text>
        <Text tone="secondary">
          Eight weeks, oldest first. The last column is this week so far.
        </Text>
      </header>
      <div className={s.tiles}>
        {[
          ['Activated stylists', data.activated],
          ['Hair profiles complete', data.completion],
          ['Median stylist response', data.response],
          ['Booking requests, last 30 days', data.requests_30d],
        ].map(([label, value]) => (
          <div className={s.tile} key={label}>
            <span className={s.tileLabel}>{label}</span>
            <span className={s.tileValue}>{value}</span>
          </div>
        ))}
      </div>
      <div className={s.tableWrap}>
        <table className={s.table}>
          <caption className="visually-hidden">Weekly business metrics</caption>
          <thead>
            <tr>
              <th scope="col">Measure</th>
              <th scope="col">Trend</th>
              {weeks.map((week, index) => (
                <th key={String(week.week)} scope="col" className={s.number}>
                  {index === weeks.length - 1 ? 'This week' : formatDate(String(week.week))}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MEASURES.map(([key, label]) => (
              <tr key={key}>
                <th scope="row">{label}</th>
                <td>
                  <Sparkline
                    values={weeks.map(week => numeric(week[key]))}
                    width={96}
                    height={24}
                  />
                </td>
                {weeks.map((week, index) => (
                  <td
                    key={String(week.week)}
                    className={s.number}
                    data-current={index === weeks.length - 1}
                  >
                    {week[key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
