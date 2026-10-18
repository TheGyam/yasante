import { toSalonInput } from '@/shared/lib/salonTime';
import type { Booking } from './types';

// The stylist's clock lives in shared/lib, where her studio screens read it too.
export { fromSalonInput, toSalonInput, whenLabel, zoneMark } from '@/shared/lib/salonTime';

/** "Today, 10:00" → "today at 10:00", "Sun 27 Sep, 21:35" → "Sun 27 Sep at 21:35". */
export function inSentence(label: string) {
  return label.replace(/^(Today|Tomorrow)/, m => m.toLowerCase()).replace(/, ([^,]*)$/, ' at $1');
}

/** A client's record in a line, as the app says it (src/features/booking/format.ts). */
export function recordLabel(record?: Booking['clientRecord']) {
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

/** Where a booking is up to, for her. */
export const STATUS_LABELS: Record<Booking['status'], string> = {
  requested: 'Waiting for your answer',
  awaiting_deposit: 'Waiting for the deposit',
  confirmed: 'Confirmed',
  completed: 'Done',
  declined: 'You declined',
  expired: 'Lapsed',
  cancelled_in_time: 'Cancelled in time',
  cancelled_late: 'Cancelled late',
  cancelled_by_stylist: 'You cancelled',
  no_show: 'Didn’t turn up',
};

/** Where a booking is up to, told to the client: "they" is the stylist. As the app says it. */
export const CLIENT_STATUS_LABELS: Record<Booking['status'], string> = {
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
export const isLive = (booking: Pick<Booking, 'status'>) =>
  ['requested', 'awaiting_deposit', 'confirmed'].includes(booking.status);

/** A free time on the stylist's clock: its day ("2026-10-04"), "10:00", and the hour. */
export function slotParts(iso: string, zone?: string) {
  const [day, time] = toSalonInput(iso, zone).split('T');
  return { day, time, hour: Number(time.slice(0, 2)) };
}

/** Whether cancelling now counts as late: inside her notice window. The server decides. */
export function cancellingIsLate(
  booking: Pick<Booking, 'scheduledFor' | 'policy'>,
  now = new Date()
) {
  if (!booking.scheduledFor) return false;
  const hours = (new Date(booking.scheduledFor).getTime() - now.getTime()) / 3_600_000;
  return hours < booking.policy.noticeHours;
}

/** The deposit she'd ask for this booking, from her own rules. */
export function suggestedDeposit(booking: Booking) {
  const { depositType, depositAmount } = booking.policy;
  if (depositType === 'fixed' && depositAmount) return depositAmount;
  if (depositType === 'percent' && depositAmount)
    return Math.round((booking.price * depositAmount) / 100);
  return 0;
}

/**
 * When the stylist has to answer by: 48 hours from now, but never later than 2 hours
 * before the time asked for. The server sets the real deadline; this says it beforehand.
 */
export function replyBy(time: string, now = new Date()) {
  const lapse = now.getTime() + 48 * 3_600_000;
  const before = new Date(time).getTime() - 2 * 3_600_000;
  return new Date(before > now.getTime() ? Math.min(lapse, before) : new Date(time).getTime());
}
