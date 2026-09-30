import { InlineAlert } from '@/shared/ui/InlineAlert';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';
import { staffMessage, useStaffRead } from '../hooks';
import type { Metrics } from '../types';
import * as s from './BusinessMetrics.css';
const columns = {
  week: 'Week of',
  wau: 'Weekly active people',
  bio_clicks: 'Bio link visits',
  waitlist: 'Waitlist sign-ups',
  looks: 'Looks',
  comments_per_look: 'Comments per look',
  requests: 'Booking requests',
  confirm_rate: 'Confirmed',
  deposit_rate: 'With deposit',
  no_show_rate: 'No-shows',
  reports: 'Reports',
  open_reports: 'Open reports',
  time_to_resolve: 'Median resolution',
};
export function BusinessMetrics() {
  const query = useStaffRead<Metrics>('metrics/', {});
  if (query.isError) return <InlineAlert message={staffMessage(query.error)} />;
  if (!query.data) return <Skeleton className={s.loadingPanel} />;
  const data = query.data;
  return (
    <>
      <Text variant="title1">Weekly business metrics</Text>
      <Text tone="secondary">
        Eight weeks of community, booking and moderation activity. The current week is still in
        progress.
      </Text>
      <div className={s.metrics}>
        {[
          ['Activated stylists', data.activated],
          ['Hair profile completion', data.completion],
          ['Median stylist response', data.response],
          ['Booking requests · 30 days', data.requests_30d],
        ].map(([label, value]) => (
          <div className={`${s.card} ${s.metric}`} key={label}>
            <Text variant="callout" tone="secondary">
              {label}
            </Text>
            <span className={s.number}>{value}</span>
          </div>
        ))}
      </div>
      <div className={s.recordTableWrap}>
        <table className={s.table}>
          <caption className="visually-hidden">Weekly business metrics</caption>
          <thead>
            <tr>
              {Object.entries(columns).map(([key, label]) => (
                <th key={key} scope="col">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.weeks.map(row => (
              <tr key={row.week}>
                {Object.keys(columns).map(key => (
                  <td key={key} data-label={columns[key as keyof typeof columns]}>
                    {row[key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
