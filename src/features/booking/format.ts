import { differenceInHours, format, isToday, isTomorrow } from 'date-fns';
import { formatMoney } from '@/shared/lib/format';
import { wallTime, zoneMark } from '@/shared/lib/timeZone';
import {
  TIMING_BUCKETS,
  TIMING_REASONS,
  type Booking,
  type BookingStatus,
  type BookingTiming,
  type ClientRecord,
  type TimingOutcome,
} from './types';

/**
 * What each state means to the person reading it. Written from the client's side —
 * the stylist's inbox says what she has to do instead.
 */
export const STATUS_LABELS: Record<BookingStatus, string> = {
  requested: 'Waiting for them to reply',
  awaiting_deposit: 'Send the deposit to confirm',
  confirmed: 'Confirmed',
  completed: 'Done',
  declined: 'They couldn’t take it',
  expired: 'No reply in time',
  cancelled_in_time: 'Cancelled',
  cancelled_late: 'Cancelled late',
  cancelled_by_stylist: 'They had to cancel',
  no_show: 'Marked as a no-show',
};

/** The states where something is still going to happen. */
const LIVE: BookingStatus[] = ['requested', 'awaiting_deposit', 'confirmed'];
export const isLive = (booking: Pick<Booking, 'status'>) => LIVE.includes(booking.status);

/** The moment on the stylist's clock (see wallTime); no zone, the phone's own. */
export const salonTime = (iso: string | Date, zone?: string) => wallTime(iso, zone);

/** "Today", "Tomorrow", "Sat 26 Sep" — a day, before there's a time on it. */
export function dayLabel(iso: string, zone?: string) {
  const at = wallTime(iso, zone);
  if (Number.isNaN(at.getTime())) return '';
  if (isToday(at)) return 'Today';
  if (isTomorrow(at)) return 'Tomorrow';
  return format(at, 'EEE d MMM');
}

/**
 * "Today, 14:00", "Sat 26 Sep, 14:00". Given the stylist's zone, it's her clock,
 * marked "UK time" (or wherever) when that isn't this phone's.
 */
export function whenLabel(iso: string, zone?: string) {
  const at = wallTime(iso, zone);
  if (Number.isNaN(at.getTime())) return '';
  const time = format(at, 'HH:mm') + zoneMark(zone);
  if (isToday(at)) return `Today, ${time}`;
  if (isTomorrow(at)) return `Tomorrow, ${time}`;
  return `${format(at, 'EEE d MMM')}, ${time}`;
}

/**
 * Whether cancelling now counts against her. The server decides for real; this is
 * so she can be told before she taps, not after.
 */
export function cancellingIsLate(
  booking: Pick<Booking, 'scheduledFor' | 'policy'>,
  now = new Date()
) {
  if (!booking.scheduledFor) return false;
  const at = new Date(booking.scheduledFor);
  if (Number.isNaN(at.getTime())) return false;
  return differenceInHours(at, now) < booking.policy.noticeHours;
}

/** "3 styles, never missed one" — a record a stylist can read in a glance. */
export function recordLabel(record?: ClientRecord) {
  if (!record) return undefined;
  const { attended, noShows, lateCancellations } = record;
  if (!attended && !noShows && !lateCancellations) return 'First booking on Yasante';

  const styles = `${attended} ${attended === 1 ? 'style' : 'styles'}`;
  if (!noShows && !lateCancellations) return `${styles}, never missed one`;

  const misses = [
    noShows && `${noShows} no-${noShows === 1 ? 'show' : 'shows'}`,
    lateCancellations &&
      `${lateCancellations} late ${lateCancellations === 1 ? 'cancellation' : 'cancellations'}`,
  ].filter(Boolean);
  return `${styles} · ${misses.join(', ')}`;
}

/**
 * Whether to ask "Still coming?": a confirmed booking in the next two days that
 * she hasn't answered for. The server's reminder asks at 24 hours; the app asks
 * from the moment it's close enough to matter.
 */
export function needsAttendance(
  booking: Pick<Booking, 'status' | 'scheduledFor' | 'attendanceConfirmedAt'>,
  now = new Date()
) {
  if (booking.status !== 'confirmed' || !booking.scheduledFor || booking.attendanceConfirmedAt) {
    return false;
  }
  const hours = differenceInHours(new Date(booking.scheduledFor), now);
  return hours >= 0 && hours <= 48;
}

const OUTCOME_WORDS: Record<TimingOutcome, string> = {
  early: 'Finished early',
  on_time: 'Finished on time',
  over: 'Ran over',
};

/** "Ran over by 30–60 min · Client arrived late" */
export function timingText(timing?: BookingTiming) {
  if (!timing) return undefined;
  const bucket = TIMING_BUCKETS.find(b => b.value === timing.bucket)?.label.toLowerCase();
  const reason = TIMING_REASONS.find(r => r.value === timing.reason)?.label;
  return [
    bucket ? `${OUTCOME_WORDS[timing.outcome]} by ${bucket}` : OUTCOME_WORDS[timing.outcome],
    reason,
  ]
    .filter(Boolean)
    .join(' · ');
}

/** Whether a timing record puts the delay on the client, which is what she may contest. */
export const blamesClient = (timing?: BookingTiming) =>
  TIMING_REASONS.find(r => r.value === timing?.reason)?.side === 'client';

/** The buttons on the day-before reminder. The server sends it under this category. */
export const ATTENDANCE_CATEGORY = {
  id: 'attendance',
  actions: [
    { id: 'coming', title: 'Yes, I’m coming' },
    { id: 'cant', title: 'I can’t make it' },
  ],
};

/** "tomorrow, 14:00" inside a sentence; "Sat 26 Sep, 14:00" stays as it is. */
export const inSentence = (label: string) =>
  label.replace(/^(Today|Tomorrow)/, word => word.toLowerCase());

/** "Knotless braids · Waist · Small" — the service as she chose it. */
export const serviceLine = (booking: Pick<Booking, 'serviceName' | 'optionLabels'>) =>
  [booking.serviceName, ...(booking.optionLabels ?? [])].join(' · ');

const icsTime = (date: Date) =>
  date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');

/**
 * A link that adds the appointment to her calendar. The server's own .ics link
 * when it sends one (it opens straight into Apple Calendar); otherwise Google's.
 */
export function calendarLink(booking: Booking) {
  if (booking.calendarUrl) return booking.calendarUrl;
  if (!booking.scheduledFor) return undefined;
  const start = new Date(booking.scheduledFor);
  const end = new Date(start.getTime() + (booking.durationMinutes ?? 120) * 60_000);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${serviceLine(booking)} with ${booking.stylistName}`,
    dates: `${icsTime(start)}/${icsTime(end)}`,
    details: 'Booked on Yasante',
    location: booking.address ?? booking.area,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * What's left to pay on the day once the deposit is in, in words ("£45 left to pay on the
 * day"), or undefined when there's no deposit or nothing left.
 */
export function balanceLine(booking: Pick<Booking, 'price' | 'fromPrice' | 'deposit'>) {
  const left = booking.deposit ? booking.price - booking.deposit.amount : 0;
  if (left <= 0) return undefined;
  const paid = booking.deposit!.status === 'received';
  return `${booking.fromPrice ? 'From ' : ''}${formatMoney(left)} left to pay on the day${paid ? '' : ', after the deposit'}`;
}

/** Directions in the phone's own maps app. */
export function directionsLink(address: string, platform: string) {
  const q = encodeURIComponent(address);
  return platform === 'ios'
    ? `http://maps.apple.com/?daddr=${q}`
    : `https://www.google.com/maps/dir/?api=1&destination=${q}`;
}

export interface PrepItem {
  id: string;
  text: string;
}

/** What to do before the day, from what she booked. Prep a stylist can't do for her. */
export function prepList(booking: Pick<Booking, 'bringingOwnHair' | 'hairIncluded'>): PrepItem[] {
  return [
    { id: 'takedown', text: 'Take out your old style, unless they’re doing it' },
    { id: 'wash', text: 'Wash and detangle the day before' },
    { id: 'dry', text: 'Come with it dry and stretched, no heavy product' },
    ...(booking.bringingOwnHair || booking.hairIncluded === false
      ? [{ id: 'hair', text: 'Buy the braiding hair — ask them how many packs' }]
      : []),
    { id: 'time', text: 'Clear the time — a long style can run over' },
  ];
}
