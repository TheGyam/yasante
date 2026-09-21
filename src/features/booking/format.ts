import { differenceInHours, format, isToday, isTomorrow } from 'date-fns';
import type { Booking, BookingStatus, ClientRecord } from './types';

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

/** "Today", "Tomorrow", "Sat 26 Sep" — a day, before there's a time on it. */
export function dayLabel(iso: string) {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return '';
  if (isToday(at)) return 'Today';
  if (isTomorrow(at)) return 'Tomorrow';
  return format(at, 'EEE d MMM');
}

/** "Today, 14:00", "Tomorrow, 09:30", "Sat 26 Sep, 14:00" */
export function whenLabel(iso: string) {
  const at = new Date(iso);
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
