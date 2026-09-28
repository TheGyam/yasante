import type { Booking } from './types';

/**
 * Appointment times read on the stylist's clock (the booking's `timeZone`), marked
 * "UK time" or wherever when that isn't this computer's — as the app does
 * (src/shared/lib/timeZone.ts at the repo root). No zone: the computer's own.
 */
const here = (() => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
})();
const NAMES: Record<string, string> = {
  'Europe/London': 'UK time',
  'Europe/Dublin': 'Irish time',
  'Africa/Accra': 'Ghana time',
  'Africa/Lagos': 'Nigeria time',
};
/** " UK time" when the zone isn't this computer's, or "". */
export function zoneMark(zone?: string) {
  if (!zone || !here || zone === here) return '';
  return ` ${NAMES[zone] ?? `${zone.split('/').pop()!.replace(/_/g, ' ')} time`}`;
}

const formatters = new Map<string, Intl.DateTimeFormat>();
function parts(date: Date, zone?: string) {
  const key = zone ?? '';
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat('en-GB', {
      ...(zone && { timeZone: zone }),
      weekday: 'short',
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    formatters.set(key, f);
  }
  const p = Object.fromEntries(f.formatToParts(date).map(x => [x.type, x.value]));
  return { ...p, key: `${p.year}-${p.month}-${p.day}` } as Record<string, string>;
}
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Today, 10:00", "Tomorrow, 14:30", "Sat 4 Oct, 09:00" — as the app says when. */
export function whenLabel(iso: string, zone?: string, now = new Date()) {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return '';
  const p = parts(at, zone);
  const time = `${p.hour}:${p.minute}${zoneMark(zone)}`;
  if (p.key === parts(now, zone).key) return `Today, ${time}`;
  if (p.key === parts(new Date(now.getTime() + 86_400_000), zone).key) return `Tomorrow, ${time}`;
  return `${p.weekday} ${p.day} ${MONTHS[Number(p.month) - 1]}, ${time}`;
}

/** A time as a datetime-local field shows it, on that zone's clock: "2026-10-04T10:00". */
export function toSalonInput(iso: string | Date, zone?: string) {
  const p = parts(new Date(iso), zone);
  return `${p.year}-${p.month.padStart(2, '0')}-${p.day.padStart(2, '0')}T${p.hour}:${p.minute}`;
}

/** What she typed in a datetime-local field, read on that zone's clock, as an instant. */
export function fromSalonInput(value: string, zone?: string) {
  // Read it as UTC first, then correct by however far the zone is from UTC then.
  const guess = new Date(`${value}:00Z`);
  const shownAs = new Date(`${toSalonInput(guess, zone)}:00Z`);
  return new Date(guess.getTime() - (shownAs.getTime() - guess.getTime())).toISOString();
}

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

/** The deposit she'd ask for this booking, from her own rules. */
export function suggestedDeposit(booking: Booking) {
  const { depositType, depositAmount } = booking.policy;
  if (depositType === 'fixed' && depositAmount) return depositAmount;
  if (depositType === 'percent' && depositAmount)
    return Math.round((booking.price * depositAmount) / 100);
  return 0;
}
