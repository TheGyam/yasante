import { monthWeeks, passes, reachableMonths, readyBy, roomOn, shiftMonth } from '../picker';
import type { FreeSlots } from '../types';

const slots: FreeSlots = {
  minutes: 420,
  days: [
    { date: '2026-10-27', times: ['2026-10-27T09:00:00.000Z'] },
    { date: '2026-10-29', times: ['a', 'b', 'c', 'd'] },
  ],
  full: ['2026-10-30'],
  away: ['2026-10-23'],
};

describe('the picker calendar', () => {
  it('lays a month out Monday first, in whole weeks', () => {
    const weeks = monthWeeks('2026-10');
    expect(weeks).toHaveLength(5);
    // 1 October 2026 is a Thursday.
    expect(weeks[0]).toEqual([
      null,
      null,
      null,
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
    ]);
    expect(weeks[4].filter(Boolean).pop()).toBe('2026-10-31');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
  });

  it('says how much room each day has', () => {
    expect(roomOn('2026-10-27', slots)).toBe('few');
    expect(roomOn('2026-10-29', slots)).toBe('plenty');
    expect(roomOn('2026-10-30', slots)).toBe('full');
    expect(roomOn('2026-10-23', slots)).toBe('away');
    expect(roomOn('2026-10-28', slots)).toBe('none');
    // The server's word wins: four starts left of twelve is a few.
    const said = {
      ...slots,
      days: [{ date: '2026-10-29', times: ['a', 'b', 'c', 'd'], room: 'few' as const }],
    };
    expect(roomOn('2026-10-29', said)).toBe('few');
  });

  it('filters weekends and weekdays', () => {
    expect(passes('2026-10-31', 'weekends')).toBe(true); // Saturday
    expect(passes('2026-10-31', 'weekdays')).toBe(false);
    expect(passes('2026-10-29', 'weekdays')).toBe(true);
  });

  it('finds the closest free day before an occasion', () => {
    expect(readyBy('2026-10-31', slots)).toEqual({ day: '2026-10-29', time: 'a' });
    expect(readyBy('2026-10-28', slots)).toEqual({
      day: '2026-10-27',
      time: '2026-10-27T09:00:00.000Z',
    });
    expect(readyBy('2026-10-20', slots)).toBeUndefined();
  });

  it('reaches as far as she takes bookings', () => {
    expect(reachableMonths('2026-10-11', '2027-01-02')).toEqual([
      '2026-10',
      '2026-11',
      '2026-12',
      '2027-01',
    ]);
    expect(reachableMonths('2026-10-11', '2026-10-31')).toEqual(['2026-10']);
  });
});
