import { addDays, addMonths, endOfMonth, format, getDay, startOfMonth } from 'date-fns';
import type { FreeSlots } from './types';

/**
 * The calendar behind the time picker. Days are yyyy-MM-dd on the stylist's calendar
 * (where the appointment is), so nothing here depends on the phone's own zone.
 */

/** Noon on a day: far enough from midnight that a clock change never moves the date. */
export const atNoon = (day: string) => new Date(`${day}T12:00:00`);
export const dayKey = (date: Date) => format(date, 'yyyy-MM-dd');
export const shiftDay = (day: string, by: number) => dayKey(addDays(atNoon(day), by));
export const monthOf = (day: string) => day.slice(0, 7);
export const shiftMonth = (month: string, by: number) =>
  format(addMonths(atNoon(`${month}-01`), by), 'yyyy-MM');
export const isWeekend = (day: string) => [0, 6].includes(getDay(atNoon(day)));

/** The first and last day of a month, as the free times are asked for. */
export function monthSpan(month: string) {
  const first = atNoon(`${month}-01`);
  return { from: dayKey(startOfMonth(first)), to: dayKey(endOfMonth(first)) };
}

/** A month as weeks, Monday first; null pads the weeks either side of it. */
export function monthWeeks(month: string): (string | null)[][] {
  const { from, to } = monthSpan(month);
  const lead = (getDay(atNoon(from)) + 6) % 7;
  const cells: (string | null)[] = Array(lead).fill(null);
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

/** The days just before an occasion, nearest first. */
export const daysBefore = (event: string) =>
  Array.from({ length: READY_DAYS }, (_, i) => shiftDay(event, -(i + 1)));

/**
 * The best time to have it done for an occasion: the closest day before it with a
 * time free (fresh on the day), at the first time that day.
 */
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
