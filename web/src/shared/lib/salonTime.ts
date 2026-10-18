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
