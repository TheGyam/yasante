/**
 * How her page is worded: the same sentences as the app's stylist page
 * (src/features/stylist/format.ts at the repo root), so she reads the same everywhere.
 */
import { formatMoney } from '@/shared/lib/format';
import type { Availability, MenuItem, PublicProfile } from './types';

/** "Usually replies within an hour" — rounded the way a person would say it. */
export function replyLabel(hours?: number) {
  if (hours === undefined) return undefined;
  if (hours <= 1) return 'Usually replies within an hour';
  if (hours <= 6) return 'Usually replies within a few hours';
  if (hours <= 24) return 'Usually replies within a day';
  return 'Usually replies within two days';
}

const TIMING_WORDS = { early: 'finishes early', on_time: 'finishes on time', over: 'runs over' };

/** "Usually finishes on time · 8 of 10 appointments". The sample size is always shown. */
export function timingLabelText(label?: {
  outcome: keyof typeof TIMING_WORDS;
  count: number;
  sample: number;
}) {
  if (!label) return undefined;
  return `Usually ${TIMING_WORDS[label.outcome]} · ${label.count} of ${label.sample} appointments`;
}

/** Every badge says exactly what was checked — never a generic "verified". */
export const VERIFICATION_LABELS: Record<PublicProfile['verificationTier'], string> = {
  0: 'Not checked yet',
  1: 'Phone and work checked',
  2: 'Met by Yasante',
};

/** "4 hrs", "3 hrs 30 mins", "45 mins" — how she says it, not 210. */
export function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest} mins`;
  const spoken = `${hours} ${hours === 1 ? 'hr' : 'hrs'}`;
  return rest ? `${spoken} ${rest} mins` : spoken;
}

/** "£120" or "from £120". Never a range: the low end plus "from" is what clients read. */
export function formatPrice(item: Pick<MenuItem, 'price' | 'fromPrice'>) {
  return item.fromPrice ? `from ${formatMoney(item.price)}` : formatMoney(item.price);
}

/** The line under a service: how long, what it's priced by, what's included. */
export function serviceDetails(item: MenuItem) {
  const groups = [...new Set(item.options.map(option => option.group))];
  return (
    [
      item.durationMinutes ? formatDuration(item.durationMinutes) : item.note,
      groups.length ? `priced by ${groups.join(' and ')}` : undefined,
      item.hairIncluded ? 'hair included' : undefined,
    ]
      .filter(Boolean)
      .join(' · ') || undefined
  );
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "Tue–Sat, 09:00–18:00" or "Mon, Wed, Fri" — how her week reads at a glance. */
export function hoursLabel(availability?: Availability) {
  if (!availability) return undefined;
  // Monday first, the way people say a week.
  const order = [1, 2, 3, 4, 5, 6, 0];
  const open = order.filter(d => availability.week[d]);
  if (!open.length) return 'Not taking bookings at the moment';
  const runs: number[][] = [];
  for (const day of open) {
    const run = runs[runs.length - 1];
    if (run && order.indexOf(day) === order.indexOf(run[run.length - 1]) + 1) run.push(day);
    else runs.push([day]);
  }
  const days = runs
    .map(r =>
      r.length > 2
        ? `${DAY_NAMES[r[0]]}–${DAY_NAMES[r[r.length - 1]]}`
        : r.map(d => DAY_NAMES[d]).join(', ')
    )
    .join(', ');
  const hours = open.map(d => availability.week[d]!);
  const same = hours.every(h => h.start === hours[0].start && h.end === hours[0].end);
  return same ? `${days}, ${hours[0].start}–${hours[0].end}` : days;
}

/** Where she works: "Travels up to 5 miles", or why the address isn't shown. */
export function whereLabel(profile: Pick<PublicProfile, 'serviceModels' | 'travelRadiusMiles'>) {
  return profile.serviceModels.includes('mobile') && profile.travelRadiusMiles
    ? `Travels up to ${profile.travelRadiusMiles} miles`
    : 'District only — the address comes with a confirmed booking';
}

export function depositLabel(policies: PublicProfile['policies']) {
  if (policies.depositType === 'none') return 'No deposit';
  if (policies.depositType === 'percent') return `${policies.depositAmount}% deposit`;
  return `${formatMoney(policies.depositAmount ?? 0)} deposit`;
}
