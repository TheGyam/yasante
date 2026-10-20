import { subDays } from 'date-fns';
import type { Booking } from '@/features/booking';
import { nextNudge, type NudgeMemory } from '../logic';

const now = new Date('2026-10-20T10:00:00Z');
const ago = (d: number) => subDays(now, d).toISOString();
const settled: NudgeMemory = { firstSeenAt: ago(60), snoozedUntil: {}, off: [] };
const braids = {
  id: 'b1',
  status: 'completed',
  scheduledFor: ago(40),
  styles: ['knotless'],
  serviceName: 'Knotless braids',
  stylistName: 'Ama',
} as Booking;

const ask = (over: Partial<Parameters<typeof nextNudge>[0]> = {}) =>
  nextNudge({ now, memory: settled, bookings: [], log: [], hair: {}, hairAllowed: true, ...over });

it('stays quiet on day one and between questions', () => {
  expect(ask({ bookings: [braids], memory: { ...settled, firstSeenAt: ago(0) } })).toBeNull();
  expect(ask({ bookings: [braids], memory: { ...settled, lastShownAt: ago(1) } })).toBeNull();
});

it('asks if braids are still in once they are probably due out', () => {
  expect(ask({ bookings: [braids] })?.kind).toBe('take_down');
  expect(ask({ bookings: [{ ...braids, scheduledFor: ago(20) }] })?.kind).not.toBe('take_down');
  // Locs don't come out.
  expect(ask({ bookings: [{ ...braids, styles: ['locs'] }] })?.kind).not.toBe('take_down');
});

it('asks about length right after a take-down, when the hair is out', () => {
  const log = [{ id: 'l', kind: 'take_down', at: ago(1), bookingId: 'b1' }] as never;
  const next = ask({
    bookings: [braids],
    log,
    hair: { length: 'shoulder', lengthMeasuredAt: ago(20), porosity: 'low' },
  });
  expect(next).toEqual({ kind: 'length', afterTakeDown: true });
});

it('never asks about length or porosity without her yes to using hair details', () => {
  const hair = { length: 'shoulder', lengthMeasuredAt: ago(200) } as const;
  expect(ask({ hair })?.kind).toBe('length');
  expect(ask({ hair, hairAllowed: false })).toBeNull();
  expect(ask({ hair: { length: 'shoulder', lengthMeasuredAt: ago(1) } })?.kind).toBe('porosity');
  expect(ask({ hair: {}, hairAllowed: false })).toBeNull();
});

it('respects not now and don’t ask me this', () => {
  expect(
    ask({
      bookings: [braids],
      memory: { firstSeenAt: ago(80), off: ['take_down'], snoozedUntil: { porosity: ago(-5) } },
      hair: { porosity: undefined },
    })?.kind
  ).toBe('trim');
});

it('asks about wash day only for people who log them, once it’s late', () => {
  const washes = [0, 7, 14].map(d => ({ id: `w${d}`, kind: 'wash', at: ago(10 + d) })) as never;
  expect(ask({ log: washes, hair: undefined })?.kind).toBe('wash');
  expect(
    ask({ log: [{ id: 'w', kind: 'wash', at: ago(10) }] as never, hair: undefined })
  ).toBeNull();
});
