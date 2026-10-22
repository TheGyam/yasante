import { addDays, differenceInCalendarDays, format, startOfDay } from 'date-fns';
import type { CarePlan, CarePlanFrequency, TimeOfDay } from './types';
import { SEP } from '@/shared/lib/format';

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
/** The days as a week is read in the UK and Ghana: Monday first. Values stay 0 = Sunday. */
export const WEEK = [1, 2, 3, 4, 5, 6, 0];
const weekOrder = (a: number, b: number) => WEEK.indexOf(a) - WEEK.indexOf(b);

/**
 * "6 tagging along · 2 made it theirs", leaving out what's still nought; nothing at all
 * for a link nobody has used yet.
 */
export function shareCounts(followers = 0, madeItTheirs = 0) {
  return [
    followers > 0 && `${followers} tagging along`,
    madeItTheirs > 0 && `${madeItTheirs} made it theirs`,
  ]
    .filter(Boolean)
    .join(SEP);
}

/** "Every week · Evening" */
export function describePlan(plan: Pick<CarePlan, 'frequency' | 'specificDays' | 'timeOfDay'>) {
  const often =
    plan.frequency === 'specific-days' && plan.specificDays?.length
      ? [...plan.specificDays]
          .sort(weekOrder)
          .map(day => DAY_LABELS[day])
          .join(', ')
      : FREQUENCY_LABELS[plan.frequency];
  return `${often}${SEP}${TIME_OF_DAY_LABELS[plan.timeOfDay]}`;
}

/** The day it's next due. A plan never done is due today, or on the first of her days. */
export function nextDue(
  plan: Pick<CarePlan, 'frequency' | 'specificDays' | 'lastDoneAt'>,
  now = new Date()
): Date {
  const today = startOfDay(now);
  const days = plan.frequency === 'specific-days' ? (plan.specificDays ?? []) : [];
  // The first chosen weekday from `from` on.
  const nextChosen = (from: Date) => {
    for (let step = 0; step < 7; step++) {
      const day = addDays(from, step);
      if (days.includes(day.getDay())) return day;
    }
    return today;
  };
  const last = plan.lastDoneAt ? startOfDay(new Date(plan.lastDoneAt)) : undefined;
  // Never done: today, or the first of her days from today.
  if (!last || Number.isNaN(last.getTime())) return days.length ? nextChosen(today) : today;

  if (plan.frequency === 'specific-days') {
    // The next chosen weekday after the last time it was done.
    return days.length ? nextChosen(addDays(last, 1)) : today;
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

/** How many times a month the plan asks for: daily 30, weekly about 4. */
export function expectedPerMonth(plan: Pick<CarePlan, 'frequency' | 'specificDays'>) {
  if (plan.frequency === 'daily') return 30;
  if (plan.frequency === 'every-2-days') return 15;
  if (plan.frequency === 'weekly') return 30 / 7;
  return Math.max(1, (plan.specificDays?.length ?? 1) * (30 / 7));
}

/**
 * The last 30 days: how many times she followed it, and how that compares with what
 * the plan asks for (0 to 1). Kind by design: doing it more often than planned is 1.
 */
export function consistency(
  plan: Pick<CarePlan, 'frequency' | 'specificDays'>,
  sessions: { completedAt: string }[],
  now = new Date()
) {
  const since = addDays(startOfDay(now), -29).getTime();
  const done = sessions.filter(s => new Date(s.completedAt).getTime() >= since).length;
  return { done, share: Math.min(1, done / expectedPerMonth(plan)) };
}

/** The last `days` days, oldest first, each marked if she followed it that day. */
export function recentDays(sessions: { completedAt: string }[], days = 14, now = new Date()) {
  const followed = new Set(sessions.map(s => format(new Date(s.completedAt), 'yyyy-MM-dd')));
  return Array.from({ length: days }, (_, i) => {
    const day = addDays(startOfDay(now), i - days + 1);
    return { day, done: followed.has(format(day, 'yyyy-MM-dd')), today: i === days - 1 };
  });
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
