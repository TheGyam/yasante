import { addDays, differenceInCalendarDays, format, startOfDay } from 'date-fns';
import type { CarePlan, CarePlanFrequency, TimeOfDay } from './types';

export const FREQUENCY_LABELS: Record<CarePlanFrequency, string> = {
  daily: 'Every day',
  'every-2-days': 'Every 2 days',
  weekly: 'Every week',
  'specific-days': 'Certain days',
};

export const TIME_OF_DAY_LABELS: Record<TimeOfDay, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  night: 'Night',
};

export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "Every week · Evening" */
export function describePlan(plan: Pick<CarePlan, 'frequency' | 'specificDays' | 'timeOfDay'>) {
  const often =
    plan.frequency === 'specific-days' && plan.specificDays?.length
      ? [...plan.specificDays]
          .sort()
          .map(day => DAY_LABELS[day])
          .join(', ')
      : FREQUENCY_LABELS[plan.frequency];
  return `${often} · ${TIME_OF_DAY_LABELS[plan.timeOfDay]}`;
}

/** The day it's next due. A plan never done is due today. */
export function nextDue(
  plan: Pick<CarePlan, 'frequency' | 'specificDays' | 'lastDoneAt'>,
  now = new Date()
): Date {
  const today = startOfDay(now);
  if (!plan.lastDoneAt) return today;

  const last = startOfDay(new Date(plan.lastDoneAt));
  if (Number.isNaN(last.getTime())) return today;

  if (plan.frequency === 'specific-days') {
    const days = plan.specificDays ?? [];
    if (!days.length) return today;
    // The next chosen weekday after the last time it was done.
    for (let step = 1; step <= 7; step++) {
      const day = addDays(last, step);
      if (days.includes(day.getDay())) return day;
    }
    return today;
  }

  const gap = plan.frequency === 'daily' ? 1 : plan.frequency === 'every-2-days' ? 2 : 7;
  return addDays(last, gap);
}

/** "Due today", "Due tomorrow", "Due Friday", "2 days late". */
export function dueLabel(
  plan: Pick<CarePlan, 'frequency' | 'specificDays' | 'lastDoneAt'>,
  now = new Date()
) {
  const days = differenceInCalendarDays(nextDue(plan, now), startOfDay(now));
  if (days < 0) return `${Math.abs(days)} ${Math.abs(days) === 1 ? 'day' : 'days'} late`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  if (days < 7) return `Due ${format(nextDue(plan, now), 'EEEE')}`;
  return `Due ${format(nextDue(plan, now), 'd MMM')}`;
}

// Links carry only an id. Everything else is fetched, so nothing private rides in a URL.
const LINK = /^yasante:\/\/(collection|care-plan)\/([^/?#]+)/;

export function parsePlannerLink(
  url: string
): { kind: 'collection' | 'care-plan'; id: string } | null {
  const match = LINK.exec(url);
  if (!match) return null;
  return { kind: match[1] as 'collection' | 'care-plan', id: decodeURIComponent(match[2]) };
}
