import type { FreeSlots } from './types';

/**
 * The calendar behind the time picker, as in the app (src/features/booking/picker.ts).
 * Days are yyyy-MM-dd on the stylist's calendar, worked out at noon UTC so no clock
 * change or reader's zone ever moves a date.
 */

const utc = (day: string) => new Date(`${day}T12:00:00Z`);
const key = (date: Date) => date.toISOString().slice(0, 10);

export const shiftDay = (day: string, by: number) => {
  const date = utc(day);
  date.setUTCDate(date.getUTCDate() + by);
  return key(date);
};
export const monthOf = (day: string) => day.slice(0, 7);
export const shiftMonth = (month: string, by: number) => {
  const date = utc(`${month}-01`);
  date.setUTCMonth(date.getUTCMonth() + by);
  return monthOf(key(date));
};
const weekday = (day: string) => utc(day).getUTCDay();
export const isWeekend = (day: string) => [0, 6].includes(weekday(day));

/** "Saturday 17 October", "Oct", or any other way of saying a day. */
export const sayDay = (day: string, options: Intl.DateTimeFormatOptions) =>
  utc(day).toLocaleDateString('en-GB', { timeZone: 'UTC', ...options });

export function monthSpan(month: string) {
  return { from: `${month}-01`, to: shiftDay(`${shiftMonth(month, 1)}-01`, -1) };
}

/** A month as weeks, Monday first; null pads the weeks either side of it. */
export function monthWeeks(month: string): (string | null)[][] {
  const { from, to } = monthSpan(month);
  const cells: (string | null)[] = Array((weekday(from) + 6) % 7).fill(null);
  for (let day = from; day <= to; day = shiftDay(day, 1)) cells.push(day);
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
}

/** A few left, when the server hasn't said: worth knowing before the last ones go. */
export const FEW = 3;

export type Room = 'plenty' | 'few' | 'full' | 'away' | 'none';

/**
 * How much room each day has, looked up once per answer: the server's word for a day
 * with times (plenty while at least half the times a job like this could start are
 * free), else full or away.
 */
export function roomIndex(slots?: FreeSlots) {
  const rooms = new Map<string, Room>();
  for (const day of slots?.full ?? []) rooms.set(day, 'full');
  for (const day of slots?.away ?? []) rooms.set(day, 'away');
  for (const day of slots?.days ?? [])
    rooms.set(day.date, day.room ?? (day.times.length <= FEW ? 'few' : 'plenty'));
  return rooms;
}

export const roomOn = (day: string, slots?: FreeSlots): Room => roomIndex(slots).get(day) ?? 'none';

export type DayFilter = 'any' | 'weekends' | 'weekdays';
export const passes = (day: string, filter: DayFilter) =>
  filter === 'any' || (filter === 'weekends') === isWeekend(day);

/** How many days before an occasion are worth having it done. */
export const READY_DAYS = 4;
export const daysBefore = (event: string) =>
  Array.from({ length: READY_DAYS }, (_, i) => shiftDay(event, -(i + 1)));

/** The closest day before an occasion with a time free, at its first time. */
export function readyBy(event: string, slots?: FreeSlots) {
  for (const day of daysBefore(event)) {
    const free = slots?.days.find(d => d.date === day);
    if (free?.times.length) return { day, time: free.times[0] };
  }
  return undefined;
}

/** The months a client can look at: this one through the one her last day falls in. */
export function reachableMonths(today: string, lastDate?: string) {
  const last = monthOf(lastDate ?? shiftDay(today, 83));
  const months = [monthOf(today)];
  while (months[months.length - 1] < last) months.push(shiftMonth(months[months.length - 1], 1));
  return months;
}
