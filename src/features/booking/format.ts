import { differenceInHours, format, isToday, isTomorrow } from 'date-fns';
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
  requested: 'Waiting for her to reply',
  awaiting_deposit: 'Send the deposit to confirm',
  confirmed: 'Confirmed',
  completed: 'Done',
  declined: 'She couldn’t take it',
  expired: 'No reply in time',
  cancelled_in_time: 'Cancelled',
  cancelled_late: 'Cancelled late',
  cancelled_by_stylist: 'She had to cancel',
  no_show: 'Marked as a no-show',
};

/** The states where something is still going to happen. */
const LIVE: BookingStatus[] = ['requested', 'awaiting_deposit', 'confirmed'];
export const isLive = (booking: Pick<Booking, 'status'>) => LIVE.includes(booking.status);

/** Where the appointments happen: times are shown as the stylist's clock reads them. */
export const SALON_TIME_ZONE = 'Europe/London';

const salonParts = new Intl.DateTimeFormat('en-GB', {
  timeZone: SALON_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

/**
 * The moment as London's clock shows it, as a Date whose local fields read that way,
 * so ordinary formatting prints salon time. A phone set to Berlin still sees the
 * 10:30 she'll walk in at, the same time the notifications say.
 */
export function salonTime(iso: string | Date) {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return at;
  try {
    const p = Object.fromEntries(salonParts.formatToParts(at).map(x => [x.type, x.value]));
    return new Date(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  } catch {
    return at;
  }
}

/** "Today", "Tomorrow", "Sat 26 Sep" — a day, before there's a time on it. */
export function dayLabel(iso: string) {
  const at = salonTime(iso);
  if (Number.isNaN(at.getTime())) return '';
  if (isToday(at)) return 'Today';
  if (isTomorrow(at)) return 'Tomorrow';
  return format(at, 'EEE d MMM');
}

/** "Today, 14:00", "Tomorrow, 09:30", "Sat 26 Sep, 14:00" */
export function whenLabel(iso: string) {
  const at = salonTime(iso);
  if (Number.isNaN(at.getTime())) return '';
  const time = format(at, 'HH:mm');
  if (isToday(at)) return `Today, ${time}`;
  if (isTomorrow(at)) return `Tomorrow, ${time}`;
  return format(at, `EEE d MMM, '${time}'`).replace(`'${time}'`, time);
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
    { id: 'takedown', text: 'Take out your old style, unless she’s doing it' },
    { id: 'wash', text: 'Wash and detangle the day before' },
    { id: 'dry', text: 'Come with it dry and stretched, no heavy product' },
    ...(booking.bringingOwnHair || booking.hairIncluded === false
      ? [{ id: 'hair', text: 'Buy the braiding hair — ask her how many packs' }]
      : []),
    { id: 'time', text: 'Clear the time — a long style can run over' },
  ];
}
