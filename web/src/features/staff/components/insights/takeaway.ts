import { formatMoney, formatMoneyList, formatNumber, percent } from '../../format';
import type { Insight, InsightRow } from '../../types';

const sum = (rows: InsightRow[], index = 0) =>
  rows.reduce((total, row) => total + (row.values[index] ?? 0), 0);

const versus = (now: number, before: number | null) =>
  before === null || before === 0
    ? ''
    : `, ${percent(((now - before) / before) * 100)} on the period before`;

const DAYS = ['Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays', 'Sundays'];

/**
 * Each chart's title says what it shows in words, from its own numbers, so the page can
 * be read without studying a single axis.
 */
export function takeaway(insight: Insight): string {
  const { rows, meta, previous } = insight;
  const before = (index = 0) => (previous ? sum(previous, index) : null);
  switch (insight.name) {
    case 'money': {
      const total = Number(meta.total ?? 0);
      if (!total) return 'No completed bookings in this period yet';
      const currencies = (meta.currencies ?? []) as unknown as {
        currency: string;
        amount: number;
      }[];
      if (currencies.length > 1) return `${formatMoneyList(currencies)} from completed bookings`;
      return `${formatMoney(total, String(meta.currency ?? 'GBP'))} from completed bookings${versus(total, previous ? sum(previous, 0) + sum(previous, 1) : null)}`;
    }
    case 'funnel': {
      const requested = Number(meta.requested ?? 0);
      const completed = Number(meta.completed ?? 0);
      if (!requested) return 'No booking requests in this period';
      return `${Math.round((completed / requested) * 100)}% of requests became a finished appointment`;
    }
    case 'growth': {
      const clients = sum(rows, 0);
      const stylists = sum(rows, 1);
      return `${formatNumber(clients)} ${clients === 1 ? 'client' : 'clients'} and ${formatNumber(stylists)} ${stylists === 1 ? 'stylist' : 'stylists'} joined${versus(clients + stylists, previous ? before(0)! + before(1)! : null)}`;
    }
    case 'booking-times': {
      const busiest = [...rows].sort((a, b) => b.values[0] - a.values[0])[0];
      if (!busiest || busiest.y === undefined) return 'No appointments in this period';
      return `Busiest: ${DAYS[busiest.y]} around ${String(busiest.x).padStart(2, '0')}:00`;
    }
    case 'areas': {
      const gaps = rows.filter(row => row.values[0] > 0 && row.values[1] === 0);
      if (!rows.length) return 'Not enough areas yet';
      return gaps.length
        ? `${gaps.length} ${gaps.length === 1 ? 'area has' : 'areas have'} clients but no stylists: ${gaps
            .slice(0, 2)
            .map(row => row.label)
            .join(', ')}`
        : 'Every busy area has at least one stylist';
    }
    case 'empty-searches':
      return rows.length
        ? `“${rows[0].label}” is the top search that found nothing`
        : 'Every search found something';
    case 'retention': {
      const second = rows.filter(row => row.x === 1);
      if (!second.length) return 'Not enough weeks yet to see who comes back';
      const average = second.reduce((total, row) => total + row.values[0], 0) / second.length;
      return `${Math.round(average)}% come back in their second week`;
    }
    case 'top-stylists':
      return rows.length
        ? `${rows[0].label} leads with ${formatNumber(rows[0].values[0])} finished bookings`
        : 'No finished bookings in this period';
    case 'community': {
      const looks = sum(rows, 0);
      const hours = meta.medianResolutionHours;
      return `${formatNumber(looks)} ${looks === 1 ? 'look' : 'looks'} posted${typeof hours === 'number' ? `; reports resolved in ${hours < 1 ? 'under an hour' : `${Math.round(hours)} h`} on average` : ''}`;
    }
    case 'area-suggestions': {
      const searches = sum(rows, 0);
      if (!searches) return 'No area searches in this period';
      const missed = sum(rows, 1) + sum(rows, 2);
      return missed
        ? `${Math.round((100 * missed) / searches)}% of area searches found nothing or failed`
        : `Every one of ${formatNumber(searches)} area searches found somewhere`;
    }
    case 'app-health': {
      const total = rows.reduce((all, row) => all + row.values.reduce((a, b) => a + b, 0), 0);
      return total
        ? `${formatNumber(total)} ${total === 1 ? 'error' : 'errors'} in this period`
        : 'No errors in this period';
    }
    case 'hair-trends':
      return rows.length
        ? `${rows[0].label.split(' · ')[0]} is the most booked style in a group big enough to show`
        : `Not enough bookings yet to show trends: every group needs ${meta.minGroup ?? 20} or more`;
    default:
      return insight.title;
  }
}
