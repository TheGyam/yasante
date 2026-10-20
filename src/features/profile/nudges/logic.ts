import { differenceInCalendarDays } from 'date-fns';
import type { Booking } from '@/features/booking';
import type { HairLogEntry } from '../hairLog';
import type { HairProfile } from '../types';

/**
 * The questions the app asks now and then, so what it knows about someone's hair
 * stays true without a form: is the style still in, has it grown, when was the last
 * trim, how does water sit on it. Each is asked only when a change is likely, at
 * most one every few days, and never on someone's first day.
 */
export type NudgeKind = 'take_down' | 'length' | 'porosity' | 'trim' | 'wash';

export type Nudge =
  | { kind: 'take_down'; booking: Booking }
  | { kind: 'length'; afterTakeDown: boolean }
  | { kind: 'porosity' }
  | { kind: 'trim' }
  | { kind: 'wash'; lastWash: string };

export interface NudgeMemory {
  /** When the app first ran with an account, so day one stays quiet. */
  firstSeenAt?: string;
  lastShownAt?: string;
  /** Not now: asked again after this. */
  snoozedUntil: Partial<Record<NudgeKind, string>>;
  /** Don't ask me this. */
  off: NudgeKind[];
}

/** Roughly how long a style stays in, in days, before it's likely to come out. */
const LASTS: Record<string, number | null> = {
  knotless: 42,
  'box-braids': 49,
  boho: 42,
  'feed-in': 14,
  cornrows: 14,
  twists: 35,
  'faux-locs': 56,
  'bantu-knots': 7,
  'silk-press': 10,
  'wash-and-go': 5,
  'wig-install': 28,
  // Locs don't come out.
  locs: null,
};

export const QUIET_DAYS = 3;
const FIRST_DAY_QUIET = 1;
const LENGTH_EVERY = 56;
const TRIM_EVERY = 70;

export function lastsFor(booking: Pick<Booking, 'styles'>) {
  const known = (booking.styles ?? []).map(s => LASTS[s]).filter(v => v !== undefined);
  if (known.includes(null)) return null;
  return (known as number[])[0] ?? 35;
}

const days = (now: Date, iso?: string | null) =>
  iso ? differenceInCalendarDays(now, new Date(iso)) : Infinity;

export function nextNudge({
  now = new Date(),
  memory,
  bookings,
  log,
  hair,
  hairAllowed = false,
}: {
  now?: Date;
  memory: NudgeMemory;
  bookings: Booking[];
  log: HairLogEntry[];
  hair?: HairProfile;
  /** Her yes to using hair details: length and porosity are saved to her hair profile. */
  hairAllowed?: boolean;
}): Nudge | null {
  if (days(now, memory.firstSeenAt) < FIRST_DAY_QUIET) return null;
  if (days(now, memory.lastShownAt) < QUIET_DAYS) return null;
  const may = (kind: NudgeKind) => {
    const until = memory.snoozedUntil[kind];
    return !memory.off.includes(kind) && (!until || new Date(until) <= now);
  };

  // 1. The style from their last appointment, once it's probably due out.
  const takenDown = new Set(log.filter(e => e.kind === 'take_down').map(e => e.bookingId));
  const lastTakeDown = log.find(e => e.kind === 'take_down');
  const style = bookings
    .filter(b => b.status === 'completed' && b.scheduledFor && !takenDown.has(b.id))
    .sort((a, b) => (b.scheduledFor! > a.scheduledFor! ? 1 : -1))[0];
  if (style && may('take_down')) {
    const lasts = lastsFor(style);
    const since = days(now, style.scheduledFor);
    const outSince = lastTakeDown && new Date(lastTakeDown.at) > new Date(style.scheduledFor!);
    if (lasts && !outSince && since >= lasts - 3 && since <= lasts + 60) {
      return { kind: 'take_down', booking: style };
    }
  }

  // 2. Length: right after a style comes out (the best moment to see it), or when
  // it's been a couple of months.
  if (hairAllowed && hair?.length && may('length')) {
    const measured = days(now, hair.lengthMeasuredAt);
    const justOut = days(now, lastTakeDown?.at) <= 3 && measured > 3;
    if (justOut || measured >= LENGTH_EVERY) return { kind: 'length', afterTakeDown: justOut };
  }

  // 3. Porosity, in plain words, once they've settled in.
  if (hairAllowed && hair && !hair.porosity && may('porosity')) return { kind: 'porosity' };

  // 4. A trim every couple of months or so.
  const lastTrim = log.find(e => e.kind === 'trim');
  if (hair && may('trim') && days(now, lastTrim?.at ?? memory.firstSeenAt) >= TRIM_EVERY) {
    return { kind: 'trim' };
  }

  // 5. Wash day: only for people who log them, and only once it's later than usual.
  const washes = log.filter(e => e.kind === 'wash');
  if (washes.length >= 2 && may('wash')) {
    const gaps = washes
      .slice(0, 6)
      .map((w, i) => (washes[i + 1] ? days(new Date(w.at), washes[i + 1].at) : null))
      .filter((g): g is number => g !== null && g > 0);
    const usual = gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : 7;
    if (days(now, washes[0].at) >= usual + 2) return { kind: 'wash', lastWash: washes[0].at };
  }

  return null;
}
