import { SEP } from '@/shared/lib/format';
import type { SharedCarePlan } from './types';

const OFTEN = {
  daily: 'Every day',
  'every-2-days': 'Every 2 days',
  weekly: 'Every week',
  'specific-days': 'Certain days',
} as const;
const WHEN = { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', night: 'Night' };
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "Every week · Evening", as the app says it. */
export function describePlan(
  plan: Pick<SharedCarePlan, 'frequency' | 'specificDays' | 'timeOfDay'>
) {
  const often =
    plan.frequency === 'specific-days' && plan.specificDays?.length
      ? [...plan.specificDays]
          .sort()
          .map(day => DAYS[day])
          .join(', ')
      : OFTEN[plan.frequency];
  return `${often}${SEP}${WHEN[plan.timeOfDay]}`;
}

const relative = new Intl.RelativeTimeFormat('en-GB', { numeric: 'auto' });
const STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 86400],
  ['month', 30 * 86400],
  ['week', 7 * 86400],
  ['day', 86400],
  ['hour', 3600],
  ['minute', 60],
];

/** "Updated 2 days ago", "Updated yesterday", "Updated just now". */
export function updatedLabel(iso: string, now = Date.now()) {
  const seconds = (new Date(iso).getTime() - now) / 1000;
  for (const [unit, size] of STEPS) {
    if (Math.abs(seconds) >= size) {
      return `Updated ${relative.format(Math.round(seconds / size), unit)}`;
    }
  }
  return 'Updated just now';
}
